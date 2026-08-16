import pandas as pd

df = pd.read_csv("dataset/kaggle/irrigation_prediction.csv")

print("=" * 60)
print("HOW Low/Medium/High RELATES TO SOIL MOISTURE & WEATHER")
print("=" * 60)

for level in ["Low", "Medium", "High"]:
    subset = df[df["Irrigation_Need"] == level]
    print(f"\n{level} Irrigation ({len(subset)} records = {len(subset)/len(df)*100:.1f}%):")
    print(f"  Soil Moisture : avg={subset['Soil_Moisture'].mean():.1f}%   range=[{subset['Soil_Moisture'].min():.1f} - {subset['Soil_Moisture'].max():.1f}]%")
    print(f"  Temperature   : avg={subset['Temperature_C'].mean():.1f}C   range=[{subset['Temperature_C'].min():.1f} - {subset['Temperature_C'].max():.1f}]")
    print(f"  Humidity      : avg={subset['Humidity'].mean():.1f}%")
    print(f"  Rainfall      : avg={subset['Rainfall_mm'].mean():.0f}mm")
    print(f"  Prev Irrigated: avg={subset['Previous_Irrigation_mm'].mean():.1f}mm")

print("\n" + "=" * 60)
print("WATER REQUIREMENT BY CROP (Previous_Irrigation_mm)")
print("=" * 60)
crop_water = df.groupby("Crop_Type")["Previous_Irrigation_mm"].agg(["mean", "min", "max"]).round(1)
crop_water.columns = ["Avg (mm)", "Min (mm)", "Max (mm)"]
print(crop_water.to_string())

print("\n" + "=" * 60)
print("WATER REQUIREMENT BY GROWTH STAGE")
print("=" * 60)
stage_water = df.groupby("Crop_Growth_Stage")["Previous_Irrigation_mm"].agg(["mean", "min", "max"]).round(1)
stage_water.columns = ["Avg (mm)", "Min (mm)", "Max (mm)"]
print(stage_water.to_string())

print("\n" + "=" * 60)
print("WATER REQUIREMENT BY SOIL TYPE")
print("=" * 60)
soil_water = df.groupby("Soil_Type")["Soil_Moisture"].agg(["mean", "min", "max"]).round(1)
soil_water.columns = ["Avg (%)", "Min (%)", "Max (%)"]
print(soil_water.to_string())

print("\n" + "=" * 60)
print("HOW THE MODEL DECIDES Low/Medium/High")
print("=" * 60)
print("""
The 'Irrigation_Need' label in the Kaggle dataset is based on:

  Low    = Soil Moisture HIGH + Rainfall HIGH + Temperature LOW
           → Soil already has enough water, no irrigation needed

  Medium = Soil Moisture MODERATE + Some rainfall deficit
           → Irrigation recommended within 1-2 days  

  High   = Soil Moisture LOW + Rainfall LOW + Temperature HIGH
           → Immediate irrigation required — crop stress risk

The ML model LEARNED these patterns from 10,000 examples
and can now predict the level for new unseen sensor readings.
""")
