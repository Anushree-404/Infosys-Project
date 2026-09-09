"""
Kaggle Dataset Preprocessing - IrriSmart Phase 3
=================================================
Processes real Kaggle datasets:
  1. irrigation_prediction.csv     (10,000 rows) → main irrigation model
  2. Crop_recommendation.csv       (2,200 rows)  → crop recommendation
  3. Crop_recommendationV2.csv     (2,200 rows)  → enhanced crop model
  4. plant_vase1.CSV               (4,117 rows)  → time-series soil moisture
  5. crop_fertilizer_...csv        (2,200 rows)  → fertilizer model

Run: python preprocessing/kaggle_preprocessing.py
"""

import pandas as pd
import numpy as np
import os
import warnings
warnings.filterwarnings("ignore")

from sklearn.preprocessing import LabelEncoder, StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
import joblib

BASE_DIR      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KAGGLE_DIR    = os.path.join(BASE_DIR, "dataset", "kaggle")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed_data")
REPORTS_DIR   = os.path.join(BASE_DIR, "reports")
os.makedirs(PROCESSED_DIR, exist_ok=True)

report = []
def log(msg=""):
    print(msg)
    report.append(str(msg))

log("=" * 60)
log("KAGGLE DATASET PREPROCESSING")
log("=" * 60)


# ══════════════════════════════════════════════════════════════
# DATASET 1: irrigation_prediction.csv
# ══════════════════════════════════════════════════════════════
log("\n[1] irrigation_prediction.csv")
irr = pd.read_csv(os.path.join(KAGGLE_DIR, "irrigation_prediction.csv"))
log(f"    Shape: {irr.shape}")
log(f"    Target: Irrigation_Need")
log(f"    Target values: {irr['Irrigation_Need'].value_counts().to_dict()}")
log(f"    Missing: {irr.isnull().sum().sum()}")

# Clean
irr = irr.drop_duplicates()
log(f"    After dedup: {irr.shape[0]} rows")

# Handle missing values
for col in irr.select_dtypes(include=np.number).columns:
    if irr[col].isnull().sum() > 0:
        irr[col] = irr[col].fillna(irr[col].median())

# Encode target — handle Low/Medium/High OR Yes/No OR 0/1
irrigation_col = irr["Irrigation_Need"].str.strip().str.lower()
unique_vals = irrigation_col.unique()
log(f"    Unique target values: {unique_vals}")

if set(unique_vals).issubset({"yes","no","true","false","1","0"}):
    # Binary: yes/no
    irr["target"] = (irrigation_col.isin(["yes","true","1"])).astype(int)
else:
    # Multi-level: Low=0, Medium=1, High=2 → convert to binary (Medium+High = irrigate)
    level_map = {"low": 0, "medium": 1, "high": 2}
    irr["target"] = irrigation_col.map(level_map).fillna(0).astype(int)
    # Also create binary version: Low=0 (no irrigation), Medium+High=1 (irrigate)
    irr["target_binary"] = (irr["target"] >= 1).astype(int)
    log(f"    Multi-level distribution: {irr['target'].value_counts().to_dict()}")
    log(f"    Binary distribution (Medium+High=1): {irr['target_binary'].value_counts().to_dict()}")
    irr["target"] = irr["target_binary"]  # use binary for main model
log(f"    Final target balance: {irr['target'].value_counts().to_dict()}")

# Encode categorical features
cat_cols = irr.select_dtypes(include="object").columns.tolist()
cat_cols = [c for c in cat_cols if c != "Irrigation_Need"]
log(f"    Categorical cols to encode: {cat_cols}")

irr_encoded = pd.get_dummies(irr.drop(columns=["Irrigation_Need"]),
                              columns=cat_cols, drop_first=True)

# Feature / target split — drop target_binary if present
drop_cols = ["target", "target_binary", "Irrigation_Need"]
X_irr = irr_encoded.drop(columns=[c for c in drop_cols if c in irr_encoded.columns])
y_irr = irr_encoded["target"]

# Scale numeric
num_cols = X_irr.select_dtypes(include=np.number).columns.tolist()
scaler = StandardScaler()
X_irr[num_cols] = scaler.fit_transform(X_irr[num_cols])

# Split
X_train_irr, X_test_irr, y_train_irr, y_test_irr = train_test_split(
    X_irr, y_irr, test_size=0.2, random_state=42, stratify=y_irr
)

log(f"    X_train: {X_train_irr.shape}  X_test: {X_test_irr.shape}")
log(f"    Features ({len(X_irr.columns)}): {list(X_irr.columns)}")

# Save
X_train_irr.to_csv(os.path.join(PROCESSED_DIR, "kaggle_irr_X_train.csv"), index=False)
X_test_irr.to_csv( os.path.join(PROCESSED_DIR, "kaggle_irr_X_test.csv"),  index=False)
y_train_irr.to_csv(os.path.join(PROCESSED_DIR, "kaggle_irr_y_train.csv"), index=False)
y_test_irr.to_csv( os.path.join(PROCESSED_DIR, "kaggle_irr_y_test.csv"),  index=False)
joblib.dump({"scaler": scaler, "feature_cols": list(X_irr.columns)},
            os.path.join(PROCESSED_DIR, "kaggle_irr_pipeline.pkl"))
