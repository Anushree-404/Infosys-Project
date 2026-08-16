"""
Kaggle Model Prediction Router - Phase 3
Uses models trained on REAL Kaggle datasets.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import os, joblib, numpy as np, pandas as pd

router = APIRouter(prefix="/api/kaggle", tags=["Kaggle Models (Real Data)"])

BASE_DIR      = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MODELS_DIR    = os.path.join(BASE_DIR, "models")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed_data")

_irr_model    = None
_irr_pipeline = None
_crop_model   = None
_crop_pipeline= None

def _load_irr():
    global _irr_model, _irr_pipeline
    if _irr_model is None:
        _irr_model    = joblib.load(os.path.join(MODELS_DIR, "kaggle_irrigation_model.pkl"))
        _irr_pipeline = joblib.load(os.path.join(PROCESSED_DIR, "kaggle_irr_pipeline.pkl"))

def _load_crop():
    global _crop_model, _crop_pipeline
    if _crop_model is None:
        _crop_model    = joblib.load(os.path.join(MODELS_DIR, "kaggle_crop_model.pkl"))
        _crop_pipeline = joblib.load(os.path.join(PROCESSED_DIR, "kaggle_crop_pipeline.pkl"))


# ── Irrigation prediction using Kaggle features ───────────────
class KaggleIrrigationRequest(BaseModel):
    soil_ph:               float = Field(..., ge=0, le=14,  example=6.5)
    soil_moisture:         float = Field(..., ge=0, le=100, example=37.0)
    organic_carbon:        float = Field(default=0.95, ge=0, le=10)
    electrical_conductivity: float = Field(default=1.8, ge=0, le=5)
    temperature_c:         float = Field(..., ge=-10, le=60, example=28.0)
    humidity:              float = Field(..., ge=0, le=100,  example=65.0)
    # Annual rainfall in mm (Kaggle dataset uses annual rainfall, range 0-2500mm)
    annual_rainfall_mm:    float = Field(default=1252.0, ge=0, le=3000, example=1100.0)
    sunlight_hours:        float = Field(default=8.0, ge=0, le=16)
    wind_speed_kmh:        float = Field(default=10.0, ge=0, le=100)
    field_area_hectare:    float = Field(default=7.6, ge=0.01)
    previous_irrigation_mm: float = Field(default=50.0, ge=0)
    soil_type:             str = Field(default="Loamy",  example="Loamy")
    crop_type:             str = Field(default="Rice",   example="Rice")
    crop_growth_stage:     str = Field(default="Vegetative", example="Vegetative")
    season:                str = Field(default="Kharif", example="Kharif")
    irrigation_type:       str = Field(default="Drip",   example="Drip")
    water_source:          str = Field(default="River",  example="River")
    mulching_used:         str = Field(default="No",     example="No")
    region:                str = Field(default="South",  example="South")

    class Config:
        json_schema_extra = {"example": {
            "soil_ph": 6.5, "soil_moisture": 37, "temperature_c": 28,
            "humidity": 65, "annual_rainfall_mm": 1100, "soil_type": "Loamy",
            "crop_type": "Rice", "crop_growth_stage": "Vegetative",
            "season": "Kharif", "irrigation_type": "Drip",
            "water_source": "River", "mulching_used": "No", "region": "South"
        }}


class KaggleIrrigationResponse(BaseModel):
    irrigation_needed: bool
    confidence: float
    irrigation_level: str
    recommendation: str
    urgency: str
    model: str
    data_source: str


@router.post("/predict/irrigation",
    response_model=KaggleIrrigationResponse,
    summary="Irrigation prediction using Kaggle-trained model (99.9% accuracy)")
async def kaggle_predict_irrigation(req: KaggleIrrigationRequest):
    try:
        _load_irr()
        feat_cols = _irr_pipeline["feature_cols"]
        scaler    = _irr_pipeline["scaler"]

        # Build raw feature dict matching training columns
        raw = {
            "Soil_pH":                 req.soil_ph,
            "Soil_Moisture":           req.soil_moisture,
            "Organic_Carbon":          req.organic_carbon,
            "Electrical_Conductivity": req.electrical_conductivity,
            "Temperature_C":           req.temperature_c,
            "Humidity":                req.humidity,
            "Rainfall_mm":             req.annual_rainfall_mm,   # annual mm — Kaggle dataset feature
            "Sunlight_Hours":          req.sunlight_hours,
            "Wind_Speed_kmh":          req.wind_speed_kmh,
            "Field_Area_hectare":      req.field_area_hectare,
            "Previous_Irrigation_mm":  req.previous_irrigation_mm,
        }

        # One-hot encoded columns (must match training)
        soil_types  = ["Loamy","Sandy","Silt"]       # Clay is base
        crop_types  = ["Maize","Potato","Rice","Sugarcane","Wheat"]  # Cotton is base
        stages      = ["Harvest","Sowing","Vegetative"]  # Flowering is base
        seasons     = ["Rabi","Zaid"]                # Kharif is base
        irr_types   = ["Drip","Rainfed","Sprinkler"] # Flood is base
        water_srcs  = ["Rainwater","Reservoir","River"]  # Groundwater is base
        regions     = ["East","North","South","West"] # Central is base

        for s in soil_types:
            raw[f"Soil_Type_{s}"] = 1 if req.soil_type.strip().title() == s else 0
        for c in crop_types:
            raw[f"Crop_Type_{c}"] = 1 if req.crop_type.strip().title() == c else 0
        for g in stages:
            raw[f"Crop_Growth_Stage_{g}"] = 1 if g.lower() in req.crop_growth_stage.lower() else 0
        for s in seasons:
            raw[f"Season_{s}"] = 1 if req.season.strip().title() == s else 0
        for t in irr_types:
            raw[f"Irrigation_Type_{t}"] = 1 if req.irrigation_type.strip().title() == t else 0
        for w in water_srcs:
            raw[f"Water_Source_{w}"] = 1 if w.lower() in req.water_source.lower() else 0
        raw["Mulching_Used_Yes"] = 1 if req.mulching_used.strip().lower() == "yes" else 0
        for r in regions:
            raw[f"Region_{r}"] = 1 if req.region.strip().title() == r else 0

        # Build DataFrame with exact column order
        df = pd.DataFrame([raw]).reindex(columns=feat_cols, fill_value=0)

        # Scale numeric columns
        num_cols = ["Soil_pH","Soil_Moisture","Organic_Carbon","Electrical_Conductivity",
                    "Temperature_C","Humidity","Rainfall_mm","Sunlight_Hours",
                    "Wind_Speed_kmh","Field_Area_hectare","Previous_Irrigation_mm"]
        valid_num = [c for c in num_cols if c in df.columns]
        df[valid_num] = scaler.transform(df[valid_num])

        pred = int(_irr_model.predict(df)[0])
        prob = float(_irr_model.predict_proba(df)[0][1])

        if prob >= 0.80:
            level, urgency = "High", "URGENT"
        elif prob >= 0.50:
            level, urgency = "Medium", "SOON"
        elif prob >= 0.30:
            level, urgency = "Low", "MONITOR"
        else:
            level, urgency = "None", "OK"

        if pred == 1:
            rec = (f"Irrigation required. Soil moisture {req.soil_moisture:.1f}% at "
                   f"{req.temperature_c:.1f}°C with {req.annual_rainfall_mm:.0f}mm annual rainfall. "
                   f"Apply water {'immediately' if urgency=='URGENT' else 'soon'}.")
        else:
            rec = (f"No irrigation needed. Soil moisture {req.soil_moisture:.1f}% is adequate "
                   f"given {req.annual_rainfall_mm:.0f}mm annual rainfall.")

        return KaggleIrrigationResponse(
            irrigation_needed=bool(pred),
            confidence=round(prob if pred else 1-prob, 4),
            irrigation_level=level,
            recommendation=rec,
            urgency=urgency,
            model="GradientBoostingClassifier (Kaggle-trained)",
            data_source="irrigation_prediction.csv (10,000 real records)",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Crop recommendation ───────────────────────────────────────
class CropRequest(BaseModel):
    nitrogen:    float = Field(..., ge=0, le=150, example=90)
    phosphorus:  float = Field(..., ge=0, le=150, example=42)
    potassium:   float = Field(..., ge=0, le=210, example=43)
    temperature: float = Field(..., ge=0, le=50,  example=28.0)
    humidity:    float = Field(..., ge=0, le=100, example=80.0)
    ph:          float = Field(..., ge=0, le=14,  example=6.5)
    rainfall:    float = Field(..., ge=0, le=300, example=200.0)

    class Config:
        json_schema_extra = {"example": {
            "nitrogen": 90, "phosphorus": 42, "potassium": 43,
            "temperature": 28, "humidity": 80, "ph": 6.5, "rainfall": 200
        }}


class CropResponse(BaseModel):
    recommended_crop: str
    confidence: float
    top_3_crops: List[dict]
    soil_condition: str
    model: str
    data_source: str


@router.post("/predict/crop",
    response_model=CropResponse,
    summary="Crop recommendation from soil + weather (22 Indian crops, 99.5% accuracy)")
async def recommend_crop(req: CropRequest):
    try:
        _load_crop()
        scaler = _crop_pipeline["scaler"]
        le     = _crop_pipeline["label_encoder"]

        raw = np.array([[req.nitrogen, req.phosphorus, req.potassium,
                         req.temperature, req.humidity, req.ph, req.rainfall]])
        raw_scaled = scaler.transform(raw)

        pred_idx  = int(_crop_model.predict(raw_scaled)[0])
        pred_prob = _crop_model.predict_proba(raw_scaled)[0]
        crop_name = le.inverse_transform([pred_idx])[0].title()

        top3_idx  = np.argsort(pred_prob)[::-1][:3]
        top3 = [
            {"crop": le.inverse_transform([i])[0].title(), "confidence": round(float(pred_prob[i]), 4)}
            for i in top3_idx
        ]

        # Soil condition assessment
        if req.ph < 5.5:    soil = "Acidic — may need lime treatment"
        elif req.ph > 7.5:  soil = "Alkaline — may need sulfur treatment"
        else:               soil = "Neutral pH — good for most crops"

        return CropResponse(
            recommended_crop=crop_name,
            confidence=round(float(pred_prob[pred_idx]), 4),
            top_3_crops=top3,
            soil_condition=soil,
            model="RandomForestClassifier (Kaggle-trained)",
            data_source="Crop_recommendation.csv (2,200 real records, 22 crops)",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", summary="Kaggle models health check")
async def kaggle_health():
    irr_ok  = os.path.exists(os.path.join(MODELS_DIR, "kaggle_irrigation_model.pkl"))
    crop_ok = os.path.exists(os.path.join(MODELS_DIR, "kaggle_crop_model.pkl"))
    return {
        "status": "healthy" if (irr_ok and crop_ok) else "partial",
        "irrigation_model": "kaggle_irrigation_model.pkl (F1=0.9994)" if irr_ok else "not found",
        "crop_model":       "kaggle_crop_model.pkl (F1=0.9955)" if crop_ok else "not found",
        "data_source":      "Real Kaggle datasets",
    }
