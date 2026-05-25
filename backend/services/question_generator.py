import json

from database import get_db
from prompts.question_gen import VARIANT_GEN_PROMPT, build_variant_prompt
from services.ai_client import chat
from utils import extract_json


async def generate_similar_question(
    question_content: str,
    question_type: str,
    reference_answer: str,
    wrong_answer: str,
) -> dict:
    """LLM generates a variant question with same knowledge points but different details."""
    user_prompt = build_variant_prompt(question_content, question_type, reference_answer, wrong_answer)
    messages = [
        {"role": "system", "content": VARIANT_GEN_PROMPT},
        {"role": "user", "content": user_prompt},
    ]
    result = await chat(messages, temperature=0.7)
    data = extract_json(result)
    if data:
        return {
            "question_content": data.get("question_content", ""),
            "reference_answer": data.get("reference_answer", ""),
            "hint": data.get("hint", ""),
            "knowledge_points": data.get("knowledge_points", []),
        }
    return {
        "question_content": result[:500],
        "reference_answer": "",
        "hint": "",
        "knowledge_points": [],
    }
