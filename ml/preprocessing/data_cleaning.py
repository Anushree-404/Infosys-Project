"""
Data Cleaning Module - AI Irrigation Management System
=======================================================
Steps performed:
  1. Load all datasets
  2. Analyze structure (shape, dtypes, stats)
  3. Data quality checks (missing, duplicates, invalid)
  4. Clean data (remove dupes, handle nulls, fix types, drop irrelevant cols)
  5. Save cleaned datasets

Run: python data_cleaning.py
"""

import pandas as pd
import numpy as np
import os
import sys

# -- Paths ------------------------------------------------------
BASE_DIR     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR  = os.path.join(BASE_DIR, "dataset")
PROCESSED_DIR= os.path.join(BASE_DIR, "processed_data")
REPORTS_DIR  = os.path.join(BASE_DIR, "reports")
os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR,   exist_ok=True)

report_lines = []

def log(msg=""):
    print(msg)
    report_lines.append(str(msg))

# -- Load datasets ----------------------------------------------
log("=" * 65)
log("STEP 1: LOADING DATASETS")
log("=" * 65)

datasets = {}
for fname in ["irrigation_data.csv", "soil_data.csv",
              "weather_data.csv", "crop_water_requirement.csv"]:
    path = os.path.join(DATASET_DIR, fname)
    if not os.path.exists(path):
        log(f"  [WARN] {fname} not found — run dataset/generate_dataset.py first")
        sys.exit(1)
    df = pd.read_csv(path)
    key = fname.replace(".csv", "")
    datasets[key] = df
    log(f"  [OK] Loaded {fname}: {df.shape[0]} rows × {df.shape[1]} columns")

irr_df    = datasets["irrigation_data"]
soil_df   = datasets["soil_data"]
weather_df= datasets["weather_data"]
crop_df   = datasets["crop_water_requirement"]


# ===============================================================
# STEP 2: DATASET ANALYSIS
# ===============================================================
log("\n" + "=" * 65)
log("STEP 2: DATASET ANALYSIS")
log("=" * 65)

def analyze_dataset(df, name, target=None):
    log(f"\n{'-'*55}")
    log(f"  Dataset: {name.upper()}")
    log(f"  Shape  : {df.shape[0]} rows × {df.shape[1]} columns")
    log(f"{'-'*55}")
    log("  Columns and Data Types:")
    for col, dtype in df.dtypes.items():
        log(f"    {col:<35} {dtype}")
    log("\n  Summary Statistics:")
    log(df.describe(include="all").to_string())
    if target and target in df.columns:
        log(f"\n  Target variable: '{target}'")
        log(f"  Class distribution:\n{df[target].value_counts().to_string()}")

analyze_dataset(irr_df,     "irrigation_data",         target="irrigation_needed")
analyze_dataset(soil_df,    "soil_data")
analyze_dataset(weather_df, "weather_data")
analyze_dataset(crop_df,    "crop_water_requirement")

log("\n  FEATURE PURPOSE — IRRIGATION DATASET:")
feature_desc = {
    "record_id":          "Unique row identifier (drop before modelling)",
    "region":             "Geographic region of the farm",
    "soil_type":          "Soil texture class (Sandy/Loamy/Clay etc.)",
    "crop_type":          "Type of crop being grown",
    "season":             "Agricultural season (Kharif/Rabi/Zaid)",
    "growth_stage":       "Current stage of crop growth",
    "irrigation_method":  "Method used for irrigation",
    "soil_moisture_pct":  "% water content in soil — KEY feature for irrigation",
    "temperature_c":      "Air temperature in Celsius",
    "humidity_pct":       "Relative humidity %",
    "rainfall_mm":        "Daily rainfall in millimetres",
    "wind_speed_kmh":     "Wind speed affecting evaporation",
    "soil_ph":            "pH of soil (affects nutrient absorption)",
    "nitrogen_ppm":       "Soil nitrogen concentration",
    "phosphorus_ppm":     "Soil phosphorus concentration",
    "potassium_ppm":      "Soil potassium concentration",
    "evapotranspiration": "Water lost via evaporation + plant transpiration",
    "irrigation_needed":  "TARGET: 1 = Irrigate, 0 = Do not irrigate",
}
for col, desc in feature_desc.items():
    log(f"    {col:<30} → {desc}")


