FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code (will be mounted in dev)
# We copy it here primarily for the build process
COPY backend/app /app/app
COPY backend/worker.py /app

# Set environment variable for execution
ENV PYTHONUNBUFFERED 1