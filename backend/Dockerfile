FROM python:3.11-slim

WORKDIR /app

# System deps for healthcheck (curl). fpdf2 / sqlite are stdlib.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Python deps first for layer caching.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# App code.
COPY . .

# Persist data + uploads + fonts via volumes in docker-compose.yml.
RUN mkdir -p data uploads fonts

EXPOSE 8000

# Health check hits the FastAPI /api/health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -fsS http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
