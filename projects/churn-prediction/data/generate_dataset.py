"""
Synthetic dataset generator for churn prediction development and testing.

This generates a realistic SaaS customer dataset with:
  - Subscription and event history
  - Ground-truth churn labels
  - Controlled cohort structure for testing cohort analysis code
  - Imbalanced churn rate (≈12%) to reflect real-world conditions

Usage:
    python -m data.generate_dataset --n-customers 5000 --output data/raw/events.csv
"""

from __future__ import annotations

import argparse
import random
from pathlib import Path

import numpy as np
import pandas as pd


def generate_dataset(
    n_customers: int = 2000,
    seed: int = 42,
    churn_rate: float = 0.12,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Generate synthetic SaaS subscription events and customer labels.

    Returns
    -------
    events : pd.DataFrame
        Long-format event log (one row per event per customer).
    customers : pd.DataFrame
        Customer-level ground truth (one row per customer).
    """
    rng = np.random.default_rng(seed)
    random.seed(seed)

    plans = {"starter": 49, "growth": 199, "business": 499, "enterprise": 1499}
    plan_names = list(plans.keys())
    plan_weights = [0.35, 0.40, 0.18, 0.07]

    start_date = pd.Timestamp("2023-01-01")
    end_date = pd.Timestamp("2024-12-31")

    customer_rows = []
    event_rows = []

    for i in range(n_customers):
        customer_id = f"cust_{i:05d}"
        acquisition_date = start_date + pd.Timedelta(
            days=int(rng.integers(0, (end_date - start_date).days - 180))
        )
        plan = rng.choice(plan_names, p=plan_weights)
        mrr = plans[plan] + rng.normal(0, plans[plan] * 0.05)

        # Simulate churn probability based on plan and random factors
        base_churn = churn_rate
        if plan == "starter":
            base_churn *= 1.6
        elif plan == "enterprise":
            base_churn *= 0.4

        churned = rng.random() < base_churn
        tenure_days = int(rng.integers(30, 550))
        churn_date = acquisition_date + pd.Timedelta(days=tenure_days) if churned else None

        customer_rows.append(
            {
                "customer_id": customer_id,
                "acquisition_date": acquisition_date.date(),
                "plan_id": plan,
                "mrr": round(float(mrr), 2),
                "churned": int(churned),
                "tenure_days": tenure_days,
                "churn_date": churn_date.date() if churn_date else None,
            }
        )

        # Generate events
        n_days = min(tenure_days, (end_date - acquisition_date).days)
        if churned:
            # Disengagement pattern: fewer events toward end
            daily_rate = rng.integers(1, 5)
        else:
            daily_rate = rng.integers(2, 10)

        for day_offset in range(n_days):
            event_date = acquisition_date + pd.Timedelta(days=day_offset)
            n_events = rng.poisson(daily_rate)
            for _ in range(n_events):
                event_type = rng.choice(
                    ["login", "feature_use", "support_ticket", "api_call"],
                    p=[0.50, 0.35, 0.10, 0.05],
                )
                event_rows.append(
                    {
                        "customer_id": customer_id,
                        "event_date": event_date.date(),
                        "event_type": event_type,
                        "plan_id": plan,
                        "mrr": round(float(mrr), 2),
                    }
                )

    customers = pd.DataFrame(customer_rows)
    events = pd.DataFrame(event_rows)
    return events, customers


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic churn dataset")
    parser.add_argument("--n-customers", type=int, default=2000)
    parser.add_argument("--output-dir", type=str, default="data/raw")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    events, customers = generate_dataset(n_customers=args.n_customers, seed=args.seed)
    events.to_csv(output_dir / "events.csv", index=False)
    customers.to_csv(output_dir / "customers.csv", index=False)
    print(f"Generated {len(customers)} customers, {len(events)} events")
    print(f"Churn rate: {customers['churned'].mean():.1%}")


if __name__ == "__main__":
    main()
