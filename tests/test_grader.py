"""Tests for backend/services/grader.py — objective grading rules and reference-answer guard."""
import pytest

from services.grader import _grade_choice, _grade_true_false, grade_submission


def test_grade_choice_correct_letter():
    res = _grade_choice("B", "B", max_points=5)
    assert res["is_correct"] is True
    assert res["score"] == 5
    assert res["confidence"] >= 0.95


def test_grade_choice_wrong_letter():
    res = _grade_choice("A", "C", max_points=5)
    assert res["is_correct"] is False
    assert res["score"] == 0


def test_grade_true_false_chinese_yes():
    res = _grade_true_false("对", "正确", max_points=2)
    assert res["is_correct"] is True


def test_grade_true_false_english_yes():
    res = _grade_true_false("True", "true", max_points=2)
    assert res["is_correct"] is True


def test_grade_true_false_mismatch():
    res = _grade_true_false("对", "错", max_points=2)
    assert res["is_correct"] is False


@pytest.mark.asyncio
async def test_grade_submission_blocks_missing_reference():
    res = await grade_submission(
        question_type="short_answer",
        question_content="What is 1+1?",
        reference_answer="",  # empty — guard should fire
        rubric="",
        student_answer="2",
        max_points=5,
    )
    assert res["is_correct"] is False
    assert res["score"] == 0
    assert "参考答案" in res["feedback"]


@pytest.mark.asyncio
async def test_grade_submission_fill_blank_exact_match():
    res = await grade_submission(
        question_type="fill_blank",
        question_content="Capital of France?",
        reference_answer="Paris",
        rubric="",
        student_answer="paris",  # case-insensitive
        max_points=3,
    )
    assert res["is_correct"] is True
    assert res["score"] == 3
    assert res["confidence"] == 0.98
