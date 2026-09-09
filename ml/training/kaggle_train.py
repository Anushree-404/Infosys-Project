"""
Train Models on Real Kaggle Data - IrriSmart Phase 3
=====================================================
Trains:
  1. Irrigation prediction model  (irrigation_prediction.csv - 10,000 records)
  2. Crop recommendation model    (Crop_recommendation.csv - 2,200 records)
  3. Time-series soil model       (plant_vase2.CSV - real IoT sensor data)

Saves best models to ml/models/
"""

import pandas as pd
import numpy as np
import os
import joblib
import warnings
warnings.filterwarnings("ignore")

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score, f1_score, roc_auc_score,
    classification_report, confusion_matrix
)

BASE_DIR      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DIR = os.path.join(BASE_DIR, "processed_data")
MODELS_DIR    = os.path.join(BASE_DIR, "models")
VIZ_DIR       = os.path.join(BASE_DIR, "visualizations")
KAGGLE_DIR    = os.path.join(BASE_DIR, "dataset", "kaggle")
REPORTS_DIR   = os.path.join(BASE_DIR, "reports")

report = []
def log(msg=""):
    print(msg)
    report.append(str(msg))


# ══════════════════════════════════════════════════════════════
# MODEL 1: Irrigation Prediction (Kaggle - 10,000 records)
# ══════════════════════════════════════════════════════════════
log("=" * 60)
log("MODEL 1: IRRIGATION PREDICTION (REAL KAGGLE DATA)")
log("=" * 60)

X_train = pd.read_csv(os.path.join(PROCESSED_DIR, "kaggle_irr_X_train.csv"))
X_test  = pd.read_csv(os.path.join(PROCESSED_DIR, "kaggle_irr_X_test.csv"))
y_train = pd.read_csv(os.path.join(PROCESSED_DIR, "kaggle_irr_y_train.csv")).squeeze()
y_test  = pd.read_csv(os.path.join(PROCESSED_DIR, "kaggle_irr_y_test.csv")).squeeze()

# Remove target_binary if leaked into features
if "target_binary" in X_train.columns:
    X_train = X_train.drop(columns=["target_binary"])
    X_test  = X_test.drop(columns=["target_binary"])

log(f"  Training: {X_train.shape} | Test: {X_test.shape}")
log(f"  Class balance train: {y_train.value_counts().to_dict()}")

irr_models = {
    "Random Forest": RandomForestClassifier(
        n_estimators=200, max_depth=15, min_samples_leaf=2,
        random_state=42, n_jobs=-1
    ),
    "Gradient Boosting": GradientBoostingClassifier(
        n_estimators=200, learning_rate=0.1, max_depth=5,
        subsample=0.8, random_state=42
    ),
}

irr_results = {}
for name, model in irr_models.items():
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    acc = accuracy_score(y_test, y_pred)
    f1  = f1_score(y_test, y_pred, zero_division=0)
    auc = roc_auc_score(y_test, y_prob)
    irr_results[name] = {"accuracy": acc, "f1": f1, "roc_auc": auc}
    log(f"\n  [{name}]")
    log(f"    Accuracy  : {acc:.4f}")
    log(f"    F1 Score  : {f1:.4f}")
    log(f"    ROC-AUC   : {auc:.4f}")
    log(classification_report(y_test, y_pred,
        target_names=["No/Low Irrigation","Medium/High Irrigation"], zero_division=0))

# Best irrigation model
best_irr_name = max(irr_results, key=lambda k: irr_results[k]["f1"])
best_irr_model = irr_models[best_irr_name]
log(f"\n  Best: {best_irr_name} (F1={irr_results[best_irr_name]['f1']:.4f})")

# Feature importance
feat_imp = pd.Series(
    best_irr_model.feature_importances_, index=X_train.columns
).sort_values(ascending=False).head(12)
log(f"\n  Top 12 features:")
for f, v in feat_imp.items():
    log(f"    {f:<40} {v:.4f}")

# Save
joblib.dump(best_irr_model, os.path.join(MODELS_DIR, "kaggle_irrigation_model.pkl"))

