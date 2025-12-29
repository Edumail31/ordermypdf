FROM python:3.11-slim

# Install system dependencies (including Ghostscript for PDF compression)
RUN apt-get update && apt-get install -y \
    ghostscript \
    git \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js with npm cache clean
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    npm cache clean --force && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy frontend files
COPY frontend ./frontend
WORKDIR /app/frontend

# Clean npm cache and install with verbose logging
RUN npm cache clean --force && \
    npm install --legacy-peer-deps --verbose && \
    chmod +x node_modules/.bin/* && \
    npm run build

# Copy backend files
WORKDIR /app
COPY app ./app

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Expose port
EXPOSE 8000

# Start the FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
