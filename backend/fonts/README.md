# Fonts

This directory holds TrueType / OpenType fonts for the PDF exporter.

## Why

`fpdf2`'s built-in `Helvetica` is a Latin-1 font, so Chinese text in the
generated student report shows up as `?` characters. The PDF service
auto-registers `NotoSansSC-Regular.otf` (or `.ttf`) from this directory when
present; without it, the service falls back to Latin-1 + replacement chars
and logs a warning.

## How to install

Run from the project root:

```bash
python scripts/download_chinese_font.py
```

Or download manually from the Noto CJK release on GitHub:

- OTF: <https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/SimplifiedChinese/NotoSansSC-Regular.otf>

Save the file to `backend/fonts/NotoSansSC-Regular.otf`.

The font file itself is **not** tracked in git (see `.gitignore` at project root).
