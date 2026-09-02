from config import UPLOAD_DIR
from database import init_db
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import assignments, dashboard, error_book, grading, pdf_export, submissions

app = FastAPI(title="AI 作业批改系统", version="0.2.4")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploaded images
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Routers
app.include_router(assignments.router)
app.include_router(submissions.router)
app.include_router(grading.router)
app.include_router(dashboard.router)
app.include_router(error_book.router)
app.include_router(pdf_export.router)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}
