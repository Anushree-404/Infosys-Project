"""
Time-Series Prediction Router - Phase 3
Predicts irrigation need from a sequence of recent sensor readings.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import os, joblib, numpy as np
from scipy import stats as scipy_stats

router = APIRouter(prefix="/api/timeseries", tags=["Time-Series Prediction"])

BASE_DIR   = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MODELS_DIR = os.path.join(BASE_DIR, "models")

_ts_model    = None
_ts_features = None
_ts_config   = None

def _load():
    global _ts_model, _ts_features, _ts_config
    if _ts_model is None:
        _ts_model    = joblib.load(os.path.join(MODELS_DIR, "timeseries_model.pkl"))
        _ts_features = joblib.load(os.path.join(MODELS_DIR, "timeseries_features.pkl"))
        _ts_config   = joblib.load(os.path.join(MODELS_DIR, "timeseries_config.pkl"))


class SensorReading(BaseModel):
    soil_moisture: float = Field(..., ge=0, le=100, description="Soil moisture %")
    temperature:   float = Field(..., ge=-10, le=60, description="Temperature C")
    humidity:      float = Field(..., ge=0, le=100, description="Humidity %")
    rainfall:      float = Field(..., ge=0, le=200, description="Rainfall mm")
    timestamp:     Optional[str] = None


class TimeSeriesRequest(BaseModel):
    readings:   List[SensorReading] = Field(..., min_length=2,
        description="List of sensor readings (minimum 2, ideally 4+ for best accuracy)")
    soil_type:  int = Field(default=1, ge=0, le=5, description="Soil type index (0-5)")
    crop_type:  int = Field(default=0, ge=0, le=9, description="Crop type index (0-9)")

    class Config:
        json_schema_extra = {"example": {
            "readings": [
                {"soil_moisture": 45, "temperature": 30, "humidity": 65, "rainfall": 0},
                {"soil_moisture": 40, "temperature": 32, "humidity": 62, "rainfall": 0},
                {"soil_moisture": 35, "temperature": 34, "humidity": 58, "rainfall": 0},
                {"soil_moisture": 28, "temperature": 36, "humidity": 55, "rainfall": 0},
            ],
            "soil_type": 1,
            "crop_type": 0
        }}


class TimeSeriesResponse(BaseModel):
    irrigation_needed:  bool
    confidence:         float
    urgency:            str
    trend:              str
    moisture_trend:     str
    recommendation:     str
    readings_analysed:  int
    model_used:         str


def _build_features(readings: list, soil_type: int, crop_type: int, hour: int = 6, dow: int = 0):
    sm   = np.array([r.soil_moisture for r in readings])
    temp = np.array([r.temperature for r in readings])
    hum  = np.array([r.humidity for r in readings])
    rain = np.array([r.rainfall for r in readings])

    def stats(arr, name):
        slope = scipy_stats.linregress(range(len(arr)), arr)[0] if len(arr) > 1 else 0.0
        return {
            f"{name}_mean": arr.mean(), f"{name}_std": arr.std() if len(arr)>1 else 0,
            f"{name}_min": arr.min(),   f"{name}_max": arr.max(),
            f"{name}_last": arr[-1],    f"{name}_first": arr[0],
            f"{name}_trend": float(slope),
        }

    feat = {}
    for arr, name in [(sm, "soil_moisture"), (temp, "temperature"), (hum, "humidity"), (rain, "rainfall")]:
        feat.update(stats(arr, name))

    feat.update({
        "current_moisture": float(sm[-1]),
        "current_temperature": float(temp[-1]),
        "current_humidity": float(hum[-1]),
        "current_rainfall": float(rain[-1]),
        "soil_type": soil_type,
        "crop_type": crop_type,
        "hour_of_day": hour,
        "day_of_week": dow,
    })

    feat_order = _ts_features
    return np.array([[feat.get(f, 0.0) for f in feat_order]])


@router.post(
    "/predict",
    response_model=TimeSeriesResponse,
    summary="Predict irrigation need from a sequence of sensor readings",
    description="""
Submit a sequence of recent sensor readings (e.g. last 4 readings = last 24 hours)
and receive a prediction based on moisture trends, not just the current value.

This model understands **trends** — it detects if moisture is rapidly dropping
even if the current value is still acceptable.
    """,
)
async def predict_timeseries(req: TimeSeriesRequest):
    try:
        _load()

        feats = _build_features(req.readings, req.soil_type, req.crop_type)
        pred  = int(_ts_model.predict(feats)[0])
        prob  = float(_ts_model.predict_proba(feats)[0][1])

        sm_values = [r.soil_moisture for r in req.readings]
        trend_slope = (sm_values[-1] - sm_values[0]) / max(1, len(sm_values) - 1)

        if trend_slope < -3:
            moisture_trend = "Rapidly decreasing"
        elif trend_slope < -1:
            moisture_trend = "Slowly decreasing"
        elif trend_slope > 2:
            moisture_trend = "Increasing (recent irrigation or rain)"
        else:
            moisture_trend = "Stable"

        current_moisture = sm_values[-1]
        if pred == 1:
            if current_moisture < 20 or prob > 0.90:
                urgency = "URGENT"
            elif current_moisture < 30 or prob > 0.70:
                urgency = "SOON"
            else:
                urgency = "MONITOR"
        else:
            urgency = "OK"

        if pred == 1:
            rec = (
                f"Irrigation needed. Current moisture {current_moisture:.1f}% with "
                f"{moisture_trend.lower()} trend. "
                f"{'Irrigate immediately.' if urgency=='URGENT' else 'Plan irrigation within 6 hours.'}"
            )
        else:
            rec = (
                f"No irrigation needed now. Moisture at {current_moisture:.1f}% with "
                f"{moisture_trend.lower()} trend. Monitor and check again in 6 hours."
            )

        overall_trend = "Declining" if trend_slope < -1 else ("Rising" if trend_slope > 1 else "Stable")

        return TimeSeriesResponse(
            irrigation_needed=bool(pred),
            confidence=round(prob if pred else 1 - prob, 4),
            urgency=urgency,
            trend=overall_trend,
            moisture_trend=moisture_trend,
            recommendation=rec,
            readings_analysed=len(req.readings),
            model_used="GradientBoostingClassifier (sliding-window)",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", summary="Time-series model health check")
async def ts_health():
    try:
        _load()
        return {"status": "healthy", "model": "timeseries_model", "features": len(_ts_features)}
    except Exception as e:
        return {"status": "not_loaded", "error": str(e)}
