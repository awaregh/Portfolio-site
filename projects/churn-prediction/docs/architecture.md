# Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Churn Prediction System                       │
└──────────────────────────────────────────────────────────────────────┘

  Raw Data (CSV / DB)
        │
        ▼
┌───────────────────┐
│   Preprocessing   │  generate_synthetic_dataset()
│   pipeline.py     │  add_engineered_features()
│                   │  time_based_split()
│                   │  generate_cohorts()
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Feature Engineering│  build_feature_matrix()
│   builder.py      │  ColumnTransformer (StandardScaler + OHE)
└────────┬──────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│                    Model Training                       │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Logistic   │  │   XGBoost /  │  │  CoxPH       │  │
│  │ Regression  │  │   LightGBM   │  │  Survival    │  │
│  │ baseline.py │  │ gradient_    │  │  survival.py │  │
│  └─────────────┘  │ boosting.py  │  └──────────────┘  │
│                   └──────────────┘                     │
│  ┌──────────────────────────────┐                      │
│  │  T-Learner Uplift Modeling   │                      │
│  │       uplift.py              │                      │
│  └──────────────────────────────┘                      │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────┐
│             Evaluation                 │
│             metrics.py                 │
│  ROC-AUC · Calibration · Lift Curve   │
│  Retention Impact Simulation           │
└────────────────────────┬───────────────┘
                         │
                         ▼
┌────────────────────────────────────────┐
│          SHAP Explainability           │
│          shap_explainer.py             │
│  Global · Local · Cohort Risk          │
└────────────────────────┬───────────────┘
                         │
                         ▼
┌────────────────────────────────────────┐
│           FastAPI Service              │
│           main.py                      │
│  POST /api/v1/predict                  │
│  POST /api/v1/predict/batch            │
│  GET  /api/v1/model/info               │
│  GET  /health                          │
└────────────────────────┬───────────────┘
                         │
                         ▼
┌────────────────────────────────────────┐
│           Monitoring                   │
│           drift.py                     │
│  PSI · KS Test · Drift Alerts          │
└────────────────────────────────────────┘
```

---

## Component Descriptions

| Component | File | Responsibility |
|-----------|------|----------------|
| **Preprocessing** | `src/preprocessing/pipeline.py` | Synthetic data generation, feature engineering, time-based splits, cohort generation |
| **Feature Builder** | `src/features/builder.py` | Defines feature lists; builds sklearn ColumnTransformer for numeric scaling and categorical encoding |
| **Baseline Model** | `src/models/baseline.py` | Class-weighted Logistic Regression — fast, interpretable, production baseline |
| **Gradient Boosting** | `src/models/gradient_boosting.py` | XGBClassifier and LGBMClassifier with early stopping; handles class imbalance via `scale_pos_weight` |
| **Survival Analysis** | `src/models/survival.py` | CoxPH fitter via lifelines — models *time-to-churn* and outputs per-customer survival curves |
| **Uplift Modeling** | `src/models/uplift.py` | T-Learner meta-learner using two LightGBM models to estimate individual treatment effect (CATE) |
| **Evaluation** | `src/evaluation/metrics.py` | ROC-AUC, calibration curve, decile lift chart, retention ROI simulation |
| **Explainability** | `src/explainability/shap_explainer.py` | SHAP global/local/cohort explanations using TreeExplainer and LinearExplainer |
| **API** | `src/api/main.py` | FastAPI app with API-key auth; real-time and batch scoring endpoints; model auto-training on cold start |
| **Batch Scoring** | `src/api/batch_score.py` | CLI script for offline CSV batch scoring |
| **Monitoring** | `src/monitoring/drift.py` | PSI and KS-based prediction + feature drift detection |

---

## Data Flow

1. **Ingestion** — Raw customer events arrive as a CSV or from a data warehouse query.
2. **Preprocessing** — Records are cleaned, tenure calculated, and categorical values validated.
3. **Feature Engineering** — Derived features (normalised spend, ticket rate, tenure bucket, contract flag) are appended.
4. **Model Scoring** — The preprocessor transforms raw features; the primary model (XGBoost) returns a churn probability.
5. **Explainability** — SHAP values are computed for top-N risk factors returned in the API response.
6. **Business Simulation** — Retention ROI is estimated using CLV, intervention cost, and conversion rate assumptions.
7. **Monitoring** — Scheduled jobs compare reference distributions against current scoring windows using PSI and KS.

---

## Resume Bullets

- **Built an end-to-end SaaS churn prediction system** using XGBoost and LightGBM with class-imbalance handling, achieving ROC-AUC > 0.82 on time-based holdout splits across 5 K+ synthetic customer records.
- **Implemented survival analysis** with Cox Proportional Hazards (lifelines) to model time-to-churn distributions and generate per-customer 12-month survival probability estimates for proactive retention outreach.
- **Developed uplift modeling** (T-Learner meta-learner) with two independent LightGBM classifiers to estimate Conditional Average Treatment Effect (CATE), enabling data-driven targeting of retention interventions.
- **Designed a production-ready FastAPI microservice** with API-key authentication, real-time single and batch scoring endpoints, automatic cold-start model training, and Docker / docker-compose deployment.
- **Integrated SHAP explainability and drift monitoring** (PSI + KS test) to provide per-prediction top-risk-factor attribution and proactively detect feature or prediction distribution shifts in production.

---

## LinkedIn Description

This project demonstrates a production-quality customer churn prediction pipeline covering the full ML lifecycle: from synthetic data generation and feature engineering through gradient boosting, survival analysis, and uplift modeling to a FastAPI scoring service with SHAP explainability and drift monitoring. Designed as a portfolio piece showcasing ML engineering best practices including time-based validation, Docker deployment, and business impact simulation.
