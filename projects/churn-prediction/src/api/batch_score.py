"""
Batch scoring script.

Usage
-----
    python -m src.api.batch_score input.csv output.csv
    python -m src.api.batch_score input.csv          # writes to stdout
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

import joblib
import pandas as pd

logger = logging.getLogger(__name__)
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())

_RISK_TIER_THRESHOLDS = (0.3, 0.6)


def _risk_tier(prob: float) -> str:
    if prob < _RISK_TIER_THRESHOLDS[0]:
        return "low"
    if prob < _RISK_TIER_THRESHOLDS[1]:
        return "medium"
    return "high"


def score_csv(input_path: str, output_path: str | None = None) -> pd.DataFrame:
    """Score all rows in *input_path* and write predictions to *output_path*.

    Parameters
    ----------
    input_path:
        Path to a CSV file whose columns match :class:`~src.api.schemas.CustomerFeatures`.
    output_path:
        Destination CSV path.  If *None*, results are printed to stdout.

    Returns
    -------
    pd.DataFrame
        DataFrame with original columns plus ``churn_probability`` and
        ``churn_risk_tier``.
    """
    # Resolve model artifact
    model_path = Path(os.getenv("MODEL_PATH", "models/churn_model.joblib"))
    if not model_path.exists():
        # Train on synthetic data if no artifact exists
        from src.features.builder import build_feature_matrix, get_feature_names_out
        from src.models.baseline import train_logistic_regression
        from src.preprocessing.pipeline import (
            add_engineered_features,
            generate_synthetic_dataset,
        )

        logger.info("No saved model — training on synthetic data …")
        df_train = generate_synthetic_dataset()
        df_train = add_engineered_features(df_train)
        X, y, preprocessor = build_feature_matrix(df_train)
        model = train_logistic_regression(X, y)
        artifact = {
            "model": model,
            "preprocessor": preprocessor,
            "feature_names": get_feature_names_out(preprocessor),
            "version": "1.0.0",
        }
        model_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(artifact, model_path)
    else:
        artifact = joblib.load(model_path)

    model = artifact["model"]
    preprocessor = artifact["preprocessor"]

    # Load and preprocess input
    from src.preprocessing.pipeline import add_engineered_features

    df = pd.read_csv(input_path)
    df = add_engineered_features(df)
    X = preprocessor.transform(df)

    probs = model.predict_proba(X)[:, 1]
    df["churn_probability"] = probs.round(4)
    df["churn_risk_tier"] = [_risk_tier(p) for p in probs]

    output_cols = ["customer_id", "churn_probability", "churn_risk_tier"]
    result_df = df[output_cols]

    if output_path:
        result_df.to_csv(output_path, index=False)
        logger.info("Predictions written to %s", output_path)
    else:
        print(result_df.to_csv(index=False))

    return result_df


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m src.api.batch_score <input.csv> [output.csv]")
        sys.exit(1)

    _input = sys.argv[1]
    _output = sys.argv[2] if len(sys.argv) > 2 else None
    score_csv(_input, _output)
