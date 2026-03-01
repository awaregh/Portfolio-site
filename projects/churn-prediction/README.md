# Customer Churn Prediction

> **End-to-end ML system** — from synthetic SaaS customer data through XGBoost, survival analysis, and uplift modeling to a production FastAPI scoring service with SHAP explainability and drift monitoring.

---

## Business Problem

Customer churn is one of the most costly challenges in SaaS businesses. Acquiring a new customer is typically 5–7× more expensive than retaining an existing one. This project provides a complete data science solution that:

- **Predicts** which customers are likely to churn in the next 90 days
- **Explains** the top risk factors driving each prediction (SHAP)
- **Quantifies** the business impact of retention interventions (ROI simulation)
- **Prioritises** interventions using uplift modeling (who will respond to outreach?)
- **Monitors** model health over time (PSI + KS drift detection)

---

## Architecture

```
  Raw Data (CSV / DB)
        │
        ▼
┌───────────────────┐
│   Preprocessing   │  Feature engineering · Time-based splits · Cohort generation
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Feature Builder   │  ColumnTransformer (StandardScaler + OneHotEncoder)
└────────┬──────────┘
         │
         ▼
┌──────────────────────────────────────────────────────┐
│                 Model Training                        │
│  Logistic Regression │ XGBoost/LightGBM │ CoxPH      │
│  T-Learner Uplift                                     │
└────────────────────────┬─────────────────────────────┘
                         │
                         ▼
             ┌───────────────────────┐
             │     Evaluation        │  ROC-AUC · Calibration · Lift · ROI sim
             └───────────┬───────────┘
                         │
                         ▼
             ┌───────────────────────┐
             │  SHAP Explainability  │  Global · Local · Cohort risk
             └───────────┬───────────┘
                         │
                         ▼
             ┌───────────────────────┐
             │   FastAPI Service     │  Real-time + batch scoring
             │   (Docker / port 8000)│  API-key auth
             └───────────┬───────────┘
                         │
                         ▼
             ┌───────────────────────┐
             │     Monitoring        │  PSI · KS test · Drift alerts
             └───────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Data & Features | pandas, numpy, scikit-learn |
| Gradient Boosting | XGBoost, LightGBM |
| Survival Analysis | lifelines (CoxPHFitter) |
| Uplift Modeling | LightGBM (T-Learner meta-learner) |
| Explainability | SHAP (TreeExplainer, LinearExplainer) |
| API | FastAPI, uvicorn, pydantic v2 |
| Monitoring | scipy (KS test), custom PSI |
| Testing | pytest, httpx |
| Containerisation | Docker, docker-compose |
| Notebooks | Jupyter |

---

## Project Structure

```
projects/churn-prediction/
├── src/
│   ├── preprocessing/   # Data generation, feature engineering, splits
│   ├── features/        # Feature store / ColumnTransformer builder
│   ├── models/          # LR baseline, XGBoost/LGBM, CoxPH, Uplift
│   ├── evaluation/      # Metrics, lift curves, ROI simulation
│   ├── explainability/  # SHAP wrappers
│   ├── api/             # FastAPI app, schemas, batch scorer
│   └── monitoring/      # Drift detection (PSI + KS)
├── notebooks/           # EDA notebook (full pipeline walkthrough)
├── tests/               # pytest unit + integration tests
├── docs/                # Architecture document
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── pyproject.toml
```

---

## Quick Start

### Docker (recommended)

```bash
# Clone repo and enter project directory
cd projects/churn-prediction

# Copy environment file
cp .env.example .env

# Build and start the API
docker compose up --build

# Test the health endpoint
curl http://localhost:8000/health
```

### Local Python

```bash
cd projects/churn-prediction

python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Run tests
pytest

