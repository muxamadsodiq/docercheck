FROM python:3.11-slim

# Environment
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system deps needed for some Python packages and runtime (kept minimal)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       gcc \
       libjpeg-dev \
       libfreetype6-dev \
       libffi-dev \
       libssl-dev \
       curl \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd -r safar24 && useradd -r -g safar24 safar24

WORKDIR /app

# Install Python dependencies early (cache layer)
COPY requirements.txt /app/requirements.txt
RUN python -m pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r /app/requirements.txt

# Copy application
COPY . /app

# Ensure permissions
RUN chown -R safar24:safar24 /app

USER safar24

EXPOSE 5000

# Use gunicorn (deploy/gunicorn.conf.py is included in repo)
CMD ["gunicorn", "-c", "deploy/gunicorn.conf.py", "wsgi:app"]
