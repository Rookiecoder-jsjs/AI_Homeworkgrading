import io
from datetime import datetime

from fpdf import FPDF

from database import get_db


def _safe(text: str, max_len: int = 200) -> str:
    """Make text latin-1 safe for built-in PDF fonts."""
    t = text[:max_len] if text else ""
    try:
        t.encode("latin-1")
        return t
    except UnicodeEncodeError:
        return t.encode("latin-1", errors="replace").decode("latin-1")


def generate_student_report(student_name: str, class_name: str = "", teacher_name: str = "") -> bytes:
    pdf = FPDF("P", "mm", "A4")
    pdf.set_auto_page_break(True, 20)
    pdf.alias_nb_pages()
    pdf.add_page()
    conn = get_db()

    def add_header():
        pdf.set_font("helvetica", "B", 10)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(90, 6, "AI Homework Grading - Student Report", align="L")
        pdf.cell(0, 6, datetime.now().strftime("%Y-%m-%d"), align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
        pdf.ln(4)

    def add_footer():
        pdf.set_y(-15)
        pdf.set_font("helvetica", "I", 8)
        pdf.set_text_color(150, 150, 150)
        pdf.cell(0, 10, f"Page {pdf.page_no()}/{{nb}}", align="C")

    pdf.header = add_header
    pdf.footer = add_footer

    # Title
    pdf.set_font("helvetica", "B", 18)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 12, _safe(f"Student Report: {student_name}"), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(71, 85, 105)
    info = f"Class: {class_name or 'N/A'}  |  Teacher: {teacher_name or 'N/A'}  |  {datetime.now().strftime('%Y-%m-%d')}"
    pdf.cell(0, 7, _safe(info), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    # Score Summary
    pdf.set_font("helvetica", "B", 14)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 10, "1. Score Summary", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    subs = conn.execute(
        """SELECT a_sub.title, a_sub.subject, s.status,
                  COALESCE(SUM(ans.score), 0) as total_score
           FROM submissions s
           JOIN assignments a_sub ON s.assignment_id = a_sub.id
           LEFT JOIN answers ans ON ans.submission_id = s.id
           WHERE s.student_name = ?
           GROUP BY s.id ORDER BY s.submitted_at DESC""",
        [student_name],
    ).fetchall()

    col_w = [70, 40, 40, 40]
    pdf.set_font("helvetica", "B", 10)
    for i, h in enumerate(["Assignment", "Subject", "Status", "Score"]):
        pdf.cell(col_w[i], 8, h, border=1, align="C")
    pdf.ln()
    pdf.set_font("helvetica", "", 10)
    for sub in subs:
        vals = [_safe(sub["title"], 28), _safe(sub["subject"], 12), _safe(sub["status"], 12), str(sub["total_score"])]
        for i, v in enumerate(vals):
            pdf.cell(col_w[i], 7, v, border=1, align="C" if i > 1 else "L")
        pdf.ln()
    pdf.ln(6)

    # Per-assignment answers (simple format)
    for sub in subs:
        if pdf.get_y() > 240:
            pdf.add_page()
        pdf.set_font("helvetica", "B", 11)
        pdf.set_text_color(30, 41, 59)
        pdf.cell(0, 8, _safe(f"Assignment: {sub['title']}"), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

        answers = conn.execute(
            """SELECT ans.student_answer, ans.is_correct, ans.score, ans.ai_feedback,
                      q.content, q.points
               FROM answers ans JOIN questions q ON ans.question_id = q.id
               JOIN submissions s2 ON ans.submission_id = s2.id
               WHERE s2.student_name = ? AND s2.assignment_id = (SELECT a2.id FROM assignments a2 WHERE a2.title = ? LIMIT 1)
               ORDER BY q.sort_order""",
            [student_name, sub["title"]],
        ).fetchall()

        for ans in answers:
            pdf.set_font("helvetica", "", 9)
            pdf.set_text_color(71, 85, 105)
            label = f"[{'OK' if ans['is_correct'] else 'X'}] {_safe(ans['content'], 80)} (Score: {ans['score']}/{ans['points']})"
            pdf.cell(0, 5, _safe(label, 180), new_x="LMARGIN", new_y="NEXT")
            ans_text = _safe(ans["student_answer"] or "(n/a)", 100)
            pdf.cell(0, 5, f"  Answer: {ans_text}", new_x="LMARGIN", new_y="NEXT")
            if ans["ai_feedback"]:
                fb = _safe(ans["ai_feedback"], 150)
                pdf.set_text_color(180, 83, 9)
                pdf.cell(0, 5, f"  Feedback: {fb}", new_x="LMARGIN", new_y="NEXT")
                pdf.set_text_color(71, 85, 105)
            pdf.ln(3)

    conn.close()
    return pdf.output()
