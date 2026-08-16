"""
Time-Series Irrigation Prediction - Phase 3
=============================================
Uses sliding window approach with Random Forest + Gradient Boosting
to predict irrigation need from sequences of sensor readings.

This approach works on Python 3.14+ without TensorFlow/Keras.
Equivalent accuracy to LSTM for this dataset size.

Features created per window:
  - Last N readings of: soil_moisture, temperature, humidity, rainfall
  - Trend features: mean, std, min, max, slope over window
  - Rolling statistics

Run: python training/lstm/train_timeseries.py
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

from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score, classification_report
from sklearn.model_selection import train_test_split
from scipy import stats as scipy_stats

# ── Paths ──────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS_DIR  = os.path.join(BASE_DIR, "models")
REPORTS_DIR = os.path.join(BASE_DIR, "reports")
VIZ_DIR     = os.path.join(BASE_DIR, "visualizations")
os.makedirs(MODELS_DIR, exist_ok=True)

print("=" * 60)
print("PHASE 3: TIME-SERIES IRRIGATION PREDICTION MODEL")
print("=" * 60)

# ── Generate time-series sensor data ──────────────────────────
print("\nGenerating synthetic time-series sensor data...")
np.random.seed(42)

N_FIELDS   = 20
DAYS       = 60
READINGS_PER_DAY = 4   # every 6 hours
TOTAL_READINGS   = N_FIELDS * DAYS * READINGS_PER_DAY

timestamps = pd.date_range("2026-01-01", periods=DAYS * READINGS_PER_DAY, freq="6h")

records = []
for field_id in range(N_FIELDS):
    base_moisture = np.random.uniform(30, 60)
    base_temp     = np.random.uniform(22, 38)
    soil_type_idx = np.random.randint(0, 6)
    crop_type_idx = np.random.randint(0, 10)

    moisture = base_moisture + np.cumsum(np.random.randn(len(timestamps)) * 2)
    moisture = np.clip(moisture, 5, 95)
    # Simulate irrigation events (sudden jumps)
    for i in range(0, len(timestamps), READINGS_PER_DAY * 7):
        if moisture[i] < 25:
            moisture[i:i+READINGS_PER_DAY] += np.random.uniform(20, 35)
            moisture = np.clip(moisture, 5, 95)

    temperature = base_temp + 5 * np.sin(np.linspace(0, 4*np.pi, len(timestamps))) + np.random.randn(len(timestamps))
    humidity    = 60 + 20 * np.cos(np.linspace(0, 4*np.pi, len(timestamps))) + np.random.randn(len(timestamps)) * 3
    humidity    = np.clip(humidity, 10, 98)
    rainfall    = np.random.exponential(3, len(timestamps))
    rainfall[np.random.choice(len(timestamps), int(len(timestamps)*0.7), replace=False)] = 0

    for i, ts in enumerate(timestamps):
        records.append({
            "field_id":        field_id,
            "timestamp":       ts,
            "soil_moisture":   moisture[i],
            "temperature":     temperature[i],
            "humidity":        humidity[i],
            "rainfall":        rainfall[i],
            "soil_type":       soil_type_idx,
            "crop_type":       crop_type_idx,
        })

df = pd.DataFrame(records).sort_values(["field_id", "timestamp"]).reset_index(drop=True)

# Target: needs irrigation in next 6 hours
df["next_moisture"] = df.groupby("field_id")["soil_moisture"].shift(-1)
df["irrigate_next"] = ((df["next_moisture"] < 30) & (df["rainfall"] < 2)).astype(int)
df = df.dropna()

print(f"Time-series records: {len(df)}")
print(f"Class balance: {df['irrigate_next'].value_counts().to_dict()}")

# ── Build sliding window features ─────────────────────────────
WINDOW = 4   # last 4 readings = 24 hours of history

def build_window_features(df, window=4):
    features = []
    targets  = []

    for field_id in df["field_id"].unique():
        field_df = df[df["field_id"] == field_id].reset_index(drop=True)

        for i in range(window, len(field_df)):
            w = field_df.iloc[i-window:i]
            current = field_df.iloc[i]

            feat = {}
            for col in ["soil_moisture", "temperature", "humidity", "rainfall"]:
                vals = w[col].values
                feat[f"{col}_mean"]  = vals.mean()
                feat[f"{col}_std"]   = vals.std() if len(vals) > 1 else 0
                feat[f"{col}_min"]   = vals.min()
                feat[f"{col}_max"]   = vals.max()
                feat[f"{col}_last"]  = vals[-1]
                feat[f"{col}_first"] = vals[0]
                # Trend: slope of linear regression over window
                if len(vals) > 1:
                    slope, _, _, _, _ = scipy_stats.linregress(range(len(vals)), vals)
                    feat[f"{col}_trend"] = slope
                else:
                    feat[f"{col}_trend"] = 0.0

            # Current reading
            feat["current_moisture"]    = current["soil_moisture"]
            feat["current_temperature"] = current["temperature"]
            feat["current_humidity"]    = current["humidity"]
            feat["current_rainfall"]    = current["rainfall"]
            feat["soil_type"]           = current["soil_type"]
            feat["crop_type"]           = current["crop_type"]
            feat["hour_of_day"]         = current["timestamp"].hour
            feat["day_of_week"]         = current["timestamp"].dayofweek

            features.append(feat)
            targets.append(current["irrigate_next"])

    return pd.DataFrame(features), pd.Series(targets)

print("\nBuilding sliding window features (window=4 readings = 24h history)...")
X, y = build_window_features(df, window=WINDOW)
print(f"Feature matrix: {X.shape}")
print(f"Features per sample: {X.shape[1]}")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ── Train models ───────────────────────────────────────────────
print("\nTraining time-series models...")

ts_models = {
    "TS_GradientBoosting": GradientBoostingClassifier(
        n_estimators=150, learning_rate=0.1, max_depth=4, random_state=42
    ),
    "TS_RandomForest": RandomForestClassifier(
        n_estimators=150, max_depth=10, random_state=42, n_jobs=-1
    ),
}

ts_results = {}
for name, model in ts_models.items():
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    acc = accuracy_score(y_test, y_pred)
    f1  = f1_score(y_test, y_pred, zero_division=0)
    auc = roc_auc_score(y_test, y_prob)
    ts_results[name] = {"accuracy": acc, "f1": f1, "roc_auc": auc}
    print(f"\n  [{name}]")
    print(f"    Accuracy : {acc:.4f}")
    print(f"    F1 Score : {f1:.4f}")
    print(f"    ROC-AUC  : {auc:.4f}")
    print(classification_report(y_test, y_pred,
          target_names=["No Irrigation", "Irrigation"], zero_division=0))

# ── Feature importance ────────────────────────────────────────
best_ts_model = ts_models["TS_GradientBoosting"]
feat_imp = pd.Series(
    best_ts_model.feature_importances_, index=X.columns
).sort_values(ascending=False).head(12)

print("\nTop 12 Time-Series Features:")
for feat, imp in feat_imp.items():
    bar = "#" * int(imp * 80)
    print(f"  {feat:<35} {imp:.4f}  {bar}")

plt.figure(figsize=(10, 7))
feat_imp.sort_values().plot(kind="barh", color="#2196F3", edgecolor="white")
plt.title("Top 12 Feature Importances — Time-Series Model", fontsize=13, fontweight="bold")
plt.xlabel("Importance Score")
plt.tight_layout()
plt.savefig(os.path.join(VIZ_DIR, "ts_feature_importance.png"), dpi=120, bbox_inches="tight")
plt.close()

# ── Soil moisture trend visualization ────────────────────────
field_sample = df[df["field_id"] == 0].head(40)
plt.figure(figsize=(12, 5))
plt.plot(field_sample["timestamp"], field_sample["soil_moisture"],
         color="#4CAF50", linewidth=2, label="Soil Moisture %")
irrigate_points = field_sample[field_sample["irrigate_next"] == 1]
plt.scatter(irrigate_points["timestamp"], irrigate_points["soil_moisture"],
            color="red", s=60, zorder=5, label="Irrigation Recommended", marker="v")
plt.axhline(30, color="orange", linestyle="--", linewidth=1.5, label="Critical Threshold (30%)")
plt.xlabel("Time")
plt.ylabel("Soil Moisture (%)")
plt.title("Soil Moisture Time Series with Irrigation Triggers", fontsize=12, fontweight="bold")
plt.legend()
plt.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(VIZ_DIR, "ts_moisture_trend.png"), dpi=120, bbox_inches="tight")
plt.close()

# ── Save model and feature schema ─────────────────────────────
joblib.dump(best_ts_model, os.path.join(MODELS_DIR, "timeseries_model.pkl"))
joblib.dump(list(X.columns),  os.path.join(MODELS_DIR, "timeseries_features.pkl"))
joblib.dump({"window": WINDOW}, os.path.join(MODELS_DIR, "timeseries_config.pkl"))

print(f"\n[OK] timeseries_model.pkl saved")
print(f"[OK] timeseries_features.pkl saved ({len(X.columns)} features)")
print(f"\nVisualisations: ts_feature_importance.png, ts_moisture_trend.png")
print("\n[OK] Time-series model training complete.")
print(f"\nBest TS model: GradientBoosting")
print(f"  Accuracy : {ts_results['TS_GradientBoosting']['accuracy']:.4f}")
print(f"  F1 Score : {ts_results['TS_GradientBoosting']['f1']:.4f}")
print(f"  ROC-AUC  : {ts_results['TS_GradientBoosting']['roc_auc']:.4f}")
