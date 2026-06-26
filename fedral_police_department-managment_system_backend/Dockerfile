# syntax=docker/dockerfile:1.7
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    APP_ENV=production

# Install build deps for bcrypt
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps separately for better layer caching
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Ensure .env is present in the image (python-dotenv will load it)
# If you prefer not to bake secrets into the image, remove this and use --env-file at runtime instead.

# Expose the port
EXPOSE 8000

# Healthcheck (optional)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import socket,sys; s=socket.socket(); s.settimeout(2); s.connect(('127.0.0.1',8000)); s.close()" || exit 1

# Gunicorn config
ENV GUNICORN_WORKERS=3 \
    GUNICORN_BIND=0.0.0.0:8000 \
    GUNICORN_TIMEOUT=60

# Run with gunicorn using the WSGI module
# Use shell form so environment variables are expanded; provide sane defaults.
CMD sh -c "flask seed all && gunicorn -w ${GUNICORN_WORKERS:-3} -b ${GUNICORN_BIND:-0.0.0.0:8000} --timeout ${GUNICORN_TIMEOUT:-60} wsgi:app"
