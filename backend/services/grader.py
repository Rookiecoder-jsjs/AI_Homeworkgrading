import json
import re

from services.ai_client import chat
from prompts.grading import GRADING_SYSTEM_PROMPT, build_grading_prompt


def grade_submission(
    question_type: str,
    question_content: str,
    reference_answer: str,
    rubric: str,
    student_answer: str,
    max_points: int,
) -> dict:
    """Grade a single answer and return structured result."""

    # Objective questions: rule-based first, AI as fallback
    if question_type == "choice":
        return _grade_choice(student_answer, reference_answer, max_points)
    if question_type == "true_false":
        return _grade_true_false(student_answer, reference_answer, max_points)

    # Fill blank: pre-check exact/close match before calling AI
    if question_type == "fill_blank":
        sa = student_answer.strip().lower()
        ra = reference_answer.strip().lower()
        if sa == ra:
            return {
                "is_correct": True,
                "confidence": 0.98,
                "score": max_points,
                "feedback": "回答正确！",
                "key_points": [],
            }

    # Subjective questions: AI-powered
    user_prompt = build_grading_prompt(
        question_type, question_content, reference_answer, rubric, student_answer, max_points
    )
    messages = [
        {"role": "system", "content": GRADING_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]
    result = chat(messages, temperature=0.3)

    try:
        json_match = re.search(r"\{[\s\S]*\}", result)
        if json_match:
            data = json.loads(json_match.group())
            return {
                "is_correct": data.get("is_correct", False),
                "confidence": data.get("confidence", 0.5),
                "score": min(data.get("score", 0), max_points),
                "feedback": data.get("feedback", ""),
                "key_points": data.get("key_points", []),
            }
    except (json.JSONDecodeError, KeyError):
        pass

    return {
        "is_correct": False,
        "confidence": 0.3,
        "score": 0,
        "feedback": result[:500],
        "key_points": [],
    }


def _grade_choice(student_answer: str, reference_answer: str, max_points: int) -> dict:
    """Rule-based grading for multiple choice."""
    # Normalize: extract letter/number
    sa = student_answer.strip().upper()
    ra = reference_answer.strip().upper()
    is_correct = sa == ra
    return {
        "is_correct": is_correct,
        "confidence": 0.99 if is_correct else 0.95,
        "score": max_points if is_correct else 0,
        "feedback": "回答正确！" if is_correct else "这道题再想想，你确定是这个选项吗？",
        "key_points": [],
    }


def _grade_true_false(student_answer: str, reference_answer: str, max_points: int) -> dict:
    """Rule-based grading for true/false."""
    sa = student_answer.strip()
    ra = reference_answer.strip()
    # Normalize common T/F expressions
    true_vals = {"对", "正确", "√", "✓", "true", "t", "yes", "是", "y"}
    false_vals = {"错", "错误", "×", "✗", "false", "f", "no", "否", "n"}
    sa_norm = "true" if sa.lower() in true_vals else ("false" if sa.lower() in false_vals else sa.lower())
    ra_norm = "true" if ra.lower() in true_vals else ("false" if ra.lower() in false_vals else ra.lower())
    is_correct = sa_norm == ra_norm
    return {
        "is_correct": is_correct,
        "confidence": 0.99,
        "score": max_points if is_correct else 0,
        "feedback": "回答正确！" if is_correct else "再思考一下这个判断是对还是错？",
        "key_points": [],
    }
