"""
Visualizations Module - AI Irrigation Management System
=======================================================
Generates all required plots:
  1. Missing value heatmap
  2. Feature distributions (histograms)
  3. Class distribution (target)
  4. Correlation heatmap
  5. Boxplots before/after outlier treatment (generated in feature_engineering.py)

Run: python visualizations.py
"""

import pandas as pd
import numpy as np
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns

# ── Paths ──────────────────────────────────────────────────────
BASE_DIR      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR   = os.path.join(BASE_DIR, "dataset")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed_data")
VIZ_DIR       = os.path.join(BASE_DIR, "visualizations")
os.makedirs(VIZ_DIR, exist_ok=True)

# ── Load raw dataset (for missing value viz) ───────────────────
raw_path = os.path.join(DATASET_DIR, "irrigation_data.csv")
clean_path = os.path.join(PROCESSED_DIR, "cleaned_irrigation.csv")

if not os.path.exists(raw_path):
    print("[WARN] Run dataset/generate_dataset.py first")
    exit(1)

raw_df   = pd.read_csv(raw_path)
clean_df = pd.read_csv(clean_path) if os.path.exists(clean_path) else raw_df.copy()

print("Generating visualizations...\n")

# ── 1. Missing Value Heatmap ───────────────────────────────────
print("  1. Missing value heatmap...")
plt.figure(figsize=(14, 7))
missing_data = raw_df.isnull()
sns.heatmap(
    missing_data,
    cbar=True, yticklabels=False, cmap="viridis",
    cbar_kws={"label": "Missing (yellow) / Present (purple)"}
)
plt.title("Missing Value Heatmap — Raw Irrigation Dataset", fontsize=13, fontweight="bold")
plt.xlabel("Features")
plt.tight_layout()
plt.savefig(os.path.join(VIZ_DIR, "missing_value_heatmap.png"), dpi=120, bbox_inches="tight")
plt.close()
print("  ✓ missing_value_heatmap.png")

# Missing value bar chart
miss_count = raw_df.isnull().sum()
miss_count = miss_count[miss_count > 0].sort_values(ascending=True)
if len(miss_count) > 0:
    plt.figure(figsize=(10, 5))
    bars = plt.barh(miss_count.index, miss_count.values, color="#FF6B6B", edgecolor="white")
    for bar, val in zip(bars, miss_count.values):
        plt.text(bar.get_width() + 5, bar.get_y() + bar.get_height() / 2,
                 f"{val}", va="center", fontsize=10)
    plt.title("Missing Value Count by Feature", fontsize=13, fontweight="bold")
    plt.xlabel("Number of Missing Values")
    plt.tight_layout()
    plt.savefig(os.path.join(VIZ_DIR, "missing_value_bar.png"), dpi=120, bbox_inches="tight")
    plt.close()
    print("  ✓ missing_value_bar.png")

# ── 2. Feature Distributions ──────────────────────────────────
print("  2. Feature distributions...")
num_cols = clean_df.select_dtypes(include=np.number).columns.tolist()
num_cols = [c for c in num_cols if clean_df[c].nunique() > 5][:12]

fig, axes = plt.subplots(3, 4, figsize=(18, 12))
fig.suptitle("Feature Distributions — Cleaned Dataset", fontsize=14, fontweight="bold")
for i, col in enumerate(num_cols):
    r, c = divmod(i, 4)
    axes[r][c].hist(clean_df[col].dropna(), bins=40, color="#4CAF50",
                    edgecolor="white", alpha=0.8)
    axes[r][c].set_title(col, fontsize=9)
    axes[r][c].set_xlabel("")
    axes[r][c].axvline(clean_df[col].mean(), color="red", linestyle="--",
                       linewidth=1.2, label="Mean")
    axes[r][c].axvline(clean_df[col].median(), color="blue", linestyle=":",
                       linewidth=1.2, label="Median")
plt.tight_layout()
plt.savefig(os.path.join(VIZ_DIR, "feature_distributions.png"), dpi=120, bbox_inches="tight")
plt.close()
print("  ✓ feature_distributions.png")

