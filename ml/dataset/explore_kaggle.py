"""
Explore Kaggle datasets to understand structure before preprocessing.
"""
import pandas as pd
import os
import warnings
warnings.filterwarnings("ignore")

KAGGLE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kaggle")

files = [f for f in os.listdir(KAGGLE_DIR) if f.lower().endswith(".csv")]

for fname in sorted(files):
    path = os.path.join(KAGGLE_DIR, fname)
    try:
        df = pd.read_csv(path, nrows=3, encoding="utf-8")
    except Exception:
        try:
            df = pd.read_csv(path, nrows=3, encoding="latin-1")
        except Exception as e:
            print(f"\n[ERROR] {fname}: {e}")
            continue

    full = pd.read_csv(path, encoding="utf-8" if True else "latin-1")
    print(f"\n{'='*55}")
    print(f"FILE  : {fname}")
    print(f"ROWS  : {len(full)}")
    print(f"COLS  : {len(full.columns)}")
    print(f"COLUMNS: {list(full.columns)}")
    print(f"DTYPES :")
    for col in full.columns:
        print(f"  {col:<35} {str(full[col].dtype):<10} nulls={full[col].isnull().sum()}")
    if "label" in full.columns or "irrigation" in " ".join(full.columns).lower():
        for col in full.columns:
            if full[col].dtype == "object" or full[col].nunique() < 20:
                print(f"  >> Possible target '{col}': {full[col].value_counts().head(5).to_dict()}")
