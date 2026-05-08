import base64
import json
import re

from services.ai_client import chat_with_image
from prompts.ocr import OCR_SYSTEM_PROMPT


def ocr_image(image_path: str) -> dict[int, str]:
    """Run OCR on an image and return a mapping of question_number -> student_answer."""
    with open(image_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode("utf-8")

    messages = [
        {"role": "system", "content": OCR_SYSTEM_PROMPT},
        {"role": "user", "content": "请识别图片中的题目和学生答案。"},
    ]
    result = chat_with_image(messages, image_b64)

    # Parse JSON from response
    try:
        json_match = re.search(r"\{[\s\S]*\}", result)
        if json_match:
            data = json.loads(json_match.group())
            ocr_map = {}
            for q in data.get("questions", []):
                q_num = q.get("question_number", 0)
                answer = q.get("student_answer", "")
                ocr_map[q_num] = answer
            return ocr_map
    except (json.JSONDecodeError, KeyError):
        pass

    # Fallback: return raw result keyed as question 1
    return {1: result}
