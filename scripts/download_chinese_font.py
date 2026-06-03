"""Download Noto Sans SC (Simplified Chinese) for PDF rendering.

Run once: `python scripts/download_chinese_font.py`
Saves to: backend/fonts/NotoSansSC-Regular.otf (~10 MB)

Source: Noto CJK on GitHub (open source, SIL Open Font License).
"""
from __future__ import annotations

import os
import sys
import urllib.request

FONT_URL = (
    "https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/"
    "SimplifiedChinese/NotoSansSC-Regular.otf"
)
DEST = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "backend", "fonts", "NotoSansSC-Regular.otf",
)


def main() -> int:
    dest = os.path.normpath(DEST)
    if os.path.exists(dest) and os.path.getsize(dest) > 1_000_000:
        print(f"Font already present at {dest} ({os.path.getsize(dest)} bytes)")
        return 0

    os.makedirs(os.path.dirname(dest), exist_ok=True)
    print(f"Downloading {FONT_URL} -> {dest}")
    try:
        urllib.request.urlretrieve(FONT_URL, dest)
    except Exception as e:
        print(f"Download failed: {e}", file=sys.stderr)
        print(
            "You can manually download Noto Sans SC OTF and place it at:\n  "
            + dest,
            file=sys.stderr,
        )
        return 1

    size = os.path.getsize(dest)
    print(f"Done: {size} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