# ===============================================================
# STEP 3: DATA QUALITY CHECKS
# ===============================================================
log("\n" + "=" * 65)
log("STEP 3: DATA QUALITY CHECKS")
log("=" * 65)

def quality_check(df, name):
    log(f"\n  [{name}]")

    # Missing values
    missing = df.isnull().sum()
    missing_pct = (missing / len(df) * 100).round(2)
    log(f"  Missing values:")
    for col in missing[missing > 0].index:
        log(f"    {col:<35} {missing[col]:>5} ({missing_pct[col]}%)")
    if missing.sum() == 0:
        log("    None found [OK]")

    # Duplicates
    dupes = df.duplicated().sum()
    log(f"  Duplicate rows: {dupes}")

    # Invalid values per numeric column
    numeric_cols = df.select_dtypes(include=np.number).columns
    log("  Invalid / impossible values:")
    found_invalid = False
    for col in numeric_cols:
        neg = (df[col] < 0).sum()
        if neg > 0:
            log(f"    {col:<35} {neg} negative values")
            found_invalid = True
    if not found_invalid:
        log("    None detected (before cleaning)")

quality_check(irr_df,     "irrigation_data")
quality_check(soil_df,    "soil_data")
quality_check(weather_df, "weather_data")
quality_check(crop_df,    "crop_water_requirement")


# ===============================================================
# STEP 4: DATA CLEANING
# ===============================================================
log("\n" + "=" * 65)
log("STEP 4: DATA CLEANING")
log("=" * 65)

# -- 4.1 Remove duplicates -------------------------------------
before = len(irr_df)
irr_df = irr_df.drop_duplicates()
log(f"\n  [Duplicates] Removed {before - len(irr_df)} duplicate rows from irrigation_data")

# -- 4.2 Drop irrelevant columns --------------------------------
irr_df = irr_df.drop(columns=["record_id"])
log("  [Columns] Dropped 'record_id' — no predictive value")

if "sample_id" in soil_df.columns:
    soil_df = soil_df.drop(columns=["sample_id"])
    log("  [Columns] Dropped 'sample_id' from soil_data")

# -- 4.3 Fix impossible values → replace with NaN --------------
#   Rainfall: negative is impossible
neg_rain_irr = (irr_df["rainfall_mm"] < 0).sum()
irr_df.loc[irr_df["rainfall_mm"] < 0, "rainfall_mm"] = np.nan
log(f"  [Invalid] Replaced {neg_rain_irr} negative rainfall values with NaN in irrigation_data")

neg_rain_wx = (weather_df["rainfall_mm"] < 0).sum()
weather_df.loc[weather_df["rainfall_mm"] < 0, "rainfall_mm"] = np.nan
log(f"  [Invalid] Replaced {neg_rain_wx} negative rainfall values with NaN in weather_data")

#   Temperature: above 80°C or below -50°C is impossible for field conditions
imp_temp_high = (irr_df["temperature_c"] > 80).sum()
imp_temp_low  = (irr_df["temperature_c"] < -50).sum()
irr_df.loc[irr_df["temperature_c"] > 80,  "temperature_c"] = np.nan
irr_df.loc[irr_df["temperature_c"] < -50, "temperature_c"] = np.nan
log(f"  [Invalid] Replaced {imp_temp_high} impossible high + {imp_temp_low} low temperature values with NaN")

#   pH: must be 0–14
imp_ph = (irr_df["soil_ph"] < 0).sum() + (irr_df["soil_ph"] > 14).sum()
irr_df.loc[irr_df["soil_ph"] < 0,  "soil_ph"] = np.nan
irr_df.loc[irr_df["soil_ph"] > 14, "soil_ph"] = np.nan
log(f"  [Invalid] Replaced {imp_ph} invalid pH values with NaN")

