import logging
import os
from datetime import datetime, timezone

from database import get_db
from fpdf import FPDF

logger = logging.getLogger("pdf_export")

_FONT_DIR = os.path.join(os.path.dirname(__file__), "..", "fonts")
_CJK_FONT_CANDIDATES = [
    "NotoSansSC-Regular.otf",
    "NotoSansSC-Regular.ttf",
    "NotoSansCJKsc-Regular.otf",
    "SourceHanSansSC-Regular.otf",
]
_CJK_FAMILY = "NotoSansSC"
_cjk_registered = False
_cjk_register_attempted = False


def _find_cjk_font_path() -> str | None:
    """Return absolute path to a usable CJK font file, or None."""
    for name in _CJK_FONT_CANDIDATES:
        path = os.path.normpath(os.path.join(_FONT_DIR, name))
        if os.path.exists(path) and os.path.getsize(path) > 100_000:
            return path
    return None


def _try_register_cjk_font(pdf: FPDF) -> bool:
    """Register the CJK font on the FPDF instance. Idempotent."""
    global _cjk_registered, _cjk_register_attempted
    if _cjk_registered:
        return True
    if _cjk_register_attempted:
        return False
    _cjk_register_attempted = True
    path = _find_cjk_font_path()
    if not path:
        logger.warning(
            "No CJK font found in %s. Run scripts/download_chinese_font.py "
            "or drop a .otf/.ttf into backend/fonts/. Falling back to Helvetica "
            "with Latin-1 replacement (Chinese will render as '?').",
            os.path.normpath(_FONT_DIR),
        )
        return False
    try:
        pdf.add_font(_CJK_FAMILY, fname=path, uni=True)
        _cjk_registered = True
        logger.info("Registered CJK font %s from %s", _CJK_FAMILY, path)
        return True
    except Exception as e:  # noqa: BLE001 - font backends expose varied exception types
        logger.error("Failed to register CJK font %s: %s", path, e)
        return False


def _safe(text: str, max_len: int = 200, use_cjk: bool = False) -> str:
    """Truncate and (if not using a CJK font) coerce to latin-1."""
    t = (text or "")[:max_len]
    if use_cjk:
        return t
    try:
        t.encode("latin-1")
        return t
    except UnicodeEncodeError:
        return t.encode("latin-1", errors="replace").decode("latin-1")


def _set_font(pdf: FPDF, style: str = "", size: int = 10, cjk: bool = False) -> None:
    """Switch font, preferring CJK when available."""
    if cjk and _cjk_registered:
        pdf.set_font(_CJK_FAMILY, style=style, size=size)
    else:
        pdf.set_font("helvetica", style=style, size=size)


def generate_student_report(student_name: str, class_name: str = "", teacher_name: str = "") -> bytes:
    pdf = FPDF("P", "mm", "A4")
    pdf.set_auto_page_break(True, 20)
    pdf.alias_nb_pages()
    cjk = _try_register_cjk_font(pdf)
    pdf.add_page()
    conn = get_db()

    def add_header():
        _set_font(pdf, "B", 10, cjk=cjk)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(90, 6, "AI Homework Grading - Student Report", align="L")
        pdf.cell(0, 6, datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d"), align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
        pdf.ln(4)

    def add_footer():
        pdf.set_y(-15)
        _set_font(pdf, "I", 8, cjk=cjk)
        pdf.set_text_color(150, 150, 150)
        pdf.cell(0, 10, f"Page {pdf.page_no()}/{{nb}}", align="C")

    pdf.header = add_header
    pdf.footer = add_footer

    _set_font(pdf, "B", 18, cjk=cjk)
    pdf.set_text_color(30, 41, 59)
    title = f"Student Report: {student_name}"
    pdf.cell(0, 12, _safe(title, use_cjk=cjk), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)
    _set_font(pdf, "", 10, cjk=cjk)
    pdf.set_text_color(71, 85, 105)
    info = (
        f"Class: {class_name or 'N/A'}  |  "
        f"Teacher: {teacher_name or 'N/A'}  |  "
        f"{datetime.now(timezone.utc).astimezone().strftime('%Y-%m-%d')}"
    )
    pdf.cell(0, 7, _safe(info, use_cjk=cjk), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    _set_font(pdf, "B", 14, cjk=cjk)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 10, _safe("1. Score Summary", use_cjk=cjk), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    query = """SELECT s.id as submission_id, s.assignment_id,
                         a_sub.title, a_sub.subject, s.status,
                  COALESCE(SUM(ans.score), 0) as total_score
           FROM submissions s
           JOIN assignments a_sub ON s.assignment_id = a_sub.id
           LEFT JOIN answers ans ON ans.submission_id = s.id
           WHERE s.student_name = ?"""
    params = [student_name]
    if class_name:
        query += " AND a_sub.class_name = ?"
        params.append(class_name)
    if teacher_name:
        query += " AND a_sub.teacher_name = ?"
        params.append(teacher_name)
    query += " GROUP BY s.id ORDER BY s.submitted_at DESC"
    subs = conn.execute(query, params).fetchall()

    col_w = [70, 40, 40, 40]
    _set_font(pdf, "B", 10, cjk=cjk)
    for i, h in enumerate(["Assignment", "Subject", "Status", "Score"]):
        pdf.cell(col_w[i], 8, _safe(h, use_cjk=cjk), border=1, align="C")
    pdf.ln()
    _set_font(pdf, "", 10, cjk=cjk)
    for sub in subs:
        vals = [
            _safe(sub["title"], 28, use_cjk=cjk),
            _safe(sub["subject"], 12, use_cjk=cjk),
            _safe(sub["status"], 12, use_cjk=cjk),
            str(sub["total_score"]),
        ]
        for i, v in enumerate(vals):
            pdf.cell(col_w[i], 7, v, border=1, align="C" if i > 1 else "L")
        pdf.ln()
    pdf.ln(6)

    for sub in subs:
        if pdf.get_y() > 240:
            pdf.add_page()
        _set_font(pdf, "B", 11, cjk=cjk)
        pdf.set_text_color(30, 41, 59)
        header = f"Assignment: {sub['title']}"
        pdf.cell(0, 8, _safe(header, use_cjk=cjk), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

        answers = conn.execute(
            """SELECT ans.student_answer, ans.is_correct, ans.score, ans.ai_feedback,
                      q.content, q.points
               FROM answers ans JOIN questions q ON ans.question_id = q.id
               WHERE ans.submission_id = ?
               ORDER BY q.sort_order""",
            [sub["submission_id"]],
        ).fetchall()

        for ans in answers:
            _set_font(pdf, "", 9, cjk=cjk)
            pdf.set_text_color(71, 85, 105)
            label = (
                f"[{'OK' if ans['is_correct'] else 'X'}] "
                f"{_safe(ans['content'], 80, use_cjk=cjk)} "
                f"(Score: {ans['score']}/{ans['points']})"
            )
            pdf.cell(0, 5, _safe(label, 180, use_cjk=cjk), new_x="LMARGIN", new_y="NEXT")
            ans_text = _safe(ans["student_answer"] or "(n/a)", 100, use_cjk=cjk)
            pdf.cell(0, 5, f"  Answer: {ans_text}", new_x="LMARGIN", new_y="NEXT")
            if ans["ai_feedback"]:
                fb = _safe(ans["ai_feedback"], 150, use_cjk=cjk)
                pdf.set_text_color(180, 83, 9)
                pdf.cell(0, 5, f"  Feedback: {fb}", new_x="LMARGIN", new_y="NEXT")
                pdf.set_text_color(71, 85, 105)
            pdf.ln(3)

    conn.close()
    return pdf.output()
