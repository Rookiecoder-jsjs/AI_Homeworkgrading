import base64
import json
import os
import re
import uuid
from typing import Optional

from fastapi import UploadFile, HTTPException

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"}


def extract_json(response: str) -> Optional[dict]:
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
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, f"不支持的文件类型: {file.content_type}")
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(413, f"文件大小超过 {MAX_UPLOAD_SIZE // (1024*1024)}MB 限制")
    ext = os.path.splitext(file.filename or ".png")[1] or ".png"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)
    with open(filepath, "wb") as f:
        f.write(contents)
    return f"/uploads/{filename}"


def upload_path(url_path: str, upload_dir: str) -> str:
    """Resolve an /uploads/ URL path back to a filesystem path."""
    return os.path.join(upload_dir, os.path.basename(url_path))
