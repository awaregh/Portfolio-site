"""
Retention impact simulation.

This module translates model predictions into business-language outcomes:

  "If we intervene on the top N customers by churn probability, what
   is the expected MRR saved, and what does that cost per customer?"

Inputs:
  - Customer-level churn probabilities
  - Customer MRR
  - Intervention effect size (lift in retention probability)
  - Intervention cost per customer

Outputs:
  - Expected MRR saved at each intervention depth
  - ROI curve
  - Break-even point

This kind of simulation is what turns a data science project into a
business case that gets budget approved.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass
class RetentionSimResult:
    """Results of a retention campaign simulation."""
    summary: pd.DataFrame        # one row per intervention depth
    best_depth: int              # optimal number of customers to contact
    expected_mrr_saved: float    # MRR saved at optimal depth
    roi: float                   # ROI at optimal depth


def simulate_retention_impact(
    customer_ids: np.ndarray | pd.Series,
    churn_probs: np.ndarray,
    mrr: np.ndarray | pd.Series,
    intervention_lift: float = 0.20,
    cost_per_customer: float = 5.0,
    n_steps: int = 20,
) -> RetentionSimResult:
    """Simulate retention campaign ROI across intervention depths.

    Parameters
    ----------
    customer_ids:
        Unique customer identifiers.
    churn_probs:
        Model-predicted churn probability for each customer.
    mrr:
        Monthly recurring revenue per customer.
    intervention_lift:
        Absolute reduction in churn probability from intervention.
        e.g. 0.20 means a customer with 70% predicted churn becomes 50%.
    cost_per_customer:
        Cost of the intervention (email + CS time, etc.) in dollars.
    n_steps:
        Number of depth thresholds to evaluate (evenly spaced 0–100%).

    Returns
    -------
    RetentionSimResult
    """
    customer_ids = np.asarray(customer_ids)
    churn_probs = np.asarray(churn_probs)
    mrr = np.asarray(mrr)

    n = len(customer_ids)
    order = np.argsort(churn_probs)[::-1]
    sorted_probs = churn_probs[order]
    sorted_mrr = mrr[order]

    rows = []
    depths = np.linspace(0, 1, n_steps + 1)[1:]
    for frac in depths:
        k = max(1, int(frac * n))
        targeted_probs = sorted_probs[:k]
        targeted_mrr = sorted_mrr[:k]

        # Without intervention: expected MRR lost
        mrr_at_risk = (targeted_probs * targeted_mrr).sum()
        # With intervention: churn probability reduced by lift (floored at 0)
        reduced_probs = np.maximum(targeted_probs - intervention_lift, 0)
        mrr_at_risk_after = (reduced_probs * targeted_mrr).sum()

        expected_mrr_saved = mrr_at_risk - mrr_at_risk_after
        campaign_cost = k * cost_per_customer
        net_value = expected_mrr_saved - campaign_cost
        roi = (net_value / max(campaign_cost, 1)) * 100

        rows.append(
            {
                "fraction_targeted": round(frac, 3),
                "n_targeted": k,
                "expected_mrr_saved": round(float(expected_mrr_saved), 2),
                "campaign_cost": round(float(campaign_cost), 2),
                "net_value": round(float(net_value), 2),
                "roi_pct": round(float(roi), 1),
            }
        )

    summary = pd.DataFrame(rows)
    best_idx = summary["net_value"].idxmax()
    best_row = summary.loc[best_idx]

    return RetentionSimResult(
        summary=summary,
        best_depth=int(best_row["n_targeted"]),
        expected_mrr_saved=float(best_row["expected_mrr_saved"]),
        roi=float(best_row["roi_pct"]),
    )