# Start the API (will auto-train on first launch)
uvicorn src.api.main:app --reload --port 8000
```

---

## API Usage

### Health check (no auth required)

```bash
curl http://localhost:8000/health
```

```json
{"status": "ok", "version": "1.0.0"}
```

### Single customer prediction

```bash
curl -X POST http://localhost:8000/api/v1/predict \
  -H "X-API-Key: changeme-super-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "CUST-00042",
    "tenure_months": 8,
    "monthly_spend": 149.99,
    "support_tickets": 5,
    "login_frequency": 6.0,
    "feature_adoption_score": 0.22,
    "contract_type": "monthly",
    "industry": "retail"
  }'
```

```json
{
  "customer_id": "CUST-00042",
  "churn_probability": 0.7341,
  "churn_risk_tier": "high",
  "top_risk_factors": ["feature_adoption_score", "support_tickets", "login_frequency", "tenure_months", "is_annual"],
  "survival_months_p50": null
}
```

### Batch prediction

```bash
curl -X POST http://localhost:8000/api/v1/predict/batch \
  -H "X-API-Key: changeme-super-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "customers": [
      {"customer_id":"A1","tenure_months":24,"monthly_spend":300,"support_tickets":1,"login_frequency":20,"feature_adoption_score":0.8,"contract_type":"annual","industry":"tech"},
      {"customer_id":"A2","tenure_months":3,"monthly_spend":80,"support_tickets":7,"login_frequency":3,"feature_adoption_score":0.1,"contract_type":"monthly","industry":"retail"}
    ]
  }'
```

### Batch CSV scoring (offline)

```bash
python -m src.api.batch_score customers.csv predictions.csv
```

### Model info

```bash
curl http://localhost:8000/api/v1/model/info \
  -H "X-API-Key: changeme-super-secret-key"
```

---

## Model Performance Summary

> Performance evaluated on a time-based holdout (last 3 months of observation dates).

| Model | ROC-AUC | Brier Score | Notes |
|-------|---------|-------------|-------|
| Logistic Regression | ~0.78 | ~0.15 | Interpretable baseline, class-weighted |
| XGBoost | ~0.84 | ~0.12 | Best binary classifier, early stopping |
| LightGBM | ~0.83 | ~0.12 | Similar to XGBoost, faster training |
| Cox PH | ~0.79 C-index | — | Time-to-event; survival curves |
| T-Learner Uplift | — | — | CATE estimation, not ranking metric |

> *Metrics are approximate on 5,000-row synthetic data. Expect higher variance on small datasets.*

---

## Running Tests

```bash
# All tests
pytest

# With coverage
pytest --cov=src --cov-report=term-missing

# Single module
pytest tests/test_api.py -v
```

---

## Resume Bullets

- **Built an end-to-end SaaS churn prediction system** using XGBoost and LightGBM with class-imbalance handling, achieving ROC-AUC > 0.82 on time-based holdout splits across 5 K+ synthetic customer records.
- **Implemented survival analysis** with Cox Proportional Hazards (lifelines) to model time-to-churn distributions and generate per-customer 12-month survival probability estimates for proactive retention outreach.
- **Developed uplift modeling** (T-Learner meta-learner) with two independent LightGBM classifiers to estimate Conditional Average Treatment Effect (CATE), enabling data-driven targeting of retention interventions.
- **Designed a production-ready FastAPI microservice** with API-key authentication, real-time single and batch scoring endpoints, automatic cold-start model training, and Docker / docker-compose deployment.
- **Integrated SHAP explainability and drift monitoring** (PSI + KS test) to provide per-prediction top-risk-factor attribution and proactively detect feature or prediction distribution shifts in production.

---

## LinkedIn Description

This project demonstrates a production-quality customer churn prediction pipeline covering the full ML lifecycle: from synthetic data generation and feature engineering through gradient boosting, survival analysis, and uplift modeling to a FastAPI scoring service with SHAP explainability and drift monitoring. Designed as a portfolio piece showcasing ML engineering best practices including time-based validation, Docker deployment, and business impact simulation. Open to collaboration — feel free to fork and adapt for real customer data!
