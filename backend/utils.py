import asyncio
import json
import os
import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"}
_MIME_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/bmp": ".bmp",
}


def _detect_image_mime(contents: bytes) -> str | None:
    """Detect the supported image type from magic bytes, not the filename."""
    if contents.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if contents.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if contents.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if len(contents) >= 12 and contents[:4] == b"RIFF" and contents[8:12] == b"WEBP":
        return "image/webp"
    if contents.startswith(b"BM"):
        return "image/bmp"
    return None


def extract_json(response: str) -> dict | None:
    """Extract the first valid JSON object from an AI response.
    Handles: code fences, nested braces, braces inside strings,
    trailing commas, and text with set-notation braces before the JSON."""

    text = response.strip()
    # Strip BOM, markdown code fences
    text = re.sub(r'^﻿', '', text)
    text = re.sub(r'^```(?:json)?\s*\n?', '', text)
    text = re.sub(r'\n?```\s*$', '', text)

    # Try each '{' as a potential JSON start until one parses
    search_from = 0
    while True:
        start = text.find('{', search_from)
        if start == -1:
            return None

        depth = 0
        in_string = False
        escape = False
        end = -1
        for i in range(start, len(text)):
            ch = text[i]
            if escape:
                escape = False
                continue
            if ch == '\\' and in_string:
                escape = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    end = i
                    break

        if end == -1:
            return None

        candidate = text[start:end + 1]
        # Repair trailing commas before parsing
        candidate = re.sub(r',\s*}', '}', candidate)
        candidate = re.sub(r',\s*]', ']', candidate)

        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            # Try next '{' position
            search_from = start + 1
            continue


async def save_upload(file: UploadFile, upload_dir: str) -> str:
    """Save an uploaded file and return the URL path. Reads bytes only once."""
    declared_mime = file.content_type
    if declared_mime and declared_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, f"不支持的文件类型: {file.content_type}")
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(413, f"文件大小超过 {MAX_UPLOAD_SIZE // (1024*1024)}MB 限制")
    detected_mime = _detect_image_mime(contents)
    if detected_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, "文件内容不是受支持的图片格式")
    if declared_mime and declared_mime != detected_mime:
        raise HTTPException(400, "文件类型与文件内容不一致")
    ext = _MIME_EXTENSIONS[detected_mime]
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)
    await asyncio.to_thread(Path(filepath).write_bytes, contents)
    return f"/uploads/{filename}"


def upload_path(url_path: str, upload_dir: str) -> str:
    """Resolve an /uploads/ URL path back to a filesystem path."""
    return os.path.join(upload_dir, os.path.basename(url_path))
