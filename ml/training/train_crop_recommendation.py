"""
Crop Water Requirement & Recommendation Model - Phase 3
========================================================
Trains a model to recommend:
  1. Water amount (mm/day) based on crop + soil + weather
  2. Optimal irrigation time (morning / evening / both)
  3. Water stress risk (LOW / MEDIUM / HIGH / CRITICAL)

Run: python training/train_crop_recommendation.py
"""

import pandas as pd
import numpy as np
import os
import joblib
import warnings
warnings.filterwarnings("ignore")

from sklearn.ensemble import GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.metrics import mean_absolute_error, r2_score, accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

print("=" * 60)
print("PHASE 3: CROP WATER REQUIREMENT MODEL")
print("=" * 60)

np.random.seed(42)
N = 3000

CROPS = ["Rice","Wheat","Maize","Cotton","Sugarcane","Soybean","Groundnut","Tomato","Potato","Onion"]
STAGES = ["Seedling","Vegetative","Flowering","Fruiting","Maturity"]
SOILS  = ["Sandy","Loamy","Clay","Silt","Peaty","Chalky"]
SEASONS= ["Kharif","Rabi","Zaid"]

CROP_BASE_WATER = {
    "Rice": 8.0, "Wheat": 5.0, "Maize": 5.5, "Cotton": 6.0,
    "Sugarcane": 9.0, "Soybean": 4.5, "Groundnut": 4.0,
    "Tomato": 5.0, "Potato": 4.5, "Onion": 3.5,
}

STAGE_MULTIPLIER = {
    "Seedling": 0.6, "Vegetative": 0.9, "Flowering": 1.1,
    "Fruiting": 1.2, "Maturity": 0.7,
}

crops   = np.random.choice(CROPS,   N)
stages  = np.random.choice(STAGES,  N)
soils   = np.random.choice(SOILS,   N)
seasons = np.random.choice(SEASONS, N)

temp    = np.random.uniform(15, 45, N)
humidity= np.random.uniform(20, 95, N)
rainfall= np.random.exponential(4, N)
moisture= np.random.uniform(10, 80, N)
et      = np.random.uniform(1, 12, N)

# Water requirement calculation
base_water = np.array([CROP_BASE_WATER[c] for c in crops])
stage_mult = np.array([STAGE_MULTIPLIER[s] for s in stages])

water_req = (
    base_water * stage_mult +
    (temp - 25) * 0.08 +
    (100 - humidity) * 0.02 +
    et * 0.3 -
    np.clip(rainfall, 0, 5) * 0.4 +
    np.random.randn(N) * 0.5
)
water_req = np.clip(water_req, 0.5, 15.0)

# Stress risk
stress_score = (30 - moisture) * 0.5 + (temp - 30) * 0.3 + (10 - np.clip(rainfall, 0, 10)) * 0.2
stress_level = pd.cut(
    stress_score,
    bins=[-np.inf, 0, 5, 12, np.inf],
    labels=["LOW", "MEDIUM", "HIGH", "CRITICAL"]
)

df = pd.DataFrame({
    "crop_type": crops, "growth_stage": stages, "soil_type": soils,
    "season": seasons, "temperature": temp, "humidity": humidity,
    "rainfall": rainfall, "soil_moisture": moisture,
    "evapotranspiration": et,
    "water_req_mm_day": water_req,
    "stress_level": stress_level.astype(str),
})

# Encode categoricals
le_crop    = LabelEncoder().fit(CROPS)
le_stage   = LabelEncoder().fit(STAGES)
le_soil    = LabelEncoder().fit(SOILS)
le_season  = LabelEncoder().fit(SEASONS)
le_stress  = LabelEncoder().fit(["LOW","MEDIUM","HIGH","CRITICAL"])

df["crop_enc"]   = le_crop.transform(df["crop_type"])
df["stage_enc"]  = le_stage.transform(df["growth_stage"])
df["soil_enc"]   = le_soil.transform(df["soil_type"])
df["season_enc"] = le_season.transform(df["season"])

FEATURES = ["crop_enc","stage_enc","soil_enc","season_enc",
            "temperature","humidity","rainfall","soil_moisture","evapotranspiration"]

X = df[FEATURES]
y_reg = df["water_req_mm_day"]
y_cls = le_stress.transform(df["stress_level"])

X_train, X_test, yr_train, yr_test, yc_train, yc_test = train_test_split(
    X, y_reg, y_cls, test_size=0.2, random_state=42
)

print(f"\nTraining data: {X_train.shape}")

# ── Water requirement regression ──────────────────────────────
print("\nTraining water requirement regressor...")
reg = GradientBoostingRegressor(n_estimators=200, learning_rate=0.08, max_depth=4, random_state=42)
reg.fit(X_train, yr_train)
yr_pred = reg.predict(X_test)
mae = mean_absolute_error(yr_test, yr_pred)
r2  = r2_score(yr_test, yr_pred)
print(f"  MAE  : {mae:.4f} mm/day")
print(f"  R2   : {r2:.4f}")

# ── Stress level classifier ───────────────────────────────────
print("\nTraining water stress classifier...")
clf = GradientBoostingClassifier(n_estimators=150, learning_rate=0.1, max_depth=4, random_state=42)
clf.fit(X_train, yc_train)
yc_pred = clf.predict(X_test)
acc = accuracy_score(yc_test, yc_pred)
f1  = f1_score(yc_test, yc_pred, average="weighted", zero_division=0)
print(f"  Accuracy : {acc:.4f}")
print(f"  F1 Score : {f1:.4f}")

# ── Save ──────────────────────────────────────────────────────
encoders = {
    "le_crop": le_crop, "le_stage": le_stage,
    "le_soil": le_soil, "le_season": le_season, "le_stress": le_stress,
    "features": FEATURES,
}

joblib.dump(reg,      os.path.join(MODELS_DIR, "water_req_model.pkl"))
joblib.dump(clf,      os.path.join(MODELS_DIR, "stress_level_model.pkl"))
joblib.dump(encoders, os.path.join(MODELS_DIR, "crop_encoders.pkl"))

print("\n[OK] water_req_model.pkl saved")
print("[OK] stress_level_model.pkl saved")
print("[OK] crop_encoders.pkl saved")
print("\n[OK] Crop recommendation model training complete.")
