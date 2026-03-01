"""Training pipeline orchestrator.

Coordinates the full training workflow: data loading, preprocessing,
feature engineering, model training, evaluation, and artifact saving.
"""

import json
import logging
import pickle
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd

from src.data_processing.ingest import generate_synthetic_data, load_csv
from src.data_processing.preprocess import clean_data, scale_features
from src.data_processing.split import stratified_split
from src.evaluation.metrics import compute_all_metrics
from src.experiment_tracking.tracker import ExperimentTracker
from src.feature_engineering.features import engineer_features, get_feature_columns
from src.models.baseline import build_baseline_model, train_baseline
from src.models.lightgbm_model import (
    build_lgbm_model,
    compute_scale_pos_weight,
    train_lgbm,
)
from src.models.threshold import optimize_threshold_cost, optimize_threshold_f1

logger = logging.getLogger(__name__)


def save_artifact(obj: Any, filepath: str | Path) -> None:
    """Serialize and save a model artifact to disk.

    Args:
        obj: Object to serialize (model, scaler, etc.).
        filepath: Destination path.
    """
    filepath = Path(filepath)
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "wb") as f:
        pickle.dump(obj, f)
    logger.info("Saved artifact: %s", filepath)


def load_artifact(filepath: str | Path) -> Any:
    """Load a serialized model artifact from disk.

    Args:
        filepath: Path to the artifact.

    Returns:
        Deserialized object.
    """
    with open(filepath, "rb") as f:
        return pickle.load(f)


def run_training_pipeline(
    data_path: Optional[str] = None,
    output_dir: str = "artifacts",
    use_synthetic: bool = True,
    n_synthetic: int = 100000,
) -> dict:
    """Execute the full training pipeline.

    Args:
        data_path: Path to transaction CSV (if not using synthetic data).
        output_dir: Directory to save model artifacts.
        use_synthetic: Whether to generate synthetic data.
        n_synthetic: Number of synthetic samples.

    Returns:
        Dictionary with training results and metrics.
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    tracker = ExperimentTracker(output_path / "experiments")

    # 1. Data Ingestion
    logger.info("=" * 60)
    logger.info("STEP 1: Data Ingestion")
    logger.info("=" * 60)
    if use_synthetic or data_path is None:
        df = generate_synthetic_data(n_samples=n_synthetic)
    else:
        df = load_csv(data_path)

    # 2. Preprocessing
    logger.info("=" * 60)
    logger.info("STEP 2: Preprocessing")
    logger.info("=" * 60)
    df = clean_data(df)
    df, scaler = scale_features(df)
    save_artifact(scaler, output_path / "scaler.pkl")

    # 3. Feature Engineering
    logger.info("=" * 60)
    logger.info("STEP 3: Feature Engineering")
    logger.info("=" * 60)
    df = engineer_features(df)
    feature_cols = get_feature_columns(df)

    # Save feature column list
    with open(output_path / "feature_columns.json", "w") as f:
        json.dump(feature_cols, f)

    # 4. Split
    logger.info("=" * 60)
    logger.info("STEP 4: Train/Test Split")
    logger.info("=" * 60)
    train_df, test_df = stratified_split(df, test_ratio=0.2)
    X_train = train_df[feature_cols].values
    y_train = train_df["Class"].values
    X_test = test_df[feature_cols].values
    y_test = test_df["Class"].values

    results = {}

    # 5. Baseline Model
    logger.info("=" * 60)
    logger.info("STEP 5: Baseline Model (Logistic Regression)")
    logger.info("=" * 60)
    baseline_pipeline = build_baseline_model()
    baseline_pipeline = train_baseline(baseline_pipeline, X_train, y_train)
    baseline_proba = baseline_pipeline.predict_proba(X_test)[:, 1]
    baseline_metrics = compute_all_metrics(y_test, baseline_proba)
    results["baseline"] = baseline_metrics
    save_artifact(baseline_pipeline, output_path / "baseline_model.pkl")
    tracker.log_experiment("baseline_logistic_regression", baseline_metrics)
    logger.info("Baseline ROC-AUC: %.6f", baseline_metrics["roc_auc"])

    # 6. LightGBM Model
    logger.info("=" * 60)
    logger.info("STEP 6: LightGBM Model")
    logger.info("=" * 60)
    spw = compute_scale_pos_weight(y_train)
    lgbm_model = build_lgbm_model(scale_pos_weight=spw)

    # Split train into train/val for early stopping
    train_sub, val_sub = stratified_split(train_df, test_ratio=0.15)
    X_train_sub = train_sub[feature_cols].values
    y_train_sub = train_sub["Class"].values
    X_val = val_sub[feature_cols].values
    y_val = val_sub["Class"].values

    lgbm_model = train_lgbm(
        lgbm_model, X_train_sub, y_train_sub, X_val, y_val,
        num_boost_round=500, early_stopping_rounds=50,
    )
    lgbm_proba = lgbm_model.predict_proba(X_test)[:, 1]
    lgbm_metrics = compute_all_metrics(y_test, lgbm_proba)
    results["lightgbm"] = lgbm_metrics
    save_artifact(lgbm_model, output_path / "lgbm_model.pkl")
    tracker.log_experiment("lightgbm", lgbm_metrics)
    logger.info("LightGBM ROC-AUC: %.6f", lgbm_metrics["roc_auc"])

    # 7. Threshold Optimization
    logger.info("=" * 60)
    logger.info("STEP 7: Threshold Optimization")
    logger.info("=" * 60)
    best_threshold_f1, best_f1 = optimize_threshold_f1(y_test, lgbm_proba)
    best_threshold_cost, min_cost = optimize_threshold_cost(
        y_test, lgbm_proba, cost_fp=1.0, cost_fn=10.0
    )
    results["thresholds"] = {
        "f1_optimal": best_threshold_f1,
        "f1_score": best_f1,
        "cost_optimal": best_threshold_cost,
        "min_cost": min_cost,
    }

    # Save threshold config
    with open(output_path / "threshold_config.json", "w") as f:
        json.dump(results["thresholds"], f, indent=2)

    # Summary
    logger.info("=" * 60)
    logger.info("TRAINING COMPLETE")
    logger.info("=" * 60)
    logger.info("Baseline ROC-AUC:  %.6f", baseline_metrics["roc_auc"])
    logger.info("LightGBM ROC-AUC:  %.6f", lgbm_metrics["roc_auc"])
    logger.info("Baseline PR-AUC:   %.6f", baseline_metrics["pr_auc"])
    logger.info("LightGBM PR-AUC:   %.6f", lgbm_metrics["pr_auc"])
    logger.info("Best F1 threshold: %.4f", best_threshold_f1)
    logger.info("Artifacts saved to: %s", output_path.resolve())

    # Save full results
    with open(output_path / "training_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)

    return results
