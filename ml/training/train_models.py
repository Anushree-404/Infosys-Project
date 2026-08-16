"""
Model Training - AI Irrigation Management System Phase 3
=========================================================
Models trained:
  1. Logistic Regression     (baseline)
  2. Random Forest           (primary model)
  3. Gradient Boosting       (XGBoost-style)
  4. Support Vector Machine  (SVM)
  5. K-Nearest Neighbors     (KNN)

Outputs:
  models/best_model.pkl
  models/random_forest.pkl
  models/gradient_boosting.pkl
  models/logistic_regression.pkl
  reports/model_training_report.txt

Run: python training/train_models.py
"""

import pandas as pd
import numpy as np
import os
import time
import joblib
import warnings
warnings.filterwarnings("ignore")

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
    roc_curve
)
from sklearn.model_selection import StratifiedKFold, cross_val_score

# ── Paths ──────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED    = os.path.join(BASE_DIR, "processed_data")
MODELS_DIR   = os.path.join(BASE_DIR, "models")
REPORTS_DIR  = os.path.join(BASE_DIR, "reports")
VIZ_DIR      = os.path.join(BASE_DIR, "visualizations")
os.makedirs(MODELS_DIR, exist_ok=True)

report = []
def log(msg=""):
    print(msg)
    report.append(str(msg))

# ── Load data ──────────────────────────────────────────────────
log("=" * 65)
log("PHASE 3: MODEL TRAINING")
log("=" * 65)

X_train = pd.read_csv(os.path.join(PROCESSED, "X_train.csv"))
X_test  = pd.read_csv(os.path.join(PROCESSED, "X_test.csv"))
y_train = pd.read_csv(os.path.join(PROCESSED, "y_train.csv")).squeeze()
y_test  = pd.read_csv(os.path.join(PROCESSED, "y_test.csv")).squeeze()

log(f"\nTraining set : {X_train.shape}")
log(f"Test set     : {X_test.shape}")
log(f"Class balance (train): {y_train.value_counts().to_dict()}")
log(f"Class balance (test) : {y_test.value_counts().to_dict()}")

# ── Define models ──────────────────────────────────────────────
models = {
    "Logistic Regression": LogisticRegression(
        max_iter=1000, random_state=42, C=1.0
    ),
    "Random Forest": RandomForestClassifier(
        n_estimators=200, max_depth=15, min_samples_split=5,
        min_samples_leaf=2, random_state=42, n_jobs=-1
    ),
    "Gradient Boosting": GradientBoostingClassifier(
        n_estimators=200, learning_rate=0.1, max_depth=5,
        subsample=0.8, random_state=42
    ),
    "SVM": SVC(
        kernel="rbf", C=1.0, gamma="scale",
        probability=True, random_state=42
    ),
    "KNN": KNeighborsClassifier(
        n_neighbors=7, metric="minkowski", weights="distance"
    ),
}

# ── Train and evaluate all models ─────────────────────────────
log("\n" + "=" * 65)
log("TRAINING ALL MODELS")
log("=" * 65)

results = {}
trained_models = {}

for name, model in models.items():
    log(f"\n  [{name}]")
    t0 = time.time()
    model.fit(X_train, y_train)
    train_time = time.time() - t0

    # Predictions
    y_pred      = model.predict(X_test)
    y_pred_prob = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else None

    # Metrics
    acc  = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec  = recall_score(y_test, y_pred, zero_division=0)
    f1   = f1_score(y_test, y_pred, zero_division=0)
    auc  = roc_auc_score(y_test, y_pred_prob) if y_pred_prob is not None else 0.0

    # 5-fold Cross-validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="f1", n_jobs=-1)

    results[name] = {
        "accuracy":  acc,
        "precision": prec,
        "recall":    rec,
        "f1":        f1,
        "roc_auc":   auc,
        "cv_f1_mean": cv_scores.mean(),
        "cv_f1_std":  cv_scores.std(),
        "train_time": train_time,
    }
    trained_models[name] = model

    log(f"    Accuracy  : {acc:.4f}")
    log(f"    Precision : {prec:.4f}")
    log(f"    Recall    : {rec:.4f}")
    log(f"    F1 Score  : {f1:.4f}")
    log(f"    ROC-AUC   : {auc:.4f}")
    log(f"    CV F1     : {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")
    log(f"    Train time: {train_time:.1f}s")

# ── Comparison table ───────────────────────────────────────────
log("\n" + "=" * 65)
log("MODEL COMPARISON")
log("=" * 65)

results_df = pd.DataFrame(results).T
results_df = results_df.sort_values("f1", ascending=False)
log("\n" + results_df[["accuracy","precision","recall","f1","roc_auc","cv_f1_mean"]].to_string())

# ── Select best model ──────────────────────────────────────────
best_name = results_df["f1"].idxmax()
best_model = trained_models[best_name]
log(f"\n  Best Model: {best_name}")
log(f"  F1 Score  : {results_df.loc[best_name, 'f1']:.4f}")
log(f"  ROC-AUC   : {results_df.loc[best_name, 'roc_auc']:.4f}")

# Full classification report for best model
y_pred_best = best_model.predict(X_test)
log(f"\n  Classification Report — {best_name}:")
log(classification_report(y_test, y_pred_best,
    target_names=["No Irrigation", "Irrigation"]))

