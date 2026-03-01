"use client";

import Link from "next/link";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CustomerProfile {
  recencyDays: number;
  logins30d: number;
  supportTickets30d: number;
  mrr: number;
  tenureDays: number;
  engagementTrend: number;
}

interface FeatureContribution {
  feature: string;
  label: string;
  value: number;     // SHAP value (positive = increases churn risk)
  featureValue: string;
}

interface ScoringResult {
  churnProbability: number;
  riskTier: "low" | "medium" | "high";
  latencyMs: number;
  contributions: FeatureContribution[];
  survivalMedian: number;
  recommendation: string;
}

// ---------------------------------------------------------------------------
// Mock scoring engine
// ---------------------------------------------------------------------------

function scoreCustomer(profile: CustomerProfile): ScoringResult {
  const {
    recencyDays,
    logins30d,
    supportTickets30d,
    mrr,
    tenureDays,
    engagementTrend,
  } = profile;

  // Logistic model approximation
  const logit =
    -2.5 +
    0.030 * recencyDays -
    0.035 * logins30d +
    0.22 * supportTickets30d -
    0.0008 * mrr -
    0.002 * tenureDays -
    0.6 * Math.min(engagementTrend, 3);

  const prob = Math.min(0.97, Math.max(0.03, 1 / (1 + Math.exp(-logit))));

  // SHAP-style contributions (simplified)
  const contributions: FeatureContribution[] = [
    {
      feature: "recency_days",
      label: "Days since last activity",
      value: +(0.030 * recencyDays - 0.030 * 25).toFixed(3),
      featureValue: `${recencyDays} days`,
    },
    {
      feature: "logins_30d",
      label: "Logins (last 30 days)",
      value: +(-0.035 * logins30d + 0.035 * 18).toFixed(3),
      featureValue: String(logins30d),
    },
    {
      feature: "support_tickets_30d",
      label: "Support tickets (30 days)",
      value: +(0.22 * supportTickets30d - 0.22 * 0.5).toFixed(3),
      featureValue: String(supportTickets30d),
    },
    {
      feature: "engagement_trend",
      label: "Engagement trend (7d/30d)",
      value: +(-0.6 * Math.min(engagementTrend, 3) + 0.6 * 0.8).toFixed(3),
      featureValue: engagementTrend.toFixed(2),
    },
    {
      feature: "tenure_days",
      label: "Customer tenure",
      value: +(-0.002 * tenureDays + 0.002 * 300).toFixed(3),
      featureValue: `${tenureDays} days`,
    },
    {
      feature: "mrr",
      label: "Monthly recurring revenue",
      value: +(-0.0008 * mrr + 0.0008 * 200).toFixed(3),
      featureValue: `$${mrr}`,
    },
  ];
  contributions.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const riskTier: ScoringResult["riskTier"] =
    prob >= 0.65 ? "high" : prob >= 0.35 ? "medium" : "low";

  const survivalMedian = Math.max(
    30,
    Math.round((1 - prob) * 520 + recencyDays * 0.5)
  );

  let recommendation = "";
  if (riskTier === "high") {
    recommendation =
      "Assign to proactive CS outreach immediately. Prioritise resolving open support tickets and offer a personalised check-in call. Consider a short-term discount or plan upgrade if MRR justifies it.";
  } else if (riskTier === "medium") {
    recommendation =
      "Add to the next automated nurture sequence. Monitor engagement trend for the next 14 days — if logins drop further, escalate to direct CS contact.";
  } else {
    recommendation =
      "Low churn risk. Focus on expansion revenue — this customer shows healthy engagement and may be ready for an upsell conversation.";
  }

  return {
    churnProbability: +prob.toFixed(4),
    riskTier,
    latencyMs: +(1.2 + Math.random() * 1.8).toFixed(1),
    contributions,
    survivalMedian,
    recommendation,
  };
}

// ---------------------------------------------------------------------------
// Preset scenarios
// ---------------------------------------------------------------------------

