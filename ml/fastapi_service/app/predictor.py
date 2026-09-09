"""
Predictor — loads trained model and preprocessing pipeline,
transforms input features, and returns predictions.
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any

# ── Paths ──────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS_DIR   = os.path.join(BASE_DIR, "models")
PROCESSED    = os.path.join(BASE_DIR, "processed_data")

# Growth stage ordinal mapping (must match preprocessing)
GROWTH_ORDER = {
    "Seedling": 0, "Vegetative": 1, "Flowering": 2,
    "Fruiting": 3, "Maturity": 4, "Harvesting": 5,
}

# All OHE columns that were created during training
# (must match X_train.csv column order exactly)
ALL_SOIL_TYPES        = ["Clay", "Loamy", "Peaty", "Sandy", "Silt"]          # Chalky = base
ALL_CROP_TYPES        = ["Cotton","Groundnut","Maize","Onion","Potato",
                          "Rice","Soybean","Sugarcane","Tomato","Wheat"]      # Groundnut = base
ALL_SEASONS           = ["Rabi", "Zaid"]                                      # Kharif = base
ALL_REGIONS           = ["North","South","West","East"]                       # Central = base
ALL_IRR_METHODS       = ["Flood","Furrow","Sprinkler"]                        # Drip = base


class IrrigationPredictor:
    def __init__(self):
        self.model    = None
        self.pipeline = None
        self.feature_cols = None
        self._load()

    def _load(self):
        model_path    = os.path.join(MODELS_DIR,  "best_model.pkl")
        pipeline_path = os.path.join(PROCESSED,   "preprocessing_pipeline.pkl")
        x_train_path  = os.path.join(PROCESSED,   "X_train.csv")

        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Model not found: {model_path}\n"
                "Run: python training/train_models.py"
            )

        self.model    = joblib.load(model_path)
        self.pipeline = joblib.load(pipeline_path)

        # Load column order from training data
        X_train = pd.read_csv(x_train_path, nrows=1)
        self.feature_cols = list(X_train.columns)

    def _build_feature_vector(self, data: Dict[str, Any]) -> pd.DataFrame:
        """
        Convert raw sensor reading dict into the 34-feature vector
        matching the training data schema exactly.
        """
        row: Dict[str, float] = {}

        # ── Numeric features (will be scaled by pipeline) ──────
        row["soil_moisture_pct"]  = float(data["soil_moisture_pct"])
        row["temperature_c"]      = float(data["temperature_c"])
        row["humidity_pct"]       = float(data["humidity_pct"])
        row["rainfall_mm"]        = float(data["rainfall_mm"])
        row["wind_speed_kmh"]     = float(data["wind_speed_kmh"])
        row["soil_ph"]            = float(data["soil_ph"])
        row["nitrogen_ppm"]       = float(data["nitrogen_ppm"])
        row["phosphorus_ppm"]     = float(data["phosphorus_ppm"])
        row["potassium_ppm"]      = float(data["potassium_ppm"])
        row["evapotranspiration"] = float(data["evapotranspiration"])

        # ── Ordinal encoding: growth_stage ─────────────────────
        stage = str(data["growth_stage"]).strip().title()
        row["growth_stage_enc"] = float(GROWTH_ORDER.get(stage, 0))

        # ── One-hot encoding: soil_type (drop_first=True → Chalky is base) ──
        soil = str(data["soil_type"]).strip().title()
        for s in ALL_SOIL_TYPES:
            row[f"soil_type_{s}"] = 1.0 if soil == s else 0.0

        # ── One-hot encoding: crop_type (base = Groundnut) ─────
        crop = str(data["crop_type"]).strip().title()
        for c in ALL_CROP_TYPES:
            row[f"crop_type_{c}"] = 1.0 if crop == c else 0.0

        # ── One-hot encoding: season (base = Kharif) ───────────
        season = str(data["season"]).strip().title()
        for s in ALL_SEASONS:
            row[f"season_{s}"] = 1.0 if season == s else 0.0

        # ── One-hot encoding: region (base = Central) ──────────
        region = str(data["region"]).strip().title()
        for r in ALL_REGIONS:
            row[f"region_{r}"] = 1.0 if region == r else 0.0

        # ── One-hot encoding: irrigation_method (base = Drip) ──
        irr = str(data["irrigation_method"]).strip().title()
        for m in ALL_IRR_METHODS:
            row[f"irrigation_method_{m}"] = 1.0 if irr == m else 0.0

        df = pd.DataFrame([row])

        # Reindex to exact column order (fills missing OHE cols with 0)
        df = df.reindex(columns=self.feature_cols, fill_value=0.0)

        # Apply scaling to numeric columns using saved pipeline
        std_cols = self.pipeline["std_cols"]
        mm_cols  = self.pipeline["mm_cols"]

        valid_std = [c for c in std_cols if c in df.columns]
        valid_mm  = [c for c in mm_cols  if c in df.columns]

        if valid_std:
            df[valid_std] = self.pipeline["std_scaler"].transform(df[valid_std])
        if valid_mm:
            df[valid_mm]  = self.pipeline["mm_scaler"].transform(df[valid_mm])

        return df

    def predict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Returns irrigation prediction with confidence and recommendation.
        """
        df    = self._build_feature_vector(data)
        pred  = int(self.model.predict(df)[0])
        prob  = float(self.model.predict_proba(df)[0][1])  # P(irrigate)

        # ── Determine urgency ───────────────────────────────────
        moisture = float(data["soil_moisture_pct"])
        if pred == 1:
            if moisture < 20 or prob > 0.90:
                urgency = "URGENT"
            elif prob > 0.70:
                urgency = "SOON"
            else:
                urgency = "MONITOR"
        else:
            urgency = "OK"

        # ── Water calculation (mm → litres) ──────────────────────
        # field_area in hectares (default 1 ha if not provided)
        field_area_ha = float(data.get("field_area_ha", 1.0))

        suggested_water_mm = None
        suggested_water_litres = None
        irrigation_sessions = []

        if pred == 1:
            # Fill soil to 60% moisture
            deficit = max(0.0, 60.0 - moisture)
            water_mm = round(deficit * 0.3, 1)
            # 1 mm over 1 hectare = 10,000 litres
            water_litres = round(water_mm * field_area_ha * 10000, 0)
            suggested_water_mm = water_mm
            suggested_water_litres = water_litres

            # Flow rate — realistic values per hectare
            # Drip:      200 L/min/ha  (typical drip system)
            # Sprinkler: 500 L/min/ha  (typical sprinkler)
            # Flood:    1500 L/min/ha  (flood/furrow)
            method = str(data.get("irrigation_method", "Drip")).lower()
            if "drip" in method:
                flow_rate_lpm = 200.0 * field_area_ha
            elif "sprinkler" in method:
                flow_rate_lpm = 500.0 * field_area_ha
            else:
                flow_rate_lpm = 1500.0 * field_area_ha

            duration_minutes = round(water_litres / max(flow_rate_lpm, 1), 0)

            # Build irrigation schedule
            temp = float(data["temperature_c"])
            if urgency == "URGENT":
                # Split into 2 sessions
                session_litres = round(water_litres / 2, 0)
                session_mins   = round(duration_minutes / 2, 0)
                irrigation_sessions = [
                    {"time": "6:00 AM", "duration_minutes": int(session_mins), "litres": int(session_litres), "reason": "Morning — cool temperature, less evaporation"},
                    {"time": "5:00 PM", "duration_minutes": int(session_mins), "litres": int(session_litres), "reason": "Evening — second session to meet full deficit"},
                ]
            elif urgency == "SOON":
                irrigation_sessions = [
                    {"time": "6:00 AM", "duration_minutes": int(duration_minutes), "litres": int(water_litres), "reason": "Morning irrigation recommended"},
                ]
            else:
                irrigation_sessions = [
                    {"time": "6:30 AM", "duration_minutes": int(duration_minutes), "litres": int(water_litres), "reason": "Early morning — optimal time to reduce evaporation"},
                ]

        # ── Recommendation ────────────────────────────────────────
        recommendation = self._build_recommendation(
            pred, prob, moisture, float(data["temperature_c"]),
            float(data["rainfall_mm"]), urgency
        )

        # ── Key factors ──────────────────────────────────────────
        key_factors = self._key_factors(data, pred)

        return {
            "irrigation_needed":       bool(pred),
            "confidence":              round(prob if pred else 1 - prob, 4),
            "recommendation":          recommendation,
            "urgency":                 urgency,
            "suggested_water_mm":      suggested_water_mm,
            "suggested_water_litres":  suggested_water_litres,
            "field_area_ha":           float(data.get("field_area_ha", 1.0)),
            "irrigation_sessions":     irrigation_sessions,
            "key_factors":             key_factors,
            "model_used":              type(self.model).__name__,
        }

    def predict_batch(self, records: list) -> list:
        return [self.predict(r) for r in records]

    def _build_recommendation(self, pred, prob, moisture, temp, rain, urgency):
        if pred == 0:
            if moisture > 70:
                return "Soil is well watered. No irrigation needed. Monitor soil moisture."
            elif rain > 5:
                return f"Recent rainfall ({rain:.1f}mm) is sufficient. No irrigation needed today."
            else:
                return "Soil moisture levels are adequate. Check again tomorrow."
        else:
            if urgency == "URGENT":
                return (f"Soil moisture is critically low ({moisture:.1f}%). "
                        f"Irrigate immediately to prevent crop stress.")
            elif urgency == "SOON":
                return (f"Soil moisture is below optimal ({moisture:.1f}%). "
                        f"Irrigate within the next few hours.")
            else:
                return (f"Irrigation is recommended soon. "
                        f"Soil moisture at {moisture:.1f}%, temperature {temp:.1f}°C.")

    def _key_factors(self, data, pred):
        factors = []
        moisture = float(data["soil_moisture_pct"])
        temp     = float(data["temperature_c"])
        rain     = float(data["rainfall_mm"])
        et       = float(data["evapotranspiration"])

        if pred == 1:
            if moisture < 30:
                factors.append(f"Low soil moisture: {moisture:.1f}%")
            if temp > 35:
                factors.append(f"High temperature: {temp:.1f}°C increases water demand")
            if rain < 2:
                factors.append(f"Minimal rainfall: {rain:.1f}mm")
            if et > 6:
                factors.append(f"High evapotranspiration: {et:.1f}mm/day")
        else:
            if moisture > 60:
                factors.append(f"Good soil moisture: {moisture:.1f}%")
            if rain > 5:
                factors.append(f"Recent rainfall: {rain:.1f}mm")
            if temp < 30:
                factors.append(f"Moderate temperature: {temp:.1f}°C")

        if not factors:
            factors.append("Model prediction based on combined sensor analysis")
        return factors


# Singleton instance
_predictor_instance = None

def get_predictor() -> IrrigationPredictor:
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = IrrigationPredictor()
    return _predictor_instance
