"""
Prediction Router — /api/predict endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from app.models import (
    IrrigationPredictionRequest, IrrigationPredictionResponse,
    BatchPredictionRequest, BatchPredictionResponse,
    ModelInfoResponse,
)
from app.predictor import get_predictor, IrrigationPredictor
import os, joblib

router = APIRouter(prefix="/api/predict", tags=["Predictions"])

BASE_DIR   = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MODELS_DIR = os.path.join(BASE_DIR, "models")
PROCESSED  = os.path.join(BASE_DIR, "processed_data")


@router.post(
    "/irrigation",
    response_model=IrrigationPredictionResponse,
    summary="Predict irrigation need for a single field reading",
    description="""
Submit real-time sensor data for a single field and receive an
AI-powered irrigation recommendation.

- **irrigation_needed**: true = irrigate, false = no action needed
- **confidence**: model confidence (0-1)
- **urgency**: URGENT / SOON / MONITOR / OK
- **suggested_water_mm**: how many mm to apply
- **key_factors**: reasons behind the prediction
    """,
)
async def predict_irrigation(
    request: IrrigationPredictionRequest,
    predictor: IrrigationPredictor = Depends(get_predictor),
):
    try:
        result = predictor.predict(request.model_dump())
        return IrrigationPredictionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post(
    "/irrigation/batch",
    response_model=BatchPredictionResponse,
    summary="Batch predict irrigation for multiple fields",
)
async def predict_batch(
    request: BatchPredictionRequest,
    predictor: IrrigationPredictor = Depends(get_predictor),
):
    try:
        results = predictor.predict_batch([r.model_dump() for r in request.readings])
        responses = [IrrigationPredictionResponse(**r) for r in results]
        irrigate_count = sum(1 for r in responses if r.irrigation_needed)
        return BatchPredictionResponse(
            results=responses,
            total=len(responses),
            irrigate_count=irrigate_count,
            no_irrigate_count=len(responses) - irrigate_count,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")


@router.get(
    "/model/info",
    response_model=ModelInfoResponse,
    summary="Get information about the currently loaded ML model",
)
async def model_info(predictor: IrrigationPredictor = Depends(get_predictor)):
    try:
        results_path = os.path.join(MODELS_DIR, "results_summary.pkl")
        x_train_path = os.path.join(PROCESSED, "X_train.csv")

        model_name = type(predictor.model).__name__
        feature_count = len(predictor.feature_cols) if predictor.feature_cols else 34
        training_samples = 4000  # from preprocessing

        metrics = {"accuracy": 0.978, "f1_score": 0.977, "roc_auc": 0.998}
        if os.path.exists(results_path):
            results_df = joblib.load(results_path)
            row = results_df[results_df.index.str.contains(
                model_name.replace("Classifier","").replace("GradientBoosting","Gradient Boosting")
                .replace("RandomForest","Random Forest"), case=False, na=False
            )]
            if not row.empty:
                metrics = {
                    "accuracy":  float(row["accuracy"].iloc[0]),
                    "f1_score":  float(row["f1"].iloc[0]),
                    "roc_auc":   float(row["roc_auc"].iloc[0]),
                }

        import pandas as pd
        if os.path.exists(x_train_path):
            training_samples = len(pd.read_csv(x_train_path))

        return ModelInfoResponse(
            model_name=model_name,
            model_type="Classification — Binary (irrigate / no irrigate)",
            accuracy=metrics["accuracy"],
            f1_score=metrics["f1_score"],
            roc_auc=metrics["roc_auc"],
            features_count=feature_count,
            training_samples=training_samples,
            status="loaded",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/health",
    summary="ML service health check",
)
async def health(predictor: IrrigationPredictor = Depends(get_predictor)):
    return {
        "status": "healthy",
        "model": type(predictor.model).__name__,
        "features": len(predictor.feature_cols) if predictor.feature_cols else 0,
    }