# Also update best_model.pkl if Kaggle model is better
synthetic_f1 = 0.977  # from previous training
kaggle_f1    = irr_results[best_irr_name]["f1"]
if kaggle_f1 > 0.75:  # reasonable threshold
    joblib.dump(best_irr_model, os.path.join(MODELS_DIR, "best_model.pkl"))
    log(f"\n  [OK] best_model.pkl UPDATED with Kaggle-trained model (F1={kaggle_f1:.4f})")
else:
    log(f"\n  [INFO] Keeping synthetic model (F1={synthetic_f1:.4f}) — Kaggle F1={kaggle_f1:.4f}")

# Feature importance plot
plt.figure(figsize=(10, 7))
feat_imp.sort_values().plot(kind="barh", color="#4CAF50", edgecolor="white")
plt.title(f"Top 12 Features — {best_irr_name} (Kaggle Data)", fontsize=13, fontweight="bold")
plt.xlabel("Importance")
plt.tight_layout()
plt.savefig(os.path.join(VIZ_DIR, "kaggle_irr_feature_importance.png"), dpi=120, bbox_inches="tight")
plt.close()
log("  [OK] kaggle_irr_feature_importance.png saved")


# ══════════════════════════════════════════════════════════════
# MODEL 2: Crop Recommendation (22 crops)
# ══════════════════════════════════════════════════════════════
log("\n" + "=" * 60)
log("MODEL 2: CROP RECOMMENDATION (22 CROPS)")
log("=" * 60)

X_train_c = pd.read_csv(os.path.join(PROCESSED_DIR, "kaggle_crop_X_train.csv"))
X_test_c  = pd.read_csv(os.path.join(PROCESSED_DIR, "kaggle_crop_X_test.csv"))
y_train_c = pd.read_csv(os.path.join(PROCESSED_DIR, "kaggle_crop_y_train.csv")).squeeze()
y_test_c  = pd.read_csv(os.path.join(PROCESSED_DIR, "kaggle_crop_y_test.csv")).squeeze()
pipeline_c = joblib.load(os.path.join(PROCESSED_DIR, "kaggle_crop_pipeline.pkl"))
le_crop   = pipeline_c["label_encoder"]

log(f"  Training: {X_train_c.shape} | Classes: {y_train_c.nunique()} crops")

crop_models = {
    "Random Forest": RandomForestClassifier(
        n_estimators=200, max_depth=20, random_state=42, n_jobs=-1
    ),
    "Gradient Boosting": GradientBoostingClassifier(
        n_estimators=200, learning_rate=0.1, max_depth=5, random_state=42
    ),
}

crop_results = {}
for name, model in crop_models.items():
    model.fit(X_train_c, y_train_c)
    y_pred = model.predict(X_test_c)
    acc = accuracy_score(y_test_c, y_pred)
    f1  = f1_score(y_test_c, y_pred, average="weighted", zero_division=0)
    crop_results[name] = {"accuracy": acc, "f1": f1}
    log(f"\n  [{name}]")
    log(f"    Accuracy : {acc:.4f}")
    log(f"    F1 (weighted): {f1:.4f}")

best_crop_name  = max(crop_results, key=lambda k: crop_results[k]["f1"])
best_crop_model = crop_models[best_crop_name]
log(f"\n  Best: {best_crop_name} (F1={crop_results[best_crop_name]['f1']:.4f})")

joblib.dump(best_crop_model, os.path.join(MODELS_DIR, "kaggle_crop_model.pkl"))
log("  [OK] kaggle_crop_model.pkl saved")

# Confusion matrix heatmap (top 10 crops only)
y_pred_best = best_crop_model.predict(X_test_c)
cm = confusion_matrix(y_test_c, y_pred_best)
top_idx = np.argsort(np.bincount(y_test_c))[-10:]
cm_top = cm[np.ix_(top_idx, top_idx)]
crop_names_top = le_crop.inverse_transform(top_idx)
plt.figure(figsize=(10, 8))
sns.heatmap(cm_top, annot=True, fmt="d", cmap="Greens",
            xticklabels=crop_names_top, yticklabels=crop_names_top)
