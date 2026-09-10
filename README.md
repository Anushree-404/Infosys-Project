# 🌱 IrriSmart — AI Irrigation Management System

A full-stack AI-powered irrigation management system with real-time sensor monitoring, weather integration, and ML-based irrigation predictions.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS, Recharts |
| Backend | Node.js, Express.js, TypeScript, Prisma ORM |
| Database | PostgreSQL |
| ML Service | Python, FastAPI, scikit-learn, Gradient Boosting |
| Auth | JWT (Access + Refresh Tokens) + bcrypt |
| State | React Query + Context API |
| Charts | Recharts (live sensor charts) |
| Docs | Swagger / OpenAPI 3.0 |

---

## 📁 Project Structure

```
Infosys-project/
├── backend/           — Express.js REST API
├── frontend/          — Next.js dashboard
├── ml/
│   ├── dataset/       — Dataset generators
│   ├── preprocessing/ — Data cleaning pipeline
│   ├── training/      — Model training scripts
│   ├── evaluation/    — Model evaluation
│   ├── models/        — Saved ML models (.pkl)
│   ├── processed_data/— Cleaned datasets (CSV)
│   ├── visualizations/— Charts and plots (PNG)
│   ├── reports/       — Preprocessing reports
│   └── fastapi_service/ — FastAPI ML prediction API
└── start.ps1          — One-click startup script
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL 18

### 1. Start everything at once (Windows)
```powershell
.\start.ps1
```

### 2. Or start manually (3 terminals)

**Terminal 1 — Backend:**
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

**Terminal 3 — ML Service:**
```bash
cd ml/fastapi_service
pip install -r requirements.txt
python -m uvicorn main:app --port 8000 --reload
# Runs on http://localhost:8000
```

### 3. Database setup (first time only)
```bash
cd backend
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts    # optional: create admin user
```

### 4. Train ML models (first time only)
```bash
cd ml
python preprocessing/preprocessing_pipeline.py   # clean data
python training/train_models.py                  # train models
python evaluation/evaluate_model.py              # evaluate
```

---

## 🔑 Default Login

| Role | Email | Password |
|---|---|---|
| Admin | admin@irrigation.com | Admin@123456 |

> Register your own account at http://localhost:3000/register

---

## 📚 API Documentation

| Service | URL |
|---|---|
| Backend Swagger | http://localhost:5000/api/docs |
| ML Service Swagger | http://localhost:8000/docs |

---

## 🌐 Pages

| Route | Description |
|---|---|
| / | Landing page |
| /register | Farmer registration |
| /login | Login |
| /dashboard | Main dashboard with live stats |
| /dashboard/fields | Field management (CRUD) |
| /dashboard/fields/[id] | Field detail with live sensor data |
| /dashboard/crops | Crop lifecycle tracking |
| /dashboard/sensors | Sensor registry |
| /dashboard/sensors/[id] | Sensor history + live chart |
| /dashboard/weather | Weather dashboard (OpenWeatherMap) |
| /dashboard/analytics | Farm analytics |
| /dashboard/irrigation | AI irrigation recommendations |
| /dashboard/profile | User profile |
| /dashboard/settings | Settings + API config |

---

## 🤖 ML Models

### Real Kaggle Data Models ✅

| Model | Dataset | Records | Accuracy | F1 |
|---|---|---|---|---|
| **Gradient Boosting** ⭐ | irrigation_prediction.csv | 10,000 | **99.95%** | **0.9994** |
| **Random Forest** | Crop_recommendation.csv | 2,200 | **99.55%** | **0.9955** |

### Synthetic Baseline Models

| Model | Purpose | Accuracy |
|---|---|---|
| Gradient Boosting (synthetic) | Single-reading prediction | 97.8% |
| Sliding-Window GB | Time-series trend | 96.9% |
| GB Regressor | Crop water req (mm/day) | R2=0.93 |
| GB Classifier | Water stress level | 96.5% |

### Train / Retrain
```bash
cd ml
python preprocessing/kaggle_preprocessing.py  # preprocess Kaggle data
python training/kaggle_train.py               # train on real Kaggle data
python training/train_models.py               # train synthetic baseline
```

---

## 🔑 Environment Variables

**backend/.env**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/irrigation_db"
JWT_SECRET=your_jwt_secret
OPENWEATHER_API_KEY=your_api_key    # get free at openweathermap.org
ML_SERVICE_URL=http://localhost:8000
```

---

## 📊 Key Features

### Phase 1 — Authentication ✅
- JWT login/register with refresh tokens
- Role-based access (FARMER / ADMIN)
- Profile management + photo upload

### Phase 2 — Farm Management ✅
- Field CRUD with GPS, soil type, irrigation method
- Crop lifecycle tracking (growth stages)
- IoT sensor registry (8 sensor types)
- Real-time sensor data ingestion + validation
- Live sensor charts (Recharts)
- OpenWeatherMap weather integration
- Notifications (low moisture, offline sensors)
- Background jobs (cron: weather refresh, sensor health)
- MQTT-ready architecture (stub mode)

### Phase 3 — AI Irrigation ✅
- **5 ML models** trained (Gradient Boosting best: 98% accuracy)
- **Time-series model** (96.9% accuracy) — analyses moisture trends over 24–48h
- **Crop water requirement model** (R2=0.93) — calculates mm/day per crop/stage
- **Water stress classifier** (96.5% accuracy) — LOW / MEDIUM / HIGH / CRITICAL
- **FastAPI ML service** on port 8000 with full Swagger docs
- **4 AI endpoints:**
  - `POST /api/predict/irrigation` — single-reading prediction
  - `POST /api/timeseries/predict` — trend-based prediction
  - `POST /api/recommend/crop-water` — crop water needs
  - `POST /api/recommend/irrigation-schedule` — 7-day plan
- **Irrigation AI page** with 4 tabs: Prediction / Trend / Crop Water / Schedule
- **Retraining script** — retrain with real sensor data from PostgreSQL

### Phase 4 — Planned 🔜
- MQTT live sensor streaming
- LSTM time-series predictions
- Mobile app (React Native)
- Push notifications
- Multi-language UI (Hindi, Telugu, Kannada)
