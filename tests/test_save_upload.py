"""Tests for backend/utils.py — file upload validation."""
import os
import pytest
from types import SimpleNamespace
from fastapi import HTTPException

from utils import save_upload, upload_path, MAX_UPLOAD_SIZE


def _fake_upload(content: bytes, content_type: str, filename: str = "test.png"):
    """Stand-in for starlette UploadFile — duck-types .content_type / .filename / .read()."""
    async def _read() -> bytes:
        return content
    return SimpleNamespace(content_type=content_type, filename=filename, read=_read)


@pytest.mark.asyncio
async def test_save_upload_writes_file(tmp_path):
    data = b"hello world"
    f = _fake_upload(data, "image/png", "hello.png")
    url = await save_upload(f, str(tmp_path))
    assert url.startswith("/uploads/")
    name = os.path.basename(url)
    written = (tmp_path / name).read_bytes()
    assert written == data


@pytest.mark.asyncio
async def test_save_upload_rejects_oversize(tmp_path):
    f = _fake_upload(b"x" * (MAX_UPLOAD_SIZE + 1), "image/png")
    with pytest.raises(HTTPException) as exc:
        await save_upload(f, str(tmp_path))
    assert exc.value.status_code == 413


@pytest.mark.asyncio
async def test_save_upload_rejects_bad_mime(tmp_path):
    f = _fake_upload(b"hi", "application/x-msdownload", "evil.exe")
    with pytest.raises(HTTPException) as exc:
        await save_upload(f, str(tmp_path))
    assert exc.value.status_code == 400


def test_upload_path_roundtrip(tmp_path):
    p = upload_path("/uploads/abc123.png", str(tmp_path))
    assert p == os.path.join(str(tmp_path), "abc123.png")
