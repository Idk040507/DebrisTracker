# Space Debris Tracker

3D orbital dashboard for tracking satellites and debris, scoring close-approach risk with XGBoost + SHAP, and generating operator briefings with Gemini.

## Prerequisites

- Python 3.11+
- Node.js 20+
- A [Google Gemini](https://ai.google.dev/) API key
- A [Space-Track.org](https://www.space-track.org/) account (used when CelesTrak is blocked or CDM close-approach data is needed)

## Backend setup

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
copy ..\.env.example .env   # Windows: copy; Unix: cp ../.env.example .env
```

Copy `.env.example` to `.env` in the project root and set:

- `GEMINI_API_KEY` for operator briefings
- `SPACETRACK_IDENTITY` / `SPACETRACK_PASSWORD` so the API can fall back to Space-Track GP catalogs and public CDMs when CelesTrak returns 403/empty, or when a selected object has a real conjunction message

Place a trained XGBoost booster at `backend/app/ml/saved_models/risk_model.json` (the repo ships a placeholder). Then start the API:

```bash
uvicorn app.main:app --reload --app-dir .
```

API docs: http://localhost:8000/docs

### Docker

```bash
cd backend
docker build -t space-debris-tracker-api .
docker run --env-file ../.env -p 8000:8000 space-debris-tracker-api
```

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The UI expects the backend at `VITE_API_BASE_URL` (default `http://localhost:8000`).

## Project layout

- `backend/` — FastAPI, CelesTrak + Space-Track GP/CDM, XGBoost/SHAP, Gemini briefings
- `frontend/` — React + Vite + Three.js globe, debris field, and operator HUD
