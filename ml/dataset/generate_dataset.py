"""
Dataset Generator for AI-Based Irrigation Management System
============================================================
Generates realistic synthetic datasets mimicking Kaggle irrigation,
soil, weather, and crop datasets for preprocessing demonstration.

Datasets generated:
  1. irrigation_data.csv      - Main irrigation dataset (target: irrigation_needed)
  2. soil_data.csv            - Soil properties dataset
  3. weather_data.csv         - Historical weather dataset
  4. crop_water_requirement.csv - Crop-specific water needs

Run: python generate_dataset.py
"""

import numpy as np
import pandas as pd
import os

np.random.seed(42)
N = 5000  # number of records

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Helpers ───────────────────────────────────────────────────

SOIL_TYPES      = ["Sandy", "Loamy", "Clay", "Silt", "Peaty", "Chalky"]
CROP_TYPES      = ["Rice", "Wheat", "Maize", "Cotton", "Sugarcane",
                   "Soybean", "Groundnut", "Tomato", "Potato", "Onion"]
SEASONS         = ["Kharif", "Rabi", "Zaid"]
IRRIGATION_METHODS = ["Drip", "Sprinkler", "Flood", "Furrow"]
REGIONS         = ["North", "South", "East", "West", "Central"]
GROWTH_STAGES   = ["Seedling", "Vegetative", "Flowering", "Fruiting", "Maturity"]

# ── 1. Main Irrigation Dataset ────────────────────────────────
print("Generating irrigation_data.csv ...")

soil_moisture   = np.random.uniform(10, 80, N)
temperature     = np.random.uniform(15, 45, N)
humidity        = np.random.uniform(20, 95, N)
rainfall        = np.random.exponential(5, N)       # mostly low, occasionally high
wind_speed      = np.random.uniform(0, 25, N)
ph              = np.random.uniform(4.5, 8.5, N)
nitrogen        = np.random.uniform(0, 140, N)
phosphorus      = np.random.uniform(0, 145, N)
potassium       = np.random.uniform(0, 205, N)
evapotranspiration = np.random.uniform(1, 12, N)

# Introduce intentional data quality issues for preprocessing exercise
soil_moisture[np.random.choice(N, 120, replace=False)] = np.nan
temperature[np.random.choice(N, 80, replace=False)] = np.nan
humidity[np.random.choice(N, 60, replace=False)] = np.nan
rainfall[np.random.choice(N, 50, replace=False)] = -999          # invalid
temperature[np.random.choice(N, 30, replace=False)] = 150        # impossible
ph[np.random.choice(N, 40, replace=False)] = -5                  # impossible

soil_type  = np.random.choice(SOIL_TYPES, N)
crop_type  = np.random.choice(CROP_TYPES, N)
season     = np.random.choice(SEASONS, N)
region     = np.random.choice(REGIONS, N)
growth_stage = np.random.choice(GROWTH_STAGES, N)
irr_method = np.random.choice(IRRIGATION_METHODS, N)

# Target: irrigation_needed (1 = yes, 0 = no)
# Logic: dry soil + hot temp + low rain + high ET -> irrigate
score = (
    (80 - np.clip(soil_moisture, 0, 100)) * 0.4 +
    (temperature - 25)   * 0.3 +
    (10 - np.clip(rainfall, 0, 20)) * 0.2 +
    evapotranspiration   * 0.1
)
# Use median as threshold to ensure ~50/50 balance
irrigation_needed = (score > np.nanmedian(score)).astype(int)

irr_df = pd.DataFrame({
    "record_id":          range(1, N + 1),
    "region":             region,
    "soil_type":          soil_type,
    "crop_type":          crop_type,
    "season":             season,
    "growth_stage":       growth_stage,
    "irrigation_method":  irr_method,
    "soil_moisture_pct":  soil_moisture,
    "temperature_c":      temperature,
    "humidity_pct":       humidity,
    "rainfall_mm":        rainfall,
    "wind_speed_kmh":     wind_speed,
    "soil_ph":            ph,
    "nitrogen_ppm":       nitrogen,
    "phosphorus_ppm":     phosphorus,
    "potassium_ppm":      potassium,
    "evapotranspiration": evapotranspiration,
    "irrigation_needed":  irrigation_needed,
})