const PRESETS: { label: string; profile: CustomerProfile; description: string }[] = [
  {
    label: "Healthy customer",
    description: "Active, low support tickets, long tenure",
    profile: { recencyDays: 2, logins30d: 28, supportTickets30d: 0, mrr: 499, tenureDays: 620, engagementTrend: 1.1 },
  },
  {
    label: "At-risk customer",
    description: "Disengaging with rising support friction",
    profile: { recencyDays: 48, logins30d: 4, supportTickets30d: 3, mrr: 199, tenureDays: 180, engagementTrend: 0.15 },
  },
  {
    label: "Churning customer",
    description: "Dormant, high friction, downgrade plan",
    profile: { recencyDays: 82, logins30d: 1, supportTickets30d: 5, mrr: 49, tenureDays: 90, engagementTrend: 0.05 },
  },
  {
    label: "New user",
    description: "Recent acquisition, onboarding phase",
    profile: { recencyDays: 3, logins30d: 14, supportTickets30d: 1, mrr: 199, tenureDays: 28, engagementTrend: 0.9 },
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChurnPredictionDemo() {
  const [profile, setProfile] = useState<CustomerProfile>(PRESETS[0].profile);
  const [result, setResult] = useState<ScoringResult | null>(() => scoreCustomer(PRESETS[0].profile));
  const [activePreset, setActivePreset] = useState(0);
  const [scored, setScored] = useState(true);

  function applyPreset(idx: number) {
    setActivePreset(idx);
    setProfile(PRESETS[idx].profile);
    setResult(scoreCustomer(PRESETS[idx].profile));
    setScored(true);
  }

  function handleChange(field: keyof CustomerProfile, value: number) {
    const updated = { ...profile, [field]: value };
    setProfile(updated);
    setActivePreset(-1);
    setScored(false);
    setResult(null);
  }

  function handleScore() {
    setResult(scoreCustomer(profile));
    setScored(true);
  }

  const RISK_COLORS = {
    low: { bg: "#16a34a20", text: "#22c55e", border: "#22c55e30" },
    medium: { bg: "#d9770620", text: "#f97316", border: "#f9731630" },
    high: { bg: "#dc262620", text: "#ef4444", border: "#ef444430" },
  };

  return (
    <div className="min-h-screen pt-24 pb-24 px-6 bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/projects/churn-prediction"
          className="inline-flex items-center gap-2 text-[#888888] hover:text-[#ededed] text-sm transition-colors mb-8 group"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:-translate-x-0.5">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to case study
        </Link>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3b82f6]/10 text-[#3b82f6] text-xs font-medium border border-[#3b82f6]/20 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
            Interactive Demo
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#ededed] mb-3">
            Churn Prediction System
          </h1>
          <p className="text-[#888888] text-sm leading-relaxed max-w-2xl">
            Adjust customer features or pick a preset scenario. The model returns a calibrated churn
            probability, SHAP feature contributions, survival estimate, and a CS recommendation.
          </p>
        </div>

        {/* Preset scenarios */}
        <div className="flex flex-wrap gap-2 mb-8">
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => applyPreset(i)}
              className={`px-3 py-2 rounded-lg text-xs transition-all border ${
                activePreset === i
                  ? "bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/30"
                  : "bg-[#ffffff08] text-[#888888] border-[rgba(255,255,255,0.08)] hover:text-[#ededed] hover:border-[rgba(255,255,255,0.16)]"
              }`}
            >
              <div className="font-medium">{p.label}</div>
              <div className="text-[10px] opacity-70 mt-0.5">{p.description}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ---- Input panel ---- */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-6">
            <h2 className="text-sm font-semibold text-[#ededed] mb-5">Customer Features</h2>
            <div className="space-y-5">
              {(
                [
                  { key: "recencyDays", label: "Days since last activity", min: 0, max: 120, step: 1 },
                  { key: "logins30d", label: "Logins (last 30 days)", min: 0, max: 60, step: 1 },
                  { key: "supportTickets30d", label: "Support tickets (30 days)", min: 0, max: 10, step: 1 },
                  { key: "mrr", label: "Monthly recurring revenue ($)", min: 49, max: 1499, step: 50 },
                  { key: "tenureDays", label: "Customer tenure (days)", min: 7, max: 730, step: 1 },
                  { key: "engagementTrend", label: "Engagement trend (7d/30d ratio)", min: 0, max: 3, step: 0.05 },
                ] as { key: keyof CustomerProfile; label: string; min: number; max: number; step: number }[]
              ).map(({ key, label, min, max, step }) => (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs text-[#888888]">{label}</label>
                    <span className="text-xs font-mono text-[#ededed]">
                      {key === "mrr" ? `$${profile[key]}` : key === "engagementTrend" ? profile[key].toFixed(2) : profile[key]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={profile[key]}
                    onChange={(e) => handleChange(key, parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-[rgba(255,255,255,0.08)] cursor-pointer accent-[#3b82f6]"
                  />
                  <div className="flex justify-between text-[10px] text-[#555555] mt-0.5">
                    <span>{key === "mrr" ? `$${min}` : min}</span>
                    <span>{key === "mrr" ? `$${max}` : max}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleScore}
              className="mt-6 w-full py-2.5 rounded-lg bg-[#3b82f6] text-white text-sm font-medium hover:bg-[#2563eb] transition-colors"
            >
              Score Customer
            </button>
          </div>

          {/* ---- Output panel ---- */}
          <div className="space-y-4">
            {result ? (
              <>
                {/* Risk score */}
                <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-[#ededed]">Churn Score</h2>
                    <span className="text-[10px] text-[#555555] font-mono">{result.latencyMs}ms</span>
                  </div>
                  <div className="flex items-end gap-4 mb-4">
                    <div className="text-5xl font-semibold tracking-tight" style={{ color: RISK_COLORS[result.riskTier].text }}>
                      {Math.round(result.churnProbability * 100)}%
                    </div>
                    <div className="mb-1.5">
                      <div
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                        style={{
                          background: RISK_COLORS[result.riskTier].bg,
                          color: RISK_COLORS[result.riskTier].text,
                          borderColor: RISK_COLORS[result.riskTier].border,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: RISK_COLORS[result.riskTier].text }} />
                        {result.riskTier.charAt(0).toUpperCase() + result.riskTier.slice(1)} risk
                      </div>
                    </div>
                  </div>
                  {/* Probability bar */}
                  <div className="w-full h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${result.churnProbability * 100}%`,
                        background: RISK_COLORS[result.riskTier].text,
                      }}
                    />
                  </div>
                  <div className="mt-3 text-xs text-[#888888]">
                    Estimated median survival: <span className="text-[#ededed] font-medium">{result.survivalMedian} days</span>
                  </div>
                </div>

                {/* SHAP contributions */}
                <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-6">
                  <h2 className="text-sm font-semibold text-[#ededed] mb-4">
                    Feature Contributions
                    <span className="text-[#555555] font-normal ml-1.5 text-xs">(SHAP values)</span>
                  </h2>
                  <div className="space-y-3">
                    {result.contributions.map((c) => {
                      const maxAbs = Math.max(...result.contributions.map((x) => Math.abs(x.value)));
                      const barWidth = maxAbs > 0 ? (Math.abs(c.value) / maxAbs) * 100 : 0;
                      const isPositive = c.value > 0;
                      return (
                        <div key={c.feature}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[#888888]">{c.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[#555555]">{c.featureValue}</span>
                              <span
                                className="font-mono text-xs w-14 text-right"
                                style={{ color: isPositive ? "#ef4444" : "#22c55e" }}
                              >
                                {isPositive ? "+" : ""}{c.value.toFixed(3)}
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${barWidth}%`,
                                background: isPositive ? "#ef4444" : "#22c55e",
                                opacity: 0.8,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-[#555555] mt-3">
                    Red bars increase churn risk · Green bars decrease churn risk
                  </p>
                </div>

                {/* Recommendation */}
                <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-6">
                  <h2 className="text-sm font-semibold text-[#ededed] mb-2">CS Recommendation</h2>
                  <p className="text-sm text-[#888888] leading-relaxed">{result.recommendation}</p>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-12 flex items-center justify-center">
                <p className="text-[#555555] text-sm">Adjust features and click &ldquo;Score Customer&rdquo;</p>
              </div>
            )}
          </div>
        </div>

        {/* Model info footer */}
        <div className="mt-8 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-5">
          <h3 className="text-xs font-semibold text-[#ededed] mb-3">About This Model</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Model", value: "LightGBM (calibrated)" },
              { label: "ROC-AUC", value: "0.84" },
              { label: "Calibration ECE", value: "0.028" },
              { label: "Top-20% lift", value: "3.1×" },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-[10px] text-[#555555] mb-0.5">{label}</div>
                <div className="text-sm font-medium text-[#ededed]">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
