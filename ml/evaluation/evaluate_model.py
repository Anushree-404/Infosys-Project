"""
Model Evaluation - AI Irrigation Management System Phase 3
==========================================================
Loads the best saved model and produces:
  - Full evaluation metrics
  - Prediction examples
  - Threshold analysis
  - Learning curves
  - Final summary report

Run: python evaluation/evaluate_model.py
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

from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
    precision_recall_curve, average_precision_score
)
from sklearn.model_selection import learning_curve

# ── Paths ──────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED   = os.path.join(BASE_DIR, "processed_data")
MODELS_DIR  = os.path.join(BASE_DIR, "models")
REPORTS_DIR = os.path.join(BASE_DIR, "reports")
VIZ_DIR     = os.path.join(BASE_DIR, "visualizations")

report = []
def log(msg=""):
    print(msg)
    report.append(str(msg))

# ── Load ───────────────────────────────────────────────────────
log("=" * 65)
log("PHASE 3: MODEL EVALUATION")
log("=" * 65)

X_train = pd.read_csv(os.path.join(PROCESSED, "X_train.csv"))
X_test  = pd.read_csv(os.path.join(PROCESSED, "X_test.csv"))
y_train = pd.read_csv(os.path.join(PROCESSED, "y_train.csv")).squeeze()
y_test  = pd.read_csv(os.path.join(PROCESSED, "y_test.csv")).squeeze()

best_model = joblib.load(os.path.join(MODELS_DIR, "best_model.pkl"))
rf_model   = joblib.load(os.path.join(MODELS_DIR, "random_forest.pkl"))
results_df = joblib.load(os.path.join(MODELS_DIR, "results_summary.pkl"))

log(f"\nBest model type: {type(best_model).__name__}")

# ── Full metrics ───────────────────────────────────────────────
log("\n" + "=" * 65)
log("DETAILED EVALUATION — BEST MODEL")
log("=" * 65)

y_pred      = best_model.predict(X_test)
y_pred_prob = best_model.predict_proba(X_test)[:, 1]

log("\n" + classification_report(y_test, y_pred,
    target_names=["No Irrigation", "Irrigation"]))

log(f"  ROC-AUC Score: {roc_auc_score(y_test, y_pred_prob):.4f}")
log(f"  Avg Precision: {average_precision_score(y_test, y_pred_prob):.4f}")

# ── Threshold analysis ─────────────────────────────────────────
log("\n" + "=" * 65)
log("THRESHOLD ANALYSIS")
log("=" * 65)
log("\n  Threshold | Precision | Recall | F1")
log("  " + "-" * 40)

best_f1_thresh = 0.5
best_f1 = 0.0
thresholds_data = []
for thresh in np.arange(0.3, 0.75, 0.05):
    y_pred_t = (y_pred_prob >= thresh).astype(int)
    p = precision_score(y_test, y_pred_t, zero_division=0)
    r = recall_score(y_test, y_pred_t, zero_division=0)
    f = f1_score(y_test, y_pred_t, zero_division=0)
    thresholds_data.append((thresh, p, r, f))
    marker = " <-- default" if abs(thresh - 0.5) < 0.001 else ""
    log(f"  {thresh:.2f}      | {p:.4f}    | {r:.4f} | {f:.4f}{marker}")
    if f > best_f1:
        best_f1 = f
        best_f1_thresh = thresh

log(f"\n  Optimal threshold for F1: {best_f1_thresh:.2f} (F1={best_f1:.4f})")

# Threshold plot
thresh_arr, prec_arr, rec_arr, f1_arr = zip(*[(t, p, r, f) for t, p, r, f in thresholds_data])
plt.figure(figsize=(9, 5))
plt.plot(thresh_arr, prec_arr, "b-o", label="Precision", linewidth=2, markersize=6)
plt.plot(thresh_arr, rec_arr,  "r-s", label="Recall",    linewidth=2, markersize=6)
plt.plot(thresh_arr, f1_arr,   "g-^", label="F1 Score",  linewidth=2, markersize=6)
plt.axvline(best_f1_thresh, color="gray", linestyle="--", alpha=0.7, label=f"Best threshold ({best_f1_thresh:.2f})")
plt.xlabel("Decision Threshold")
plt.ylabel("Score")
plt.title("Precision / Recall / F1 vs Threshold", fontsize=12, fontweight="bold")
plt.legend()
plt.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(VIZ_DIR, "threshold_analysis.png"), dpi=120, bbox_inches="tight")
plt.close()
log("  Saved: visualizations/threshold_analysis.png")

# ── Precision-Recall curve ─────────────────────────────────────
prec_curve, rec_curve, _ = precision_recall_curve(y_test, y_pred_prob)
ap = average_precision_score(y_test, y_pred_prob)

plt.figure(figsize=(8, 6))
plt.plot(rec_curve, prec_curve, color="#4CAF50", linewidth=2.5,
         label=f"Precision-Recall (AP={ap:.3f})")
plt.axhline(y_test.mean(), color="gray", linestyle="--", label="Baseline (no-skill)")
plt.xlabel("Recall")
plt.ylabel("Precision")
plt.title("Precision-Recall Curve", fontsize=12, fontweight="bold")
plt.legend()
plt.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(VIZ_DIR, "precision_recall_curve.png"), dpi=120, bbox_inches="tight")
plt.close()
log("  Saved: visualizations/precision_recall_curve.png")

# ── Learning curves ────────────────────────────────────────────
log("\n  Generating learning curves (this takes a moment)...")
train_sizes, train_scores, val_scores = learning_curve(
    rf_model, X_train, y_train,
    cv=5, scoring="f1", train_sizes=np.linspace(0.1, 1.0, 8),
    n_jobs=-1
)
train_mean = train_scores.mean(axis=1)
train_std  = train_scores.std(axis=1)
val_mean   = val_scores.mean(axis=1)
val_std    = val_scores.std(axis=1)

plt.figure(figsize=(9, 6))
plt.plot(train_sizes, train_mean, "b-o", label="Training F1", linewidth=2)
plt.fill_between(train_sizes, train_mean - train_std, train_mean + train_std, alpha=0.15, color="blue")
plt.plot(train_sizes, val_mean, "r-s", label="Validation F1", linewidth=2)
plt.fill_between(train_sizes, val_mean - val_std, val_mean + val_std, alpha=0.15, color="red")
plt.xlabel("Training Set Size")
plt.ylabel("F1 Score")
plt.title("Learning Curves — Random Forest", fontsize=12, fontweight="bold")
plt.legend()
plt.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(VIZ_DIR, "learning_curves.png"), dpi=120, bbox_inches="tight")
plt.close()
log("  Saved: visualizations/learning_curves.png")

# ── Sample predictions ─────────────────────────────────────────
log("\n" + "=" * 65)
log("SAMPLE PREDICTIONS (First 10 test records)")
log("=" * 65)
sample_preds = pd.DataFrame({
    "Actual":      y_test.values[:10],
    "Predicted":   y_pred[:10],
    "Probability": y_pred_prob[:10].round(3),
    "Correct":     (y_test.values[:10] == y_pred[:10]),
})
sample_preds["Actual"]    = sample_preds["Actual"].map({0:"No Irrigation", 1:"Irrigate"})
sample_preds["Predicted"] = sample_preds["Predicted"].map({0:"No Irrigation", 1:"Irrigate"})
sample_preds["Correct"]   = sample_preds["Correct"].map({True:"[OK]", False:"[WRONG]"})
log("\n" + sample_preds.to_string(index=False))

# ── Prediction function for production use ─────────────────────
log("\n" + "=" * 65)
log("PRODUCTION PREDICTION EXAMPLE")
log("=" * 65)
pipeline = joblib.load(os.path.join(PROCESSED, "preprocessing_pipeline.pkl"))

# Simulate a new sensor reading
sample_input = {
    "soil_moisture_pct": 22.0,   # Low soil moisture
    "temperature_c":     34.5,   # High temperature
    "humidity_pct":      45.0,
    "rainfall_mm":       1.2,
    "wind_speed_kmh":    15.0,
    "soil_ph":           6.8,
    "nitrogen_ppm":      55.0,
    "phosphorus_ppm":    60.0,
    "potassium_ppm":     95.0,
    "evapotranspiration":7.5,
}

log("\n  Input sensor reading:")
for k, v in sample_input.items():
    log(f"    {k:<30} = {v}")

# Note: In production, the full feature vector (34 features including OHE)
# would be passed. This example shows the concept.
log("\n  [Note] In production, the full 34-feature vector (including")
log("  one-hot encoded soil_type, crop_type, etc.) would be passed.")
log("  The preprocessing_pipeline.pkl handles scaling automatically.")

# ── Final summary ──────────────────────────────────────────────
log("\n" + "=" * 65)
log("PHASE 3 SUMMARY")
log("=" * 65)
log(f"""
  Best Model     : {type(best_model).__name__}
  Test Accuracy  : {accuracy_score(y_test, y_pred):.4f}
  Test F1 Score  : {f1_score(y_test, y_pred):.4f}
  ROC-AUC        : {roc_auc_score(y_test, y_pred_prob):.4f}
  Best Threshold : {best_f1_thresh:.2f}

  All model results:
""")
log(results_df[["accuracy","f1","roc_auc"]].to_string())

log("""
  PHASE 3 OUTPUTS:
  models/best_model.pkl           -> Best performing model
  models/random_forest.pkl        -> Random Forest model
  models/gradient_boosting.pkl    -> Gradient Boosting model
  models/logistic_regression.pkl  -> Logistic Regression (baseline)

  VISUALIZATIONS ADDED:
  feature_importance.png
  confusion_matrices.png
  roc_curves.png
  model_comparison.png
  threshold_analysis.png
  precision_recall_curve.png
  learning_curves.png

  READY FOR PHASE 4:
  -> FastAPI ML service (/api/predict/irrigation)
  -> Real-time predictions from sensor data
  -> Integration with IrriSmart backend
""")

with open(os.path.join(REPORTS_DIR, "evaluation_report.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(report))

log("[OK] Evaluation report saved: reports/evaluation_report.txt")
log("[OK] Phase 3 evaluation complete.")
