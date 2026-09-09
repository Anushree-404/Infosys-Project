import joblib, pandas as pd, os

base = "e:/Infosys-project/ml"

# Kaggle irrigation features
pipeline = joblib.load(f"{base}/processed_data/kaggle_irr_pipeline.pkl")
cols = pipeline["feature_cols"]
print(f"KAGGLE IRRIGATION MODEL — {len(cols)} features:\n")
for i, c in enumerate(cols, 1):
    print(f"  {i:2d}. {c}")

# Also show synthetic model features
X_train = pd.read_csv(f"{base}/processed_data/X_train.csv")
print(f"\nSYNTHETIC MODEL — {len(X_train.columns)} features:\n")
for i, c in enumerate(X_train.columns, 1):
    print(f"  {i:2d}. {c}")
