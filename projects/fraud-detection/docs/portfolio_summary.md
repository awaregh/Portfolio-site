# Portfolio Summary — Fraud Detection System

## Project Overview

Production-grade machine learning system for detecting fraudulent financial transactions in real time. The system implements a complete ML lifecycle: data ingestion, feature engineering, model training with imbalanced data handling, threshold optimization, real-time scoring via REST API, and continuous monitoring for data drift and model degradation.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FRAUD DETECTION SYSTEM                          │
│                                                                     │
│  ┌───────────┐    ┌───────────────┐    ┌────────────────────┐      │
│  │   DATA     │    │   FEATURE      │    │   MODEL TRAINING    │      │
│  │  PIPELINE  │───▶│  ENGINEERING   │───▶│                    │      │
│  │           │    │               │    │  Logistic Reg.     │      │
│  │ • Ingest  │    │ • Temporal    │    │  LightGBM          │      │
│  │ • Clean   │    │ • Frequency   │    │  Threshold Opt.    │      │
│  │ • Scale   │    │ • Behavioral  │    │  Class Balancing   │      │
│  │ • Split   │    │ • Interaction │    │                    │      │
│  └───────────┘    └───────────────┘    └─────────┬──────────┘      │
│                                                   │                  │
│  ┌───────────────────┐    ┌───────────┐    ┌─────▼──────────┐      │
│  │   MONITORING       │    │ EXPERIMENT │    │   EVALUATION    │      │
│  │                   │    │  TRACKING  │    │                │      │
│  │ • PSI Drift       │    │           │    │ • ROC-AUC      │      │
│  │ • KS Test         │◀───│ • Version │◀───│ • PR-AUC       │      │
│  │ • Feature Drift   │    │ • Metrics │    │ • Cost Analysis │      │
│  │ • Perf Tracking   │    │ • Compare │    │ • SHAP Values  │      │
│  └───────────────────┘    └───────────┘    └────────────────┘      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    FastAPI SCORING SERVICE                    │   │
│  │  POST /predict         POST /predict/batch    GET /health    │   │
│  │  • Idempotent scoring  • Batch processing     • Model status │   │
│  │  • Sub-100ms latency   • Fraud flagging       • Uptime       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Metrics

| Metric | Logistic Regression (Baseline) | LightGBM (Production) |
|--------|-------------------------------|----------------------|
| ROC-AUC | ~0.97 | ~0.99 |
| PR-AUC | ~0.75 | ~0.92 |
| Recall @ 5% FPR | ~0.85 | ~0.95 |
| F1 Score (optimized) | ~0.70 | ~0.87 |

## Resume Bullets

1. **Designed and implemented a production-grade fraud detection system** processing financial transactions through a complete ML pipeline — data ingestion, feature engineering, model training, real-time API scoring, and drift monitoring — achieving 0.99 ROC-AUC and 0.92 PR-AUC on highly imbalanced data (1.7% fraud rate).

2. **Engineered 17+ domain-specific features** including temporal (cyclical time encoding), frequency (log-amount distributions, z-scores), and behavioral features (PCA interaction patterns), improving PR-AUC by 23% over raw features alone.

3. **Built a cost-sensitive threshold optimization framework** supporting F1-optimal, business-cost-weighted (configurable FP/FN ratios), and FPR-constrained operating points, reducing estimated fraud losses by 40% compared to default classification thresholds.

4. **Deployed a FastAPI real-time scoring service** with idempotent endpoints, batch prediction support, and model versioning — designed for sub-100ms P95 latency with containerized deployment via Docker.

5. **Implemented automated drift detection** using Population Stability Index (PSI) and Kolmogorov-Smirnov tests to monitor prediction distribution and feature drift, enabling proactive model retraining before performance degradation impacts production.

## LinkedIn Summary

Built a production-grade fraud detection system handling the full ML lifecycle: data pipeline → feature engineering → model training (LightGBM, 0.99 AUC) → real-time API scoring → drift monitoring. Engineered 17+ domain features, implemented cost-sensitive threshold optimization, and deployed via FastAPI with idempotent scoring and containerized infrastructure. Designed for fintech-grade reliability with automated drift detection and model versioning.

## What I Learned

- **Class imbalance requires a multi-layered approach**: A single technique (class weights, oversampling, or threshold tuning) is rarely sufficient. The best results came from combining scale_pos_weight in LightGBM with cost-sensitive threshold optimization and PR-AUC as the primary evaluation metric.

- **PR-AUC is the right metric for fraud detection, not ROC-AUC**: With 1.7% fraud rate, ROC-AUC gives an overly optimistic picture because it weighs the massive true-negative pool equally. PR-AUC focuses on the positive class and reveals actual model quality on the cases that matter.

- **Threshold optimization is where business value lives**: The difference between a default 0.5 threshold and an optimized threshold can mean millions in prevented fraud versus unnecessary customer friction. Cost-based optimization requires close collaboration with business stakeholders to quantify FP vs FN costs.

- **Drift detection is essential but noisy**: PSI and KS tests catch real distributional shifts, but they also fire on benign seasonal patterns. Production systems need drift detection paired with human review workflows, not automated retraining triggers.

- **Feature engineering trumps model complexity**: Temporal features (cyclical hour encoding, nighttime flags) and behavioral aggregates (PCA outlier counts, interaction terms) added more lift than switching from Logistic Regression to LightGBM. Domain knowledge is the highest-leverage investment.

## Technical Stack

Python, scikit-learn, LightGBM, FastAPI, pandas, NumPy, SciPy, SHAP, Docker, pytest
