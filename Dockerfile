# Single-image build (TR-A6): FastAPI serves both the API/WebSocket and the
# built React bundle from one origin. Build & run:
#   docker build -t digital-twin .
#   docker run -p 8000:8000 digital-twin
# Then open http://localhost:8000 — prototype/simulation only, no real equipment.

FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim AS backend
WORKDIR /app/backend

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY backend/config.yaml ./config.yaml
COPY backend/models ./models
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

ENV PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
