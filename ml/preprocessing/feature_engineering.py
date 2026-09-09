"""
Feature Engineering Module - AI Irrigation Management System
=============================================================
Steps performed:
  1. Encode categorical variables (Label + One-Hot)
  2. Detect and handle outliers (IQR method)
  3. Scale numerical features (StandardScaler / MinMaxScaler)
  4. Feature selection (correlation matrix, drop redundant)
  5. Train/test split (80/20)
  6. Save X_train, X_test, y_train, y_test, cleaned_dataset.csv

Run: python feature_engineering.py
"""

import pandas as pd
import numpy as np
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import LabelEncoder, StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
import joblib

# -- Paths ------------------------------------------------------
BASE_DIR      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DIR = os.path.join(BASE_DIR, "processed_data")
VIZ_DIR       = os.path.join(BASE_DIR, "visualizations")
REPORTS_DIR   = os.path.join(BASE_DIR, "reports")
os.makedirs(VIZ_DIR, exist_ok=True)

report_lines = []
def log(msg=""):
    print(msg)
    report_lines.append(str(msg))

# -- Load cleaned dataset ---------------------------------------
log("=" * 65)
log("LOADING CLEANED IRRIGATION DATASET")
log("=" * 65)
df = pd.read_csv(os.path.join(PROCESSED_DIR, "cleaned_irrigation.csv"))
log(f"Shape: {df.shape}")

# ===============================================================
# STEP 5: CATEGORICAL ENCODING
# ===============================================================
log("\n" + "=" * 65)
log("STEP 5: CATEGORICAL ENCODING")
log("=" * 65)

# -- 5a. Label Encoding for ORDINAL variables ------------------
#   growth_stage has a natural order: Seedling → Maturity
GROWTH_ORDER = {
    "Seedling": 0, "Vegetative": 1, "Flowering": 2,
    "Fruiting": 3, "Maturity": 4, "Harvesting": 5
}
df["growth_stage_enc"] = df["growth_stage"].map(GROWTH_ORDER)
df = df.drop(columns=["growth_stage"])
log("\n  Label Encoding (Ordinal):")
log("  'growth_stage' → 'growth_stage_enc'")
log("  Reason: Natural order exists (Seedling < Vegetative < ... < Maturity)")
log(f"  Mapping: {GROWTH_ORDER}")

# -- 5b. One-Hot Encoding for NOMINAL variables ----------------
nominal_cols = ["soil_type", "crop_type", "season", "region", "irrigation_method"]
log("\n  One-Hot Encoding (Nominal):")
log("  Columns: " + str(nominal_cols))
log("  Reason: No inherent order — OHE avoids false ordinal relationships")

df = pd.get_dummies(df, columns=nominal_cols, drop_first=True)
log(f"  Shape after encoding: {df.shape}")


# ===============================================================
# STEP 6: OUTLIER DETECTION AND TREATMENT
# ===============================================================
log("\n" + "=" * 65)
log("STEP 6: OUTLIER DETECTION AND TREATMENT (IQR Method)")
log("=" * 65)

TARGET = "irrigation_needed"
num_features = df.select_dtypes(include=np.number).columns.tolist()
num_features = [c for c in num_features if c != TARGET and df[c].nunique() > 5]

# Save boxplots BEFORE treatment
log("\n  Saving boxplots (before outlier treatment)...")
fig, axes = plt.subplots(3, 3, figsize=(16, 12))
fig.suptitle("Boxplots — Before Outlier Treatment", fontsize=14, fontweight="bold")
for i, col in enumerate(num_features[:9]):
    r, c = divmod(i, 3)
    axes[r][c].boxplot(df[col].dropna(), vert=True, patch_artist=True,
                       boxprops=dict(facecolor="#90EE90"))
    axes[r][c].set_title(col, fontsize=9)
    axes[r][c].set_xlabel("")
plt.tight_layout()
plt.savefig(os.path.join(VIZ_DIR, "boxplots_before.png"), dpi=120, bbox_inches="tight")
plt.close()
log("  Saved: visualizations/boxplots_before.png")

