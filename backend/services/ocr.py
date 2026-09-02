import asyncio
import base64
import mimetypes
from pathlib import Path

from prompts.ocr import OCR_SYSTEM_PROMPT
from services.ai_client import chat_with_image
from utils import extract_json


async def ocr_image(image_path: str) -> dict[int, str]:
    """Run OCR on an image and return a mapping of question_number -> student_answer."""
    image_bytes = await asyncio.to_thread(Path(image_path).read_bytes)
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    messages = [
        {"role": "system", "content": OCR_SYSTEM_PROMPT},
        {"role": "user", "content": "请识别图片中的题目和学生答案。"},
    ]
    mime_type = mimetypes.guess_type(image_path)[0] or "image/png"
    result = await chat_with_image(messages, image_b64, image_mime_type=mime_type)

    data = extract_json(result)
    if data:
        ocr_map = {}
        for q in data.get("questions", []):
            q_num = q.get("question_number", 0)
            answer = q.get("student_answer", "")
            ocr_map[q_num] = answer
        return ocr_map

    # Fallback: return raw result keyed as question 1
    return {1: result}