# -- 4.4 Handle missing values ---------------------------------
log("\n  [Missing Values] Imputation strategy:")

#   Numeric columns: fill with MEDIAN (robust to outliers)
num_cols_irr = irr_df.select_dtypes(include=np.number).columns.tolist()
num_cols_irr = [c for c in num_cols_irr if c != "irrigation_needed"]

for col in num_cols_irr:
    missing_count = irr_df[col].isnull().sum()
    if missing_count > 0:
        median_val = irr_df[col].median()
        irr_df[col] = irr_df[col].fillna(median_val)
        log(f"    irrigation_data.{col:<28} filled {missing_count} NaN → median={median_val:.2f}")

for col in soil_df.select_dtypes(include=np.number).columns:
    missing_count = soil_df[col].isnull().sum()
    if missing_count > 0:
        median_val = soil_df[col].median()
        soil_df[col] = soil_df[col].fillna(median_val)
        log(f"    soil_data.{col:<35} filled {missing_count} NaN → median={median_val:.2f}")

for col in weather_df.select_dtypes(include=np.number).columns:
    missing_count = weather_df[col].isnull().sum()
    if missing_count > 0:
        median_val = weather_df[col].median()
        weather_df[col] = weather_df[col].fillna(median_val)
        log(f"    weather_data.{col:<32} filled {missing_count} NaN → median={median_val:.2f}")

#   Categorical columns: fill with MODE
cat_cols_irr = irr_df.select_dtypes(include="object").columns
for col in cat_cols_irr:
    missing_count = irr_df[col].isnull().sum()
    if missing_count > 0:
        mode_val = irr_df[col].mode()[0]
        irr_df[col] = irr_df[col].fillna(mode_val)
        log(f"    irrigation_data.{col:<28} filled {missing_count} NaN → mode='{mode_val}'")

# -- 4.5 Convert data types ------------------------------------
if "date" in weather_df.columns:
    weather_df["date"] = pd.to_datetime(weather_df["date"])
    weather_df["month"] = weather_df["date"].dt.month
    weather_df["day_of_year"] = weather_df["date"].dt.dayofyear
    weather_df = weather_df.drop(columns=["date"])
    log("\n  [Types] Converted 'date' → extracted month, day_of_year features")

# -- 4.6 Consistent text formatting ----------------------------
cat_cols_irr = irr_df.select_dtypes(include="object").columns
for col in cat_cols_irr:
    irr_df[col] = irr_df[col].str.strip().str.title()
log("  [Format] Stripped whitespace and title-cased all categorical columns")

# -- 4.7 Verify final state ------------------------------------
log("\n  Post-cleaning verification:")
log(f"    irrigation_data : {irr_df.shape} | Missing: {irr_df.isnull().sum().sum()}")
log(f"    soil_data       : {soil_df.shape} | Missing: {soil_df.isnull().sum().sum()}")
log(f"    weather_data    : {weather_df.shape} | Missing: {weather_df.isnull().sum().sum()}")
log(f"    crop_data       : {crop_df.shape} | Missing: {crop_df.isnull().sum().sum()}")

# -- Save cleaned datasets --------------------------------------
irr_df.to_csv(    os.path.join(PROCESSED_DIR, "cleaned_irrigation.csv"), index=False)
soil_df.to_csv(   os.path.join(PROCESSED_DIR, "cleaned_soil.csv"),       index=False)
weather_df.to_csv(os.path.join(PROCESSED_DIR, "cleaned_weather.csv"),    index=False)
crop_df.to_csv(   os.path.join(PROCESSED_DIR, "cleaned_crop.csv"),       index=False)

log("\n[OK] Cleaned datasets saved to processed_data/")

# Save report
with open(os.path.join(REPORTS_DIR, "data_cleaning_report.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(report_lines))
log("Report saved: reports/data_cleaning_report.txt")