# IQR capping (Winsorizing) — better than removal to preserve data
outlier_summary = []
for col in num_features:
    Q1  = df[col].quantile(0.25)
    Q3  = df[col].quantile(0.75)
    IQR = Q3 - Q1
    lower = Q1 - 1.5 * IQR
    upper = Q3 + 1.5 * IQR
    n_lower = (df[col] < lower).sum()
    n_upper = (df[col] > upper).sum()
    total   = n_lower + n_upper
    if total > 0:
        df[col] = df[col].clip(lower=lower, upper=upper)
        outlier_summary.append((col, n_lower, n_upper, total, lower, upper))
        log(f"  {col:<30} outliers: {total:>4}  (capped to [{lower:.2f}, {upper:.2f}])")

log(f"\n  Decision: CAPPING (Winsorizing) chosen over removal")
log("  Reason: Preserves dataset size; agricultural data can have real extreme values")

# Boxplots AFTER treatment
fig, axes = plt.subplots(3, 3, figsize=(16, 12))
fig.suptitle("Boxplots — After Outlier Treatment (IQR Capping)", fontsize=14, fontweight="bold")
for i, col in enumerate(num_features[:9]):
    r, c = divmod(i, 3)
    axes[r][c].boxplot(df[col].dropna(), vert=True, patch_artist=True,
                       boxprops=dict(facecolor="#87CEEB"))
    axes[r][c].set_title(col, fontsize=9)
plt.tight_layout()
plt.savefig(os.path.join(VIZ_DIR, "boxplots_after.png"), dpi=120, bbox_inches="tight")
plt.close()
log("  Saved: visualizations/boxplots_after.png")


# ===============================================================
# STEP 7: FEATURE SCALING
# ===============================================================
log("\n" + "=" * 65)
log("STEP 7: FEATURE SCALING")
log("=" * 65)

# Separate target
X = df.drop(columns=[TARGET])
y = df[TARGET]

# Only scale continuous numeric features (not binary OHE columns)
scale_cols = [c for c in X.select_dtypes(include=np.number).columns
              if X[c].nunique() > 2]

log(f"\n  Columns to scale ({len(scale_cols)}): {scale_cols[:6]} ...")
log("\n  Scaler choices:")
log("  → StandardScaler : for soil_moisture, temperature, humidity, pH,")
log("    evapotranspiration — Gaussian-like distributions, used with SVM/logistic")
log("  → MinMaxScaler   : for rainfall, wind_speed — skewed distributions,")
log("    bounded [0,1] range needed for neural networks")

# Use StandardScaler for most features
std_scaler = StandardScaler()
mm_scaler  = MinMaxScaler()

std_cols = [c for c in scale_cols if c in [
    "soil_moisture_pct", "temperature_c", "humidity_pct",
    "soil_ph", "nitrogen_ppm", "phosphorus_ppm",
    "potassium_ppm", "evapotranspiration", "growth_stage_enc"
]]
mm_cols = [c for c in scale_cols if c in ["rainfall_mm", "wind_speed_kmh"]]
remaining_scale_cols = [c for c in scale_cols if c not in std_cols + mm_cols]

X[std_cols] = std_scaler.fit_transform(X[std_cols])
X[mm_cols]  = mm_scaler.fit_transform(X[mm_cols])
if remaining_scale_cols:
    X[remaining_scale_cols] = std_scaler.fit_transform(X[remaining_scale_cols])

log(f"\n  StandardScaler applied to: {std_cols}")
log(f"  MinMaxScaler applied to  : {mm_cols}")


# ===============================================================
# STEP 8: FEATURE SELECTION
# ===============================================================
log("\n" + "=" * 65)
log("STEP 8: FEATURE SELECTION")
log("=" * 65)

# Correlation matrix on numeric features
numeric_X = X.select_dtypes(include=np.number)
corr_matrix = numeric_X.corr().abs()

# Correlation with target
target_corr = numeric_X.corrwith(y).abs().sort_values(ascending=False)
log("\n  Top features correlated with target (irrigation_needed):")
for col, val in target_corr.head(10).items():
    log(f"    {col:<35} {val:.4f}")