# Add ~200 duplicate rows
dupes = irr_df.sample(200, random_state=42)
irr_df = pd.concat([irr_df, dupes], ignore_index=True)
irr_df.to_csv(os.path.join(OUTPUT_DIR, "irrigation_data.csv"), index=False)
print(f"  → irrigation_data.csv: {len(irr_df)} rows, {len(irr_df.columns)} columns")

# ── 2. Soil Dataset ───────────────────────────────────────────
print("Generating soil_data.csv ...")

soil_df = pd.DataFrame({
    "sample_id":      range(1, 1001),
    "soil_type":      np.random.choice(SOIL_TYPES, 1000),
    "sand_pct":       np.random.uniform(10, 90, 1000),
    "silt_pct":       np.random.uniform(5, 50, 1000),
    "clay_pct":       np.random.uniform(5, 60, 1000),
    "organic_matter": np.random.uniform(0.5, 8.0, 1000),
    "water_retention":np.random.uniform(0.1, 0.5, 1000),
    "bulk_density":   np.random.uniform(1.0, 1.8, 1000),
    "ec_ds_m":        np.random.uniform(0.1, 4.0, 1000),  # electrical conductivity
    "ph":             np.random.uniform(4.5, 8.5, 1000),
    "cec":            np.random.uniform(5, 40, 1000),      # cation exchange capacity
})
# Add missing values
soil_df.loc[np.random.choice(1000, 60, replace=False), "organic_matter"] = np.nan
soil_df.loc[np.random.choice(1000, 40, replace=False), "water_retention"] = np.nan
soil_df.to_csv(os.path.join(OUTPUT_DIR, "soil_data.csv"), index=False)
print(f"  → soil_data.csv: {len(soil_df)} rows, {len(soil_df.columns)} columns")

# ── 3. Weather Dataset ────────────────────────────────────────
print("Generating weather_data.csv ...")

dates = pd.date_range("2020-01-01", periods=1460, freq="D")  # 4 years daily
weather_df = pd.DataFrame({
    "date":            dates,
    "region":          np.random.choice(REGIONS, 1460),
    "temp_max_c":      np.random.uniform(20, 48, 1460),
    "temp_min_c":      np.random.uniform(8, 30, 1460),
    "temp_avg_c":      np.random.uniform(15, 40, 1460),
    "rainfall_mm":     np.random.exponential(4, 1460),
    "humidity_pct":    np.random.uniform(25, 98, 1460),
    "wind_speed_kmh":  np.random.uniform(0, 30, 1460),
    "sunshine_hours":  np.random.uniform(0, 12, 1460),
    "uv_index":        np.random.randint(0, 11, 1460),
    "cloud_cover_pct": np.random.uniform(0, 100, 1460),
    "evapotrans_mm":   np.random.uniform(1, 10, 1460),
})
# Add missing values
weather_df.loc[np.random.choice(1460, 80, replace=False), "rainfall_mm"] = np.nan
weather_df.loc[np.random.choice(1460, 50, replace=False), "humidity_pct"] = np.nan
weather_df.to_csv(os.path.join(OUTPUT_DIR, "weather_data.csv"), index=False)
print(f"  → weather_data.csv: {len(weather_df)} rows, {len(weather_df.columns)} columns")

# ── 4. Crop Water Requirement Dataset ────────────────────────
print("Generating crop_water_requirement.csv ...")

crop_records = []
for crop in CROP_TYPES:
    for stage in GROWTH_STAGES:
        for season in SEASONS:
            crop_records.append({
                "crop_type":          crop,
                "growth_stage":       stage,
                "season":             season,
                "water_req_mm_day":   np.random.uniform(2, 12),
                "kc_coefficient":     np.random.uniform(0.3, 1.25),
                "days_in_stage":      np.random.randint(10, 45),
                "sensitive_to_water": np.random.choice([0, 1], p=[0.3, 0.7]),
            })

crop_df = pd.DataFrame(crop_records)
crop_df.to_csv(os.path.join(OUTPUT_DIR, "crop_water_requirement.csv"), index=False)
print(f"  → crop_water_requirement.csv: {len(crop_df)} rows, {len(crop_df.columns)} columns")

print("\n✅ All datasets generated successfully in:", OUTPUT_DIR)
