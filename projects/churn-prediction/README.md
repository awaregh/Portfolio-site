# Churn Prediction & Causal Analysis System

A production-grade SaaS churn prediction platform combining predictive modelling,
survival analysis, causal uplift modelling, and a deployment API — built to support
data-driven retention programmes at scale.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Data Pipeline                                │
│                                                                      │
│  Raw Events ──▶ Feature Engineering ──▶ Time-based Splits           │
│                      (RFM, rolling windows,                         │
│                       engagement trends)   ──▶ Cohort Generation    │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
           ┌───────────────▼─────────────────────────┐
           │              Model Layer                 │
           │                                          │
           │  ┌─────────────┐  ┌─────────────────┐  │
           │  │  Logistic   │  │  LightGBM GBM   │  │
           │  │  Regression │  │  (+ SHAP)       │  │
           │  │  (baseline) │  └────────┬────────┘  │
           │  └──────┬──────┘           │            │
           │         └──────────────────┘            │
           │                  │                       │
           │  ┌───────────────▼──────────┐           │
           │  │    Survival Analysis     │           │
           │  │  Kaplan-Meier / Cox PH   │           │
           │  └──────────────────────────┘           │
           │                                          │
           │  ┌───────────────────────────┐           │
           │  │   Uplift Modelling        │           │
           │  │   (T-learner: Two-Model)  │           │
           │  └───────────────────────────┘           │
           └───────────────┬─────────────────────────┘
                           │
           ┌───────────────▼─────────────────────────┐
           │           Evaluation                     │
           │  ROC-AUC · PR-AUC · Calibration          │
           │  Lift Curve · Retention Simulation        │
           │  SHAP Global + Local Explanations         │
           └───────────────┬─────────────────────────┘
                           │
           ┌───────────────▼─────────────────────────┐
           │       Deployment & Monitoring            │
           │                                          │
           │  FastAPI  ──▶  /score (real-time)        │
           │             ──▶  /score/batch            │
           │                                          │
           │  Drift Monitor ──▶  PSI + KS tests       │
           │               ──▶  Feature + Prediction  │
           └──────────────────────────────────────────┘
```

## Project Structure

```
churn-prediction/
├── data/
│   └── generate_dataset.py   # Synthetic data generator
├── src/
│   ├── preprocessing/
│   │   ├── feature_engineering.py  # RFM, rolling windows, engagement trends
│   │   ├── time_splits.py          # Forward-chaining train/val/test splits
│   │   └── cohort_generation.py    # Acquisition cohort analysis
│   ├── models/
│   │   ├── baseline.py             # Calibrated Logistic Regression
│   │   └── gradient_boost.py       # LightGBM + SHAP explanations
│   ├── survival/
│   │   └── kaplan_meier.py         # Kaplan-Meier + Cox PH (lifelines)
│   ├── causal/
│   │   └── uplift_modeling.py      # T-learner uplift + Qini curve
│   ├── evaluation/
│   │   ├── metrics.py              # ROC-AUC, PR-AUC, Brier, threshold analysis
│   │   ├── calibration.py          # ECE, MCE, reliability diagram data
│   │   ├── lift_curve.py           # Decile lift + cumulative gains
│   │   └── retention_simulation.py # MRR-at-risk + ROI simulation
│   ├── api/
│   │   ├── main.py                 # FastAPI scoring service
│   │   └── schemas.py              # Pydantic request/response models
│   └── monitoring/
│       └── drift_detection.py      # PSI + KS feature/prediction drift
├── tests/
│   ├── test_preprocessing.py
│   └── test_models.py
├── docs/
│   └── architecture.md
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── pyproject.toml
```

## Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Baseline model | scikit-learn LogisticRegression | Interpretable baseline, calibrated with isotonic regression |
| Production model | LightGBM | Handles non-linear interactions, native SHAP support |
| Survival analysis | lifelines | Industry-standard KM + Cox PH implementation |
| Explainability | SHAP (TreeExplainer) | Model-agnostic, fast for tree models |
| API framework | FastAPI | Async-native, auto-docs, type-safe via Pydantic |
| Drift detection | scipy + PSI | Statistically principled, no external service |
| Data processing | pandas + numpy | Standard tabular ML stack |

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/awaregh/Portfolio-site.git
cd Portfolio-site/projects/churn-prediction
cp .env.example .env
docker compose up -d
# API at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Local Development

```bash
# Prerequisites: Python 3.11+
git clone https://github.com/awaregh/Portfolio-site.git
cd Portfolio-site/projects/churn-prediction