# Find highly correlated feature pairs (>0.90 → drop one)
upper_tri = corr_matrix.where(
    np.triu(np.ones(corr_matrix.shape), k=1).astype(bool)
)
high_corr_pairs = [
    (col, row, upper_tri.loc[row, col])
    for col in upper_tri.columns
    for row in upper_tri.index
    if upper_tri.loc[row, col] > 0.90
]
if high_corr_pairs:
    log(f"\n  Highly correlated pairs (>0.90) — dropping one from each:")
    cols_to_drop = set()
    for c1, c2, val in high_corr_pairs:
        log(f"    {c1} ↔ {c2} = {val:.3f}  → dropping {c2}")
        cols_to_drop.add(c2)
    X = X.drop(columns=list(cols_to_drop))
    log(f"  Dropped {len(cols_to_drop)} redundant columns")
else:
    log("  No feature pairs with correlation > 0.90 found [OK]")

log(f"\n  Final feature count: {X.shape[1]}")

# Save correlation heatmap (top 15 numeric features only for readability)
top_features = target_corr.head(15).index.tolist()
top_features = [f for f in top_features if f in numeric_X.columns]
if len(top_features) >= 2:
    plt.figure(figsize=(12, 10))
    sns.heatmap(
        numeric_X[top_features].corr(),
        annot=True, fmt=".2f", cmap="RdYlGn",
        linewidths=0.5, square=True
    )
    plt.title("Correlation Heatmap — Top Numeric Features", fontsize=13, fontweight="bold")
    plt.tight_layout()
    plt.savefig(os.path.join(VIZ_DIR, "correlation_heatmap.png"), dpi=120, bbox_inches="tight")
    plt.close()
    log("  Saved: visualizations/correlation_heatmap.png")


# ===============================================================
# STEP 9: TRAIN / TEST SPLIT
# ===============================================================
log("\n" + "=" * 65)
log("STEP 9: TRAIN / TEST SPLIT  (80% / 20%,  random_state=42)")
log("=" * 65)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y
)

log(f"\n  X_train : {X_train.shape}")
log(f"  X_test  : {X_test.shape}")
log(f"  y_train : {y_train.shape}  class balance: {y_train.value_counts().to_dict()}")
log(f"  y_test  : {y_test.shape}   class balance: {y_test.value_counts().to_dict()}")
log("\n  stratify=y used → ensures same class distribution in both splits")


# ===============================================================
# STEP 10: SAVE OUTPUTS
# ===============================================================
log("\n" + "=" * 65)
log("STEP 10: SAVING ALL OUTPUTS")
log("=" * 65)

# Reconstruct cleaned_dataset.csv (features + target)
cleaned_final = X.copy()
cleaned_final[TARGET] = y.values
cleaned_final.to_csv(os.path.join(PROCESSED_DIR, "cleaned_dataset.csv"), index=False)

X_train.to_csv(os.path.join(PROCESSED_DIR, "X_train.csv"), index=False)
X_test.to_csv( os.path.join(PROCESSED_DIR, "X_test.csv"),  index=False)
y_train.to_csv(os.path.join(PROCESSED_DIR, "y_train.csv"), index=False, header=True)
y_test.to_csv( os.path.join(PROCESSED_DIR, "y_test.csv"),  index=False, header=True)

# Save scalers as preprocessing pipeline
pipeline = {"std_scaler": std_scaler, "mm_scaler": mm_scaler,
            "std_cols": std_cols, "mm_cols": mm_cols}
joblib.dump(pipeline, os.path.join(PROCESSED_DIR, "preprocessing_pipeline.pkl"))

log(f"  [OK] cleaned_dataset.csv   → {cleaned_final.shape}")
log(f"  [OK] X_train.csv           → {X_train.shape}")
log(f"  [OK] X_test.csv            → {X_test.shape}")
log(f"  [OK] y_train.csv           → {y_train.shape}")
log(f"  [OK] y_test.csv            → {y_test.shape}")
log(f"  [OK] preprocessing_pipeline.pkl saved")

# Save report
with open(os.path.join(REPORTS_DIR, "feature_engineering_report.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(report_lines))
log("\n📄 Report saved: reports/feature_engineering_report.txt")
log("\n[OK] Feature engineering complete. Ready for Phase 3 ML modelling.")
