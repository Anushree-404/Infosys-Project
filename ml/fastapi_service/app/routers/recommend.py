"""
Crop & Irrigation Recommendation Router - Phase 3
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
import os, joblib, numpy as np

router = APIRouter(prefix="/api/recommend", tags=["Recommendations"])

BASE_DIR   = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# ── Load models (lazy) ─────────────────────────────────────────
_water_model  = None
_stress_model = None
_encoders     = None

def _load():
    global _water_model, _stress_model, _encoders
    if _water_model is None:
        _water_model  = joblib.load(os.path.join(MODELS_DIR, "water_req_model.pkl"))
        _stress_model = joblib.load(os.path.join(MODELS_DIR, "stress_level_model.pkl"))
        _encoders     = joblib.load(os.path.join(MODELS_DIR, "crop_encoders.pkl"))


class CropRecommendRequest(BaseModel):
    crop_type:          str = Field(..., example="Rice")
    growth_stage:       str = Field(..., example="Vegetative")
    soil_type:          str = Field(..., example="Loamy")
    season:             str = Field(..., example="Kharif")
    temperature:        float = Field(..., ge=-10, le=60, example=32.0)
    humidity:           float = Field(..., ge=0, le=100, example=65.0)
    rainfall:           float = Field(..., ge=0, le=200, example=1.5)
    soil_moisture:      float = Field(..., ge=0, le=100, example=28.0)
    evapotranspiration: float = Field(..., ge=0, le=20, example=6.5)

    class Config:
        json_schema_extra = {"example": {
            "crop_type": "Rice", "growth_stage": "Vegetative",
            "soil_type": "Loamy", "season": "Kharif",
            "temperature": 32, "humidity": 65, "rainfall": 1.5,
            "soil_moisture": 28, "evapotranspiration": 6.5
        }}


class CropRecommendResponse(BaseModel):
    crop_type:           str
    growth_stage:        str
    water_req_mm_day:    float
    stress_level:        str
    stress_description:  str
    irrigation_times:    List[str]
    daily_schedule:      str
    tips:                List[str]


STRESS_DESCRIPTIONS = {
    "LOW":      "Crop is well-hydrated. Normal irrigation schedule is sufficient.",
    "MEDIUM":   "Mild water stress detected. Increase irrigation frequency slightly.",
    "HIGH":     "Significant water stress. Irrigate soon to prevent yield loss.",
    "CRITICAL": "Severe water stress! Irrigate immediately — crop survival at risk.",
}

IRRIGATION_TIMES = {
    "LOW":      ["6:00 AM"],
    "MEDIUM":   ["6:00 AM", "5:00 PM"],
    "HIGH":     ["5:30 AM", "12:00 PM", "5:00 PM"],
    "CRITICAL": ["5:00 AM", "10:00 AM", "3:00 PM", "7:00 PM"],
}


@router.post(
    "/crop-water",
    response_model=CropRecommendResponse,
    summary="Get crop-specific water requirement and irrigation schedule",
)
async def crop_water_recommendation(req: CropRecommendRequest):
    try:
        _load()
        enc = _encoders

        def safe_encode(le, val, fallback=0):
            try:
                return int(le.transform([val.strip().title()])[0])
            except Exception:
                return fallback

        feat = np.array([[
            safe_encode(enc["le_crop"],   req.crop_type),
            safe_encode(enc["le_stage"],  req.growth_stage),
            safe_encode(enc["le_soil"],   req.soil_type),
            safe_encode(enc["le_season"], req.season),
            req.temperature, req.humidity, req.rainfall,
            req.soil_moisture, req.evapotranspiration,
        ]])

        water_req    = float(_water_model.predict(feat)[0])
        stress_idx   = int(_stress_model.predict(feat)[0])
        stress_label = enc["le_stress"].inverse_transform([stress_idx])[0]

        # Generate tips
        tips = []
        if req.soil_moisture < 25:
            tips.append(f"Soil moisture is critically low ({req.soil_moisture:.1f}%). Irrigate immediately.")
        if req.temperature > 38:
            tips.append(f"High temperature ({req.temperature:.1f}C) increases water demand. Add mulch to retain moisture.")
        if req.rainfall > 10:
            tips.append(f"Good rainfall ({req.rainfall:.1f}mm). Reduce irrigation by {min(50, int(req.rainfall * 3))}%.")
        if req.humidity > 80:
            tips.append("High humidity reduces evaporation. Morning irrigation is sufficient.")
        if not tips:
            tips.append(f"Apply {water_req:.1f}mm of water per day for optimal {req.crop_type} growth.")

        irr_times = IRRIGATION_TIMES.get(stress_label, ["6:00 AM"])
        schedule  = f"Apply {water_req/len(irr_times):.1f}mm at each session ({', '.join(irr_times)})"

        return CropRecommendResponse(
            crop_type=req.crop_type,
            growth_stage=req.growth_stage,
            water_req_mm_day=round(water_req, 2),
            stress_level=stress_label,
            stress_description=STRESS_DESCRIPTIONS[stress_label],
            irrigation_times=irr_times,
            daily_schedule=schedule,
            tips=tips,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class IrrigationScheduleRequest(BaseModel):
    field_name:    str = Field(..., example="North Paddy Field")
    crop_type:     str = Field(..., example="Rice")
    growth_stage:  str = Field(..., example="Flowering")
    soil_moisture: float = Field(..., ge=0, le=100, example=32.0)
    temperature:   float = Field(..., ge=-10, le=60, example=34.0)
    rainfall_7day: float = Field(..., ge=0, le=500, example=15.0, description="Total rainfall in last 7 days (mm)")
    field_area_ha: float = Field(..., ge=0.01, example=2.5, description="Field area in hectares")


class IrrigationScheduleResponse(BaseModel):
    field_name:        str
    weekly_schedule:   List[dict]
    total_water_m3:    float
    cost_saving_pct:   float
    recommendation:    str


@router.post(
    "/irrigation-schedule",
    response_model=IrrigationScheduleResponse,
    summary="Generate a 7-day irrigation schedule for a field",
)
async def irrigation_schedule(req: IrrigationScheduleRequest):
    try:
        # Base daily need estimation
        CROP_BASE = {"Rice":8,"Wheat":5,"Maize":5.5,"Cotton":6,"Sugarcane":9,
                     "Soybean":4.5,"Groundnut":4,"Tomato":5,"Potato":4.5,"Onion":3.5}
        STAGE_M   = {"Seedling":0.6,"Vegetative":0.9,"Flowering":1.1,"Fruiting":1.2,"Maturity":0.7}

        crop_key  = req.crop_type.strip().title()
        stage_key = req.growth_stage.strip().title()
        base = CROP_BASE.get(crop_key, 5.0)
        mult = STAGE_M.get(stage_key, 1.0)

        daily_rain_credit = min(req.rainfall_7day / 7, 3.0)
        temp_factor = max(0, (req.temperature - 25) * 0.08)

        # Current moisture offset
        if req.soil_moisture < 20:
            urgency_add = 2.0
        elif req.soil_moisture < 35:
            urgency_add = 0.5
        else:
            urgency_add = -0.5

        base_daily = max(0.5, base * mult + temp_factor - daily_rain_credit + urgency_add)

        # Build 7-day schedule
        days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
        schedule = []
        total_water = 0.0

        for i, day in enumerate(days):
            # Skip if rainfall expected (simplified: skip every 4th day if recent rain)
            skip = (daily_rain_credit > 2.0 and i % 4 == 3)
            if skip:
                water_mm = 0.0
                action = "No irrigation — recent rainfall sufficient"
                time   = "—"
            else:
                water_mm = round(base_daily + np.random.uniform(-0.3, 0.3), 1)
                volume_m3 = round(water_mm * req.field_area_ha * 10, 1)
                total_water += volume_m3
                if req.temperature > 35:
                    time = "5:30 AM or 6:00 PM (avoid midday heat)"
                else:
                    time = "6:00 AM"
                action = f"Apply {water_mm}mm ({volume_m3} m3)"

            schedule.append({
                "day": day,
                "action": action,
                "recommended_time": time,
                "water_mm": water_mm,
            })

        # Cost saving estimate vs flood irrigation
        cost_saving = 25 + min(30, req.field_area_ha * 5)

        recommendation = (
            f"Apply approximately {base_daily:.1f}mm/day to {req.crop_type} "
            f"in {stage_key} stage. "
            f"{'Increase frequency due to low moisture.' if req.soil_moisture < 25 else 'Current schedule is optimal.'}"
        )

        return IrrigationScheduleResponse(
            field_name=req.field_name,
            weekly_schedule=schedule,
            total_water_m3=round(total_water, 1),
            cost_saving_pct=round(cost_saving, 1),
            recommendation=recommendation,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