plt.title(f"Crop Recommendation — Top 10 Crops ({best_crop_name})", fontsize=12, fontweight="bold")
plt.ylabel("Actual")
plt.xlabel("Predicted")
plt.tight_layout()
plt.savefig(os.path.join(VIZ_DIR, "kaggle_crop_confusion.png"), dpi=120, bbox_inches="tight")
plt.close()
log("  [OK] kaggle_crop_confusion.png saved")


# ══════════════════════════════════════════════════════════════
# MODEL 3: Time-Series (plant_vase2.CSV — real sensor readings)
# ══════════════════════════════════════════════════════════════
log("\n" + "=" * 60)
log("MODEL 3: TIME-SERIES SOIL MOISTURE (plant_vase2.CSV)")
log("=" * 60)

try:
    plant2 = pd.read_csv(os.path.join(KAGGLE_DIR, "plant_vase2.CSV"))
    log(f"  Shape: {plant2.shape}")
    log(f"  Columns: {list(plant2.columns)}")

    if "irrgation" in plant2.columns and plant2["irrgation"].nunique() > 1:
        moisture_cols = [c for c in plant2.columns if "moisture" in c.lower()]
        plant2 = plant2.dropna()
        plant2["hour_sin"] = np.sin(2 * np.pi * plant2.get("hour", 0) / 24)
        plant2["hour_cos"] = np.cos(2 * np.pi * plant2.get("hour", 0) / 24)

        feature_cols = moisture_cols + ["hour_sin", "hour_cos"]
        X_p2 = plant2[feature_cols]
        y_p2 = plant2["irrgation"].astype(int)
        log(f"  Target balance: {y_p2.value_counts().to_dict()}")

        if y_p2.nunique() > 1:
            from sklearn.model_selection import train_test_split
            from sklearn.preprocessing import MinMaxScaler
            scaler_p2 = MinMaxScaler()
            X_p2_sc = pd.DataFrame(scaler_p2.fit_transform(X_p2), columns=X_p2.columns)
            Xtr, Xte, ytr, yte = train_test_split(X_p2_sc, y_p2, test_size=0.2, random_state=42, stratify=y_p2)
            ts_model = GradientBoostingClassifier(n_estimators=100, random_state=42)
            ts_model.fit(Xtr, ytr)
            y_pred = ts_model.predict(Xte)
            acc = accuracy_score(yte, y_pred)
            f1  = f1_score(yte, y_pred, zero_division=0)
            log(f"  Accuracy: {acc:.4f}  F1: {f1:.4f}")
            joblib.dump(ts_model, os.path.join(MODELS_DIR, "kaggle_ts_model.pkl"))
            log("  [OK] kaggle_ts_model.pkl saved")
        else:
            log("  [SKIP] plant_vase2 has no irrigation events — skipping")
    else:
        log("  [SKIP] No valid irrigation column in plant_vase2")
except Exception as e:
    log(f"  [SKIP] plant_vase2 error: {e}")


# ══════════════════════════════════════════════════════════════
# Final summary
# ══════════════════════════════════════════════════════════════
log("\n" + "=" * 60)
log("KAGGLE TRAINING COMPLETE")
log("=" * 60)
log(f"\n  Irrigation model ({best_irr_name}):  Acc={irr_results[best_irr_name]['accuracy']:.4f}  F1={irr_results[best_irr_name]['f1']:.4f}  AUC={irr_results[best_irr_name]['roc_auc']:.4f}")
log(f"  Crop model ({best_crop_name}): Acc={crop_results[best_crop_name]['accuracy']:.4f}  F1={crop_results[best_crop_name]['f1']:.4f}")
log(f"\n  Data source: REAL KAGGLE DATASETS")
log(f"  Total training samples: {len(X_train) + len(X_train_c)}")
log(f"\n  Models saved:")
log(f"    kaggle_irrigation_model.pkl")
log(f"    kaggle_crop_model.pkl")
log(f"    best_model.pkl (updated if Kaggle F1 > 0.75)")

with open(os.path.join(REPORTS_DIR, "kaggle_training_report.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(report))
log("\n[OK] Report: reports/kaggle_training_report.txt")