# ── Feature importance (Random Forest) ────────────────────────
if "Random Forest" in trained_models:
    rf = trained_models["Random Forest"]
    feat_imp = pd.Series(
        rf.feature_importances_, index=X_train.columns
    ).sort_values(ascending=False).head(15)

    log("\n  Top 15 Important Features (Random Forest):")
    for feat, imp in feat_imp.items():
        bar = "#" * int(imp * 100)
        log(f"    {feat:<35} {imp:.4f}  {bar}")

    plt.figure(figsize=(10, 7))
    feat_imp.sort_values().plot(kind="barh", color="#4CAF50", edgecolor="white")
    plt.title("Top 15 Feature Importances — Random Forest", fontsize=13, fontweight="bold")
    plt.xlabel("Importance Score")
    plt.tight_layout()
    plt.savefig(os.path.join(VIZ_DIR, "feature_importance.png"), dpi=120, bbox_inches="tight")
    plt.close()
    log("  Saved: visualizations/feature_importance.png")

# ── Confusion matrices ─────────────────────────────────────────
log("\n  Saving confusion matrices...")
fig, axes = plt.subplots(2, 3, figsize=(18, 10))
fig.suptitle("Confusion Matrices — All Models", fontsize=14, fontweight="bold")
for i, (name, model) in enumerate(trained_models.items()):
    r, c = divmod(i, 3)
    y_pred = model.predict(X_test)
    cm = confusion_matrix(y_test, y_pred)
    sns.heatmap(cm, annot=True, fmt="d", cmap="Greens", ax=axes[r][c],
                xticklabels=["No Irrig.", "Irrigate"],
                yticklabels=["No Irrig.", "Irrigate"])
    axes[r][c].set_title(f"{name}\nF1={results[name]['f1']:.3f}", fontsize=9)
    axes[r][c].set_ylabel("Actual")
    axes[r][c].set_xlabel("Predicted")
plt.tight_layout()
plt.savefig(os.path.join(VIZ_DIR, "confusion_matrices.png"), dpi=120, bbox_inches="tight")
plt.close()
log("  Saved: visualizations/confusion_matrices.png")

# ── ROC Curves ────────────────────────────────────────────────
log("  Saving ROC curves...")
plt.figure(figsize=(9, 7))
colors = ["#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#9C27B0"]
for (name, model), color in zip(trained_models.items(), colors):
    if hasattr(model, "predict_proba"):
        y_prob = model.predict_proba(X_test)[:, 1]
        fpr, tpr, _ = roc_curve(y_test, y_prob)
        auc = results[name]["roc_auc"]
        plt.plot(fpr, tpr, label=f"{name} (AUC={auc:.3f})", color=color, linewidth=2)
plt.plot([0, 1], [0, 1], "k--", linewidth=1, label="Random (AUC=0.500)")
plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate")
plt.title("ROC Curves — All Models", fontsize=13, fontweight="bold")
plt.legend(loc="lower right", fontsize=9)
plt.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(VIZ_DIR, "roc_curves.png"), dpi=120, bbox_inches="tight")
plt.close()
log("  Saved: visualizations/roc_curves.png")

# ── Model comparison bar chart ────────────────────────────────
metrics_to_plot = ["accuracy", "precision", "recall", "f1", "roc_auc"]
plot_df = results_df[metrics_to_plot].reset_index().rename(columns={"index": "Model"})
plot_melted = plot_df.melt(id_vars="Model", var_name="Metric", value_name="Score")

plt.figure(figsize=(13, 6))
ax = sns.barplot(data=plot_melted, x="Metric", y="Score", hue="Model",
                 palette="Set2", edgecolor="white")
plt.title("Model Performance Comparison", fontsize=13, fontweight="bold")
plt.ylim(0, 1.05)
plt.legend(bbox_to_anchor=(1.01, 1), loc="upper left", fontsize=9)
for container in ax.containers:
    ax.bar_label(container, fmt="%.2f", fontsize=7, padding=2)
plt.tight_layout()
plt.savefig(os.path.join(VIZ_DIR, "model_comparison.png"), dpi=120, bbox_inches="tight")
plt.close()
log("  Saved: visualizations/model_comparison.png")

# ── Save models ────────────────────────────────────────────────
log("\n" + "=" * 65)
log("SAVING MODELS")
log("=" * 65)

joblib.dump(best_model,
            os.path.join(MODELS_DIR, "best_model.pkl"))
joblib.dump(trained_models["Random Forest"],
            os.path.join(MODELS_DIR, "random_forest.pkl"))
joblib.dump(trained_models["Gradient Boosting"],
            os.path.join(MODELS_DIR, "gradient_boosting.pkl"))
joblib.dump(trained_models["Logistic Regression"],
            os.path.join(MODELS_DIR, "logistic_regression.pkl"))
joblib.dump(results_df,
            os.path.join(MODELS_DIR, "results_summary.pkl"))

for fname in os.listdir(MODELS_DIR):
    sz = os.path.getsize(os.path.join(MODELS_DIR, fname))
    log(f"  {fname:<40} {sz:>10,} bytes")

# ── Save report ────────────────────────────────────────────────
with open(os.path.join(REPORTS_DIR, "model_training_report.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(report))

log("\n[OK] Model training report saved: reports/model_training_report.txt")
log("[OK] Phase 3 training complete. Models ready for evaluation and API deployment.")
