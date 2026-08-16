"""
IrriSmart ML Service - Phase 3
================================
Endpoints:
  POST /api/predict/irrigation         — Single prediction (main model)
  POST /api/predict/irrigation/batch   — Batch predictions
  GET  /api/predict/model/info         — Model metadata
  POST /api/timeseries/predict         — Time-series trend prediction
  GET  /api/timeseries/health          — TS model health
  POST /api/recommend/crop-water       — Crop water requirement
  POST /api/recommend/irrigation-schedule — 7-day irrigation schedule
  GET  /docs                           — Swagger UI
"""

import sys, os, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routers import predict
from app.routers import timeseries
from app.routers import recommend
from app.routers import kaggle_predict
from app.predictor import get_predictor

app = FastAPI(
    title="IrriSmart ML Service",
    description="""
## AI-Based Irrigation Management — ML Service (Phase 3)

### Models Available
| Model | Purpose | Accuracy | Data Source |
|---|---|---|---|
| GradientBoostingClassifier (Kaggle) | Irrigation prediction | **99.9% F1** | irrigation_prediction.csv (10,000 real records) |
| RandomForestClassifier (Kaggle) | Crop recommendation (22 crops) | **99.5% F1** | Crop_recommendation.csv (2,200 real records) |
| GradientBoostingClassifier (Synthetic) | Single-reading prediction | 97.8% | Synthetic baseline |
| Sliding-Window GB | Time-series trend | 96.9% | Synthetic baseline |
| GB Regressor | Crop water (mm/day) | R2=0.93 | Synthetic baseline |

### Quick Start
1. `POST /api/predict/irrigation` — submit sensor reading, get irrigation decision
2. `POST /api/timeseries/predict` — submit last 4+ readings, get trend-based decision
3. `POST /api/recommend/crop-water` — get water requirement for your crop
4. `POST /api/recommend/irrigation-schedule` — get 7-day watering plan
    """,
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router)
app.include_router(timeseries.router)
app.include_router(recommend.router)
app.include_router(kaggle_predict.router)


@app.on_event("startup")
async def startup_event():
    print("\n" + "=" * 55)
    print("  IrriSmart ML Service v3.0 Starting...")
    try:
        predictor = get_predictor()
        print(f"  [OK] Main model  : {type(predictor.model).__name__}")
        print(f"  [OK] Features    : {len(predictor.feature_cols)}")
    except Exception as e:
        print(f"  [!!] Main model  : {e}")
    print("  [--] TS model    : loaded on first request")
    print("  [--] Crop models : loaded on first request")
    print("=" * 55 + "\n")


@app.get("/", include_in_schema=False)
async def root():
    return {
        "service": "IrriSmart ML Service",
        "version": "3.0.0",
        "status": "running",
        "endpoints": {
            "docs":              "/docs",
            "irrigation":        "/api/predict/irrigation",
            "timeseries":        "/api/timeseries/predict",
            "crop_water":        "/api/recommend/crop-water",
            "irrigation_sched":  "/api/recommend/irrigation-schedule",
            "health":            "/api/predict/health",
        },
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": str(exc)},
    )
