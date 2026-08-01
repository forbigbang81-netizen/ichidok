# Use Microsoft's official Playwright image — Chromium is pre-installed
# This avoids the OOM error from `playwright install chromium --with-deps`
# on Render's free 512MB tier.
FROM mcr.microsoft.com/playwright/python:v1.49.1-noble

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (Chromium is already in the base image)
COPY server.py slugs.json slugs_sub.json ./

# Expose port
ENV PORT=8000
EXPOSE 8000

# Run
CMD ["python", "server.py"]
