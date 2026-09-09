"""
Preprocessing Pipeline - AI Irrigation Management System
=========================================================
Master script that runs the complete preprocessing pipeline
in the correct order:

  Step 1: Generate datasets
  Step 2: Data cleaning
  Step 3: Feature engineering + encoding + scaling + split
  Step 4: Visualizations
  Step 5: Generate final preprocessing report

Run: python preprocessing_pipeline.py
"""

import os
import sys
import subprocess
import time

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR  = os.path.join(BASE_DIR, "dataset")
PREPROC_DIR  = os.path.join(BASE_DIR, "preprocessing")
REPORTS_DIR  = os.path.join(BASE_DIR, "reports")
PROCESSED_DIR= os.path.join(BASE_DIR, "processed_data")
os.makedirs(REPORTS_DIR, exist_ok=True)

def run_script(script_path, label):
    print(f"\n{'='*60}")
    print(f"  ▶ {label}")
    print(f"{'='*60}")
    start = time.time()
    result = subprocess.run(
        [sys.executable, script_path],
        capture_output=False, text=True
    )
    elapsed = time.time() - start
    if result.returncode != 0:
        print(f"\n  [FAIL] Failed: {label}")
        sys.exit(1)
    print(f"\n  [OK] Completed in {elapsed:.1f}s")

print("""
+==============================================================+
║   AI Irrigation Management System — Data Preprocessing       ║
║   Phase 2: Preprocessing Pipeline                            ║
+==============================================================+
""")

# Step 1: Generate datasets
run_script(os.path.join(DATASET_DIR, "generate_dataset.py"),
           "STEP 1: Generating Datasets")

# Step 2: Data cleaning
run_script(os.path.join(PREPROC_DIR, "data_cleaning.py"),
           "STEP 2: Data Cleaning")

# Step 3: Feature engineering
run_script(os.path.join(PREPROC_DIR, "feature_engineering.py"),
           "STEP 3: Feature Engineering (Encoding + Scaling + Split)")

# Step 4: Visualizations
run_script(os.path.join(PREPROC_DIR, "visualizations.py"),
           "STEP 4: Generating Visualizations")

# Step 5: Generate final summary report
print(f"\n{'='*60}")
print("  ▶ STEP 5: Generating Final Preprocessing Report")
print(f"{'='*60}")

report_parts = []
for fname in ["data_cleaning_report.txt", "feature_engineering_report.txt"]:
    fpath = os.path.join(REPORTS_DIR, fname)
    if os.path.exists(fpath):
        with open(fpath, encoding="utf-8") as f:
            report_parts.append(f"{'='*65}\n{fname.upper()}\n{'='*65}\n" + f.read())

# Check outputs
outputs = [
    "cleaned_dataset.csv", "X_train.csv", "X_test.csv",
    "y_train.csv", "y_test.csv", "preprocessing_pipeline.pkl"
]
output_status = []
for fname in outputs:
    path = os.path.join(PROCESSED_DIR, fname)
    exists = os.path.exists(path)
    size = os.path.getsize(path) if exists else 0
    output_status.append(
        f"  {'[OK]' if exists else '[FAIL]'} {fname:<35} {size:>10,} bytes"
    )

final_report = f"""
+==============================================================+
║         PREPROCESSING PIPELINE — FINAL REPORT               ║
+==============================================================+

PROJECT : AI-Based Irrigation Management System
PHASE   : Data Preprocessing (Phase 2)
DATE    : {time.strftime('%Y-%m-%d %H:%M:%S')}

DATASETS USED
-------------
1. irrigation_data.csv      — Main dataset with 5200+ records (with intentional
                               quality issues for preprocessing exercise)
2. soil_data.csv             — Soil properties (1000 samples)
3. weather_data.csv          — 4 years daily weather (1460 records)
4. crop_water_requirement.csv — Crop-specific water needs (150 records)

PREPROCESSING STEPS COMPLETED
------------------------------
[OK] Step 1: Dataset loading and structure analysis
[OK] Step 2: Feature purpose documentation
[OK] Step 3: Data quality checks (missing, duplicates, invalid values)
[OK] Step 4: Data cleaning
   • Removed ~200 duplicate rows
   • Replaced impossible values (rainfall < 0, temp > 80°C, pH < 0)
   • Imputed numeric NaN -> median (robust to outliers)
   • Imputed categorical NaN -> mode
   • Converted date column -> month + day_of_year features
   • Standardized text formatting
[OK] Step 5: Categorical encoding
   • Label Encoding: growth_stage (ordinal, natural order)
   • One-Hot Encoding: soil_type, crop_type, season, region, irrigation_method
[OK] Step 6: Outlier treatment (IQR Capping / Winsorizing)
   • Method: Cap to [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
   • Decision: Capping over removal to preserve dataset size
[OK] Step 7: Feature scaling
   • StandardScaler: soil_moisture, temperature, humidity, pH, NPK, ET
   • MinMaxScaler: rainfall, wind_speed
[OK] Step 8: Feature selection
   • Correlation matrix computed
   • Redundant features (>0.90 correlation) removed
[OK] Step 9: Train/Test split — 80/20, stratified, random_state=42
[OK] Step 10: All outputs saved

OUTPUT FILES
------------
{chr(10).join(output_status)}

VISUALIZATIONS GENERATED
-------------------------
  📊 missing_value_heatmap.png
  📊 missing_value_bar.png
  📊 feature_distributions.png
  📊 class_distribution.png
  📊 categorical_distributions.png
  📊 correlation_heatmap.png
  📊 boxplots_before.png
  📊 boxplots_after.png
  📊 soil_moisture_analysis.png

READY FOR PHASE 3
------------------
The cleaned, encoded, scaled, and split dataset is ready for:
  -> Random Forest Classifier
  -> Gradient Boosting (XGBoost/LightGBM)
  -> LSTM (time-series sensor readings)
  -> FastAPI ML service integration

preprocessing_pipeline.pkl can be loaded to transform
new incoming sensor data before prediction:

  import joblib
  pipeline = joblib.load("processed_data/preprocessing_pipeline.pkl")
  X_new_scaled = pipeline["std_scaler"].transform(X_new[pipeline["std_cols"]])
"""

full_report = final_report + "\n\nDETAILED LOGS\n" + "-"*65 + "\n\n" + "\n\n".join(report_parts)
report_path = os.path.join(REPORTS_DIR, "preprocessing_report.txt")
with open(report_path, "w", encoding="utf-8") as f:
    f.write(full_report)

print(final_report)
print(f"\n📄 Full report saved: {report_path}")
print("\n🎉 Preprocessing pipeline complete!")
