import json
import re

from services.ai_client import chat
from prompts.feedback import FEEDBACK_SYSTEM_PROMPT, build_feedback_prompt


def generate_socratic_feedback(
    question_content: str,
    student_answer: str,
    reference_answer: str,
    is_correct: bool,
) -> str:
    """Generate a Socratic guiding feedback for the student."""
    user_prompt = build_feedback_prompt(question_content, student_answer, reference_answer, is_correct)

    messages = [
        {"role": "system", "content": FEEDBACK_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    result = chat(messages, temperature=0.5)
    return result.strip()
