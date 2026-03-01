# Fraud Detection System

Production-grade machine learning system for real-time financial transaction fraud detection. Features a complete ML pipeline from data ingestion through model serving, with monitoring and experiment tracking.

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Data Source  │────▶│  Data Pipeline   │────▶│ Feature Engine   │
│  (CSV/DB)    │     │  ingest + clean  │     │ temporal/freq/   │
└──────────────┘     └──────────────────┘     │ behavioral       │
                                               └────────┬─────────┘
                                                        │
                     ┌──────────────────┐     ┌─────────▼─────────┐
                     │  Model Registry  │◀────│  Training Pipeline │
                     │  versioned .pkl  │     │  LR + LightGBM    │
                     └────────┬─────────┘     │  threshold opt.   │
                              │               └───────────────────┘
                     ┌────────▼─────────┐
                     │   FastAPI Server  │
                     │  /predict         │
                     │  /predict/batch   │
                     │  /health          │
                     └────────┬─────────┘
                              │
                     ┌────────▼─────────┐
                     │   Monitoring      │
                     │  drift detection  │
                     │  perf tracking    │
                     └──────────────────┘
```

## Key Results

| Metric | Baseline (LR) | LightGBM |
|--------|---------------|----------|
| ROC-AUC | ~0.97 | ~0.99 |
| PR-AUC | ~0.75 | ~0.92 |
| Recall @ 5% FPR | ~0.85 | ~0.95 |

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Train models (generates synthetic data by default)
python -c "
from src.models.train import run_training_pipeline
results = run_training_pipeline()
print('Training complete!')
"

# Start the API server
uvicorn src.api.app:app --host 0.0.0.0 --port 8000

# Score a transaction
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"transaction_id": "txn-001", "time": 12345, "amount": 150.00, "V1": -1.36, "V2": -0.07}'
```

## Docker

```bash
cd docker
docker compose up fraud-api    # Start API server
docker compose up train        # Run training pipeline
```

## Project Structure

```
fraud-detection/
├── src/
│   ├── data_processing/    # Ingestion, cleaning, splitting
│   ├── feature_engineering/ # Temporal, frequency, behavioral features
│   ├── models/             # LR baseline, LightGBM, threshold optimization
│   ├── evaluation/         # Metrics (ROC-AUC, PR-AUC, cost analysis, SHAP)
│   ├── api/                # FastAPI scoring server
│   ├── monitoring/         # Drift detection, performance tracking
│   └── experiment_tracking/ # Model versioning, metric logging
├── tests/                  # Comprehensive test suite
├── docker/                 # Containerized deployment
├── docs/                   # Architecture docs, portfolio summary
└── data/                   # Dataset storage
```

## Technical Highlights

- **Class Imbalance Handling**: RobustScaler + SMOTE-aware class weights + scale_pos_weight in LightGBM
- **Threshold Optimization**: F1-optimal, cost-based (configurable FP/FN costs), and FPR-constrained thresholds
- **Feature Engineering**: Temporal (cyclical time encoding), frequency (log-amount, z-score), behavioral (PCA interaction features)
- **Real-time Scoring**: FastAPI with sub-100ms P95 latency, idempotent endpoints
- **Monitoring**: Population Stability Index (PSI) and Kolmogorov-Smirnov test for distribution drift
- **Experiment Tracking**: JSON-based experiment logging with model versioning

## Testing

```bash
pytest tests/ -v
```

## Tech Stack

- **ML**: scikit-learn, LightGBM, SHAP
- **API**: FastAPI, Pydantic, uvicorn
- **Data**: pandas, NumPy, SciPy
- **Infrastructure**: Docker, Docker Compose
- **Testing**: pytest
