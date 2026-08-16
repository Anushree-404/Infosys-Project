"""
Pydantic Models — Request/Response schemas for FastAPI ML service
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from enum import Enum


class SoilType(str, Enum):
    sandy    = "Sandy"
    loamy    = "Loamy"
    clay     = "Clay"
    silt     = "Silt"
    peaty    = "Peaty"
    chalky   = "Chalky"


class CropType(str, Enum):
    rice       = "Rice"
    wheat      = "Wheat"
    maize      = "Maize"
    cotton     = "Cotton"
    sugarcane  = "Sugarcane"
    soybean    = "Soybean"
    groundnut  = "Groundnut"
    tomato     = "Tomato"
    potato     = "Potato"
    onion      = "Onion"


class Season(str, Enum):
    kharif = "Kharif"
    rabi   = "Rabi"
    zaid   = "Zaid"


class Region(str, Enum):
    north   = "North"
    south   = "South"
    east    = "East"
    west    = "West"
    central = "Central"


class IrrigationMethod(str, Enum):
    drip        = "Drip"
    sprinkler   = "Sprinkler"
    flood       = "Flood"
    furrow      = "Furrow"


class GrowthStage(str, Enum):
    seedling   = "Seedling"
    vegetative = "Vegetative"
    flowering  = "Flowering"
    fruiting   = "Fruiting"
    maturity   = "Maturity"
    harvesting = "Harvesting"


# ── Irrigation Prediction Request ────────────────────────────
class IrrigationPredictionRequest(BaseModel):
    # Sensor readings (real-time from IoT devices)
    soil_moisture_pct: float = Field(..., ge=0, le=100,
        description="Soil moisture percentage (0-100)")
    temperature_c: float = Field(..., ge=-10, le=60,
        description="Air temperature in Celsius")
    humidity_pct: float = Field(..., ge=0, le=100,
        description="Relative humidity percentage")
    rainfall_mm: float = Field(..., ge=0, le=200,
        description="Daily rainfall in millimetres")
    wind_speed_kmh: float = Field(..., ge=0, le=100,
        description="Wind speed in km/h")
    evapotranspiration: float = Field(..., ge=0, le=20,
        description="Evapotranspiration in mm/day")

    # Soil properties
    soil_ph: float = Field(..., ge=0, le=14,
        description="Soil pH value")
    nitrogen_ppm: float = Field(..., ge=0, le=200,
        description="Soil nitrogen in ppm")
    phosphorus_ppm: float = Field(..., ge=0, le=200,
        description="Soil phosphorus in ppm")
    potassium_ppm: float = Field(..., ge=0, le=300,
        description="Soil potassium in ppm")

    # Categorical context
    soil_type: SoilType = Field(..., description="Soil texture type")
    crop_type: CropType = Field(..., description="Crop being grown")
    season: Season = Field(..., description="Agricultural season")
    region: Region = Field(..., description="Geographic region")
    irrigation_method: IrrigationMethod = Field(..., description="Irrigation method used")
    growth_stage: GrowthStage = Field(..., description="Current crop growth stage")

    class Config:
        json_schema_extra = {
            "example": {
                "soil_moisture_pct": 22.0,
                "temperature_c": 34.5,
                "humidity_pct": 45.0,
                "rainfall_mm": 1.2,
                "wind_speed_kmh": 12.0,
                "evapotranspiration": 7.5,
                "soil_ph": 6.8,
                "nitrogen_ppm": 55.0,
                "phosphorus_ppm": 60.0,
                "potassium_ppm": 95.0,
                "soil_type": "Loamy",
                "crop_type": "Rice",
                "season": "Kharif",
                "region": "South",
                "irrigation_method": "Drip",
                "growth_stage": "Vegetative"
            }
        }


# ── Irrigation Prediction Response ───────────────────────────
class IrrigationPredictionResponse(BaseModel):
    irrigation_needed: bool
    confidence: float
    recommendation: str
    urgency: str
    suggested_water_mm: Optional[float]
    suggested_water_litres: Optional[float]
    field_area_ha: Optional[float]
    irrigation_sessions: List[dict]
    key_factors: List[str]
    model_used: str


# ── Batch Prediction ─────────────────────────────────────────
class BatchPredictionRequest(BaseModel):
    readings: List[IrrigationPredictionRequest] = Field(...,
        description="List of sensor readings for batch prediction")


class BatchPredictionResponse(BaseModel):
    results: List[IrrigationPredictionResponse]
    total: int
    irrigate_count: int
    no_irrigate_count: int


# ── Model Info ───────────────────────────────────────────────
class ModelInfoResponse(BaseModel):
    model_name: str
    model_type: str
    accuracy: float
    f1_score: float
    roc_auc: float
    features_count: int
    training_samples: int
    status: str