# ── 3. Class Distribution ─────────────────────────────────────
print("  3. Class distribution...")
if "irrigation_needed" in clean_df.columns:
    class_counts = clean_df["irrigation_needed"].value_counts()
    labels = ["No Irrigation Needed", "Irrigation Needed"]
    colors = ["#4CAF50", "#FF7043"]

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    fig.suptitle("Target Variable: irrigation_needed", fontsize=13, fontweight="bold")

    # Bar chart
    axes[0].bar(labels, class_counts.values, color=colors, edgecolor="white", width=0.5)
    for i, v in enumerate(class_counts.values):
        axes[0].text(i, v + 20, str(v), ha="center", fontsize=12, fontweight="bold")
    axes[0].set_ylabel("Count")
    axes[0].set_title("Count")

    # Pie chart
    axes[1].pie(class_counts.values, labels=labels, colors=colors,
                autopct="%1.1f%%", startangle=90,
                wedgeprops=dict(edgecolor="white", linewidth=2))
    axes[1].set_title("Proportion")
    plt.tight_layout()
    plt.savefig(os.path.join(VIZ_DIR, "class_distribution.png"), dpi=120, bbox_inches="tight")
    plt.close()
    print("  ✓ class_distribution.png")

# ── 4. Categorical Feature Distributions ─────────────────────
print("  4. Categorical distributions...")
cat_cols = ["soil_type", "crop_type", "season", "region", "irrigation_method"]
cat_cols = [c for c in cat_cols if c in clean_df.columns]

if cat_cols:
    fig, axes = plt.subplots(2, 3, figsize=(18, 10))
    fig.suptitle("Categorical Feature Distributions", fontsize=14, fontweight="bold")
    palette = sns.color_palette("Set2", 10)
    for i, col in enumerate(cat_cols[:6]):
        r, c = divmod(i, 3)
        vc = clean_df[col].value_counts()
        axes[r][c].bar(vc.index, vc.values, color=palette[:len(vc)], edgecolor="white")
        axes[r][c].set_title(col.replace("_", " ").title(), fontsize=10)
        axes[r][c].tick_params(axis="x", rotation=30)
    # Hide unused
    for j in range(len(cat_cols), 6):
        r, c = divmod(j, 3)
        axes[r][c].set_visible(False)
    plt.tight_layout()
    plt.savefig(os.path.join(VIZ_DIR, "categorical_distributions.png"), dpi=120, bbox_inches="tight")
    plt.close()
    print("  ✓ categorical_distributions.png")

# ── 5. Soil Moisture vs Irrigation (scatter + violin) ─────────
print("  5. Key feature analysis...")
if "soil_moisture_pct" in clean_df.columns and "irrigation_needed" in clean_df.columns:
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.suptitle("Soil Moisture vs Irrigation Decision", fontsize=13, fontweight="bold")

    colors_map = {0: "#4CAF50", 1: "#FF7043"}
    for val, label in [(0, "No Irrigation"), (1, "Irrigation")]:
        subset = clean_df[clean_df["irrigation_needed"] == val]["soil_moisture_pct"]
        axes[0].hist(subset, bins=30, alpha=0.65, label=label, color=colors_map[val], edgecolor="white")
    axes[0].set_xlabel("Soil Moisture (%)")
    axes[0].set_ylabel("Count")
    axes[0].set_title("Soil Moisture Distribution by Class")
    axes[0].legend()

    # Violin plot
    sns.violinplot(
        data=clean_df, x="irrigation_needed", y="soil_moisture_pct",
        palette=["#4CAF50", "#FF7043"], ax=axes[1], inner="box"
    )
    axes[1].set_xticklabels(["No Irrigation", "Irrigation"])
    axes[1].set_xlabel("Irrigation Needed")
    axes[1].set_ylabel("Soil Moisture (%)")
    axes[1].set_title("Violin Plot — Soil Moisture by Class")
    plt.tight_layout()
    plt.savefig(os.path.join(VIZ_DIR, "soil_moisture_analysis.png"), dpi=120, bbox_inches="tight")
    plt.close()
    print("  ✓ soil_moisture_analysis.png")

print("\n✅ All visualizations saved to:", VIZ_DIR)
print("\nFiles generated:")
for f in sorted(os.listdir(VIZ_DIR)):
    print(f"  📊 {f}")