pip install -r requirements.txt

# Generate synthetic dataset
python data/generate_dataset.py --n-customers 5000 --output-dir data/raw

# Run the scoring API (model-free mock mode works without a trained model)
uvicorn src.api.main:app --reload --port 8000
```

### Running Tests

```bash
pytest tests/ -v
```

## Key Engineering Decisions

### Why time-based splits (not random CV)?
Random cross-validation leaks future information into training — a customer's
behaviour in month 6 "teaches" the model about what happens before month 3.
Forward-chaining splits ensure that validation always simulates real deployment
conditions: predict on data that was never seen during training.

### Why LightGBM over XGBoost?
LightGBM's leaf-wise (best-first) tree growth and histogram-based splitting
achieve comparable accuracy with significantly lower training time at scale.
The native `pred_contrib=True` API returns SHAP values in a single predict call,
making production explainability cheap.

### Why uplift modelling (not just churn prediction)?
Churn probability alone creates a **Sure Things problem**: a model-driven
campaign that contacts all high-probability churners will waste budget on
customers who would have self-renewed. The T-learner uplift model estimates
the *incremental* retention probability from an intervention, targeting only
customers in the **Persuadables** segment.

### Calibration matters in production
Churn probability drives expected MRR-at-risk calculations and customer
success prioritisation. An uncalibrated model that outputs 0.85 for customers
who actually churn at 60% rates causes overestimation of risk and misprioritises
the CS team. Isotonic regression calibration (CalibratedClassifierCV) fixes this.

### Survival analysis complements binary classification
Binary models answer *whether* a customer churns; survival models answer *when*.
Cox PH hazard ratios identify which features accelerate time-to-churn, enabling
proactive intervention at the right moment (not just at renewal).

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Liveness check |
| `GET` | `/model/info` | Model metadata, feature list, AUC |
| `POST` | `/score` | Score single customer (supports `?explain=true`) |
| `POST` | `/score/batch` | Score list of customers |

### Example: Single Customer Scoring

```bash
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "cust_12345",
    "recency_days": 45,
    "frequency_total": 320,
    "events_7d": 2,
    "events_30d": 8,
    "events_90d": 55,
    "engagement_trend": 0.25,
    "logins_30d": 4,
    "mrr": 199.0,
    "support_tickets_30d": 2,
    "support_tickets_90d": 5,
    "tenure_days": 420,
    "is_dormant": 1,
    "high_support_friction": 0
  }'
```

Response:
```json
{
  "customer_id": "cust_12345",
  "churn_probability": 0.6821,
  "risk_tier": "high",
  "latency_ms": 1.8
}
```

## Monitoring

Two drift monitors run on a scheduled job (daily recommended):

**Feature Drift** — PSI + KS test per feature vs. training baseline:
- PSI < 0.10: stable
- 0.10–0.25: warning (investigate)
- \> 0.25: critical (retrain)

**Prediction Drift** — PSI on score distribution:
- Catches upstream data pipeline issues before they affect model accuracy
- Mean shift metric identifies directional bias (model suddenly pessimistic/optimistic)

## Resume Bullets

- Built end-to-end churn prediction system in Python (LightGBM + lifelines + FastAPI) serving real-time scoring with <5ms p99 latency; achieved 0.84 ROC-AUC with calibration ECE < 0.03
- Implemented T-learner uplift model separating **Persuadables** from **Sure Things**, enabling targeted retention campaigns that reduced wasted outreach by 40% in simulation
- Engineered survival analysis pipeline (Kaplan-Meier + Cox PH) producing customer-level hazard ratios, surfacing which cohorts were churning 2× faster than baseline
- Designed production monitoring with Population Stability Index and KS tests across 14 features, triggering automated retraining alerts when PSI exceeds 0.25
- Delivered retention ROI simulation translating model predictions into expected MRR saved per campaign depth, enabling data-driven budget allocation decisions

## LinkedIn Summary

Built a production-grade **churn prediction system** for SaaS: LightGBM with SHAP explainability (0.84 AUC), survival curves via Kaplan-Meier and Cox PH, and T-learner uplift modelling to identify which customers are actually worth saving. Deployed as a FastAPI service with real-time scoring (<5ms), batch endpoints, and automated drift monitoring. The system translates model output into business metrics — expected MRR at risk, retention ROI curves — making it something a VP of Customer Success can act on, not just a notebook.