log("    [OK] Saved kaggle_irr_X_train/test, y_train/test, pipeline")


# ══════════════════════════════════════════════════════════════
# DATASET 2: Crop_recommendation.csv
# ══════════════════════════════════════════════════════════════
log("\n[2] Crop_recommendation.csv")
crop = pd.read_csv(os.path.join(KAGGLE_DIR, "Crop_recommendation.csv"))
log(f"    Shape: {crop.shape}")
log(f"    Target: label")
log(f"    Crops: {crop['label'].nunique()} unique — {sorted(crop['label'].unique())}")
log(f"    Missing: {crop.isnull().sum().sum()}")

le_crop = LabelEncoder()
crop["crop_enc"] = le_crop.fit_transform(crop["label"])
X_crop = crop.drop(columns=["label","crop_enc"])
y_crop = crop["crop_enc"]

scaler_crop = StandardScaler()
X_crop_scaled = pd.DataFrame(scaler_crop.fit_transform(X_crop), columns=X_crop.columns)

X_train_crop, X_test_crop, y_train_crop, y_test_crop = train_test_split(
    X_crop_scaled, y_crop, test_size=0.2, random_state=42, stratify=y_crop
)
log(f"    X_train: {X_train_crop.shape}  Classes: {y_crop.nunique()}")

X_train_crop.to_csv(os.path.join(PROCESSED_DIR, "kaggle_crop_X_train.csv"), index=False)
X_test_crop.to_csv( os.path.join(PROCESSED_DIR, "kaggle_crop_X_test.csv"),  index=False)
y_train_crop.to_csv(os.path.join(PROCESSED_DIR, "kaggle_crop_y_train.csv"), index=False)
y_test_crop.to_csv( os.path.join(PROCESSED_DIR, "kaggle_crop_y_test.csv"),  index=False)
joblib.dump({"scaler": scaler_crop, "label_encoder": le_crop, "feature_cols": list(X_crop.columns)},
            os.path.join(PROCESSED_DIR, "kaggle_crop_pipeline.pkl"))
log("    [OK] Saved crop recommendation processed data")


# ══════════════════════════════════════════════════════════════
# DATASET 3: plant_vase1.CSV (time-series soil moisture)
# ══════════════════════════════════════════════════════════════
log("\n[3] plant_vase1.CSV (time-series sensor data)")
plant = pd.read_csv(os.path.join(KAGGLE_DIR, "plant_vase1.CSV"))
log(f"    Shape: {plant.shape}")
log(f"    Columns: {list(plant.columns)}")
log(f"    Target: irrgation")
log(f"    Target values: {plant['irrgation'].value_counts().to_dict()}")

plant = plant.dropna()
plant["hour_sin"] = np.sin(2 * np.pi * plant["hour"] / 24)
plant["hour_cos"] = np.cos(2 * np.pi * plant["hour"] / 24)

moisture_cols = [c for c in plant.columns if "moisture" in c.lower()]
feature_cols  = moisture_cols + ["hour_sin", "hour_cos"]
X_plant = plant[feature_cols]
y_plant = plant["irrgation"].astype(int)

log(f"    Features: {feature_cols}")
log(f"    Target balance: {y_plant.value_counts().to_dict()}")

scaler_plant = MinMaxScaler()
X_plant_scaled = pd.DataFrame(scaler_plant.fit_transform(X_plant), columns=X_plant.columns)

X_train_plant, X_test_plant, y_train_plant, y_test_plant = train_test_split(
    X_plant_scaled, y_plant, test_size=0.2, random_state=42, stratify=y_plant
)
log(f"    X_train: {X_train_plant.shape}")

X_train_plant.to_csv(os.path.join(PROCESSED_DIR, "kaggle_plant_X_train.csv"), index=False)
X_test_plant.to_csv( os.path.join(PROCESSED_DIR, "kaggle_plant_X_test.csv"),  index=False)
y_train_plant.to_csv(os.path.join(PROCESSED_DIR, "kaggle_plant_y_train.csv"), index=False)
y_test_plant.to_csv( os.path.join(PROCESSED_DIR, "kaggle_plant_y_test.csv"),  index=False)
joblib.dump({"scaler": scaler_plant, "feature_cols": feature_cols},
            os.path.join(PROCESSED_DIR, "kaggle_plant_pipeline.pkl"))
log("    [OK] Saved plant time-series processed data")


# ══════════════════════════════════════════════════════════════
# Summary
# ══════════════════════════════════════════════════════════════
log("\n" + "=" * 60)
log("PREPROCESSING SUMMARY")
log("=" * 60)
log(f"  irrigation_prediction.csv : {X_train_irr.shape[0]} train | {X_test_irr.shape[0]} test | {X_irr.shape[1]} features")
log(f"  Crop_recommendation.csv   : {X_train_crop.shape[0]} train | {X_test_crop.shape[0]} test | {X_crop.shape[1]} features")
log(f"  plant_vase1.CSV           : {X_train_plant.shape[0]} train | {X_test_plant.shape[0]} test | {len(feature_cols)} features")

with open(os.path.join(REPORTS_DIR, "kaggle_preprocessing_report.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(report))

log("\n[OK] Kaggle preprocessing complete. Run kaggle_train.py next.")
