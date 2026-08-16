"""
Retrain Models with Real Sensor Data - Phase 3
===============================================
This script connects to the PostgreSQL database, pulls real
sensor readings and field data, and retrains the irrigation
prediction model with actual farm data.

Run after you have collected enough real sensor readings:
  python training/retrain_with_real_data.py

Requirements:
  pip install psycopg2-binary sqlalchemy
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
import warnings
warnings.filterwarnings("ignore")

from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.preprocessing import StandardScaler, MinMaxScaler

# ── Paths ──────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# ── Database connection ────────────────────────────────────────
DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/irrigation_db"
)

def load_real_data():
    """Load sensor readings + field data from PostgreSQL."""
    try:
        from sqlalchemy import create_engine, text
        engine = create_engine(DB_URL)

        query = text("""
            SELECT
                sr.soil_moisture,
                sr.temperature,
                sr.humidity,
                sr.rainfall,
                sr.water_level,
                sr.ph,
                sr.battery_level,
                sr.signal_strength,
                sr.timestamp,
                s.type as sensor_type,
                f.soil_type,
                f.irrigation_method,
                f.state,
                f.area
            FROM sensor_readings sr
            JOIN sensors s ON sr.sensor_id = s.id
            JOIN fields f ON s.field_id = f.id
            WHERE sr.is_valid = true
            ORDER BY sr.timestamp DESC
            LIMIT 10000
        """)

        with engine.connect() as conn:
            df = pd.read_sql(query, conn)

        print(f"[OK] Loaded {len(df)} real sensor readings from database")
        return df

    except ImportError:
        print("[!!] sqlalchemy not installed. Run: pip install sqlalchemy psycopg2-binary")
        sys.exit(1)
    except Exception as e:
        print(f"[!!] Database connection failed: {e}")
        print("     Make sure DATABASE_URL env var is set correctly")
        sys.exit(1)


def build_features(df: pd.DataFrame) -> tuple:
    """Build feature matrix from real sensor data."""
    features = pd.DataFrame()

    # Numeric features
    for col in ["soil_moisture", "temperature", "humidity", "rainfall"]:
        if col in df.columns:
            features[col] = df[col].fillna(df[col].median())

    # Soil type encoding
    soil_map = {"Sandy": 0, "Loamy": 1, "Clay": 2, "Silt": 3, "Peaty": 4, "Chalky": 5}
    if "soil_type" in df.columns:
        features["soil_type_enc"] = df["soil_type"].map(soil_map).fillna(1)

    # Irrigation method encoding
    irr_map = {"Drip": 0, "Sprinkler": 1, "Flood": 2, "Furrow": 3}
    if "irrigation_method" in df.columns:
        features["irrigation_method_enc"] = df["irrigation_method"].map(irr_map).fillna(0)

    # Time features
    if "timestamp" in df.columns:
        ts = pd.to_datetime(df["timestamp"])
        features["hour_of_day"] = ts.dt.hour
        features["month"] = ts.dt.month

    # Target: needs irrigation if soil moisture < 30% and no recent rain
    rain_val = df["rainfall"].fillna(0) if "rainfall" in df.columns else pd.Series(0, index=df.index)
    moisture_val = df["soil_moisture"].fillna(50) if "soil_moisture" in df.columns else pd.Series(50, index=df.index)
    targets = ((moisture_val < 30) & (rain_val < 2)).astype(int)

    print(f"[OK] Features built: {features.shape}")
    print(f"     Target balance: {targets.value_counts().to_dict()}")
    return features, targets


def retrain(df: pd.DataFrame):
    """Retrain with real data and save updated model."""
    if len(df) < 50:
        print(f"[!!] Only {len(df)} records — need at least 50 to retrain")
        print("     Continue using the synthetic-trained model")
        return

    X, y = build_features(df)

    # Remove constant columns
    X = X.loc[:, X.nunique() > 1]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"\nRetraining on {len(X_train)} real samples...")
    model = GradientBoostingClassifier(
        n_estimators=200, learning_rate=0.1, max_depth=5,
        subsample=0.8, random_state=42
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    f1  = f1_score(y_test, y_pred, zero_division=0)
    auc = roc_auc_score(y_test, y_prob) if y.nunique() > 1 else 0.0

    print(f"\nRetrained model metrics:")
    print(f"  Accuracy : {acc:.4f}")
    print(f"  F1 Score : {f1:.4f}")
    print(f"  ROC-AUC  : {auc:.4f}")

    # Only save if performance is acceptable
    if f1 >= 0.70:
        # Backup old model
        old_path = os.path.join(MODELS_DIR, "best_model.pkl")
        bak_path = os.path.join(MODELS_DIR, "best_model_synthetic_backup.pkl")
        if os.path.exists(old_path) and not os.path.exists(bak_path):
            import shutil
            shutil.copy(old_path, bak_path)
            print(f"[OK] Backed up synthetic model to best_model_synthetic_backup.pkl")

        joblib.dump(model, old_path)
        print(f"[OK] best_model.pkl updated with real data model")
        print(f"     F1={f1:.4f} — production ready")
    else:
        print(f"[!!] F1={f1:.4f} too low — keeping existing synthetic model")
        print("     Collect more sensor data and try again")


if __name__ == "__main__":
    print("=" * 60)
    print("RETRAINING WITH REAL SENSOR DATA")
    print("=" * 60)
    df = load_real_data()
    retrain(df)
    print("\n[OK] Done.")
