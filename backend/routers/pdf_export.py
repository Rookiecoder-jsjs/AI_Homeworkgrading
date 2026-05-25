from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
import io

from services.pdf_export import generate_student_report

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/student/{student_name}")
def download_student_report(
    student_name: str,
    class_name: str = "",
    teacher_name: str = "",
):
    pdf_bytes = generate_student_report(student_name, class_name, teacher_name)
    filename = f"Student_Report_{student_name}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"},
    )
