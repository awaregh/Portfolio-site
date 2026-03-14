"use client";

import Link from "next/link";
import { useState } from "react";

interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  category: string;
  country: string;
  cardPresent: boolean;
  hourOfDay: number;
}

interface ScoringResult {
  txId: string;
  tx: Transaction;
  score: number;
  decision: "approve" | "review" | "decline";
  riskFactors: string[];
  latencyMs: number;
  modelVersion: string;
}

const SCENARIOS: { label: string; description: string; tx: Transaction }[] = [
  {
    label: "Normal Purchase",
    description: "Low-value in-store grocery run during business hours",
    tx: {
      id: "txn-normal",
      amount: 42.5,
      merchant: "Whole Foods",
      category: "grocery",
      country: "US",
      cardPresent: true,
      hourOfDay: 14,
    },
  },
  {
    label: "Suspicious Online",
    description: "Mid-value CNP transaction at unusual hour",
    tx: {
      id: "txn-suspicious",
      amount: 389.0,
      merchant: "ElectroShop Online",
      category: "electronics",
      country: "US",
      cardPresent: false,
      hourOfDay: 2,
    },
  },
  {
    label: "High-Risk Foreign",
    description: "Large card-not-present charge from an unfamiliar country",
    tx: {
      id: "txn-high-risk",
      amount: 2450.0,
      merchant: "LuxStore International",
      category: "luxury",
      country: "NG",
      cardPresent: false,
      hourOfDay: 3,
    },
  },
];

function scoreTransaction(tx: Transaction): Omit<ScoringResult, "txId"> {
  const riskFactors: string[] = [];
  let score = 0.05;

  if (tx.amount > 1000) { score += 0.35; riskFactors.push("high transaction amount"); }
  else if (tx.amount > 300) { score += 0.15; riskFactors.push("above-average amount"); }

  if (!tx.cardPresent) { score += 0.18; riskFactors.push("card not present"); }

  if (tx.hourOfDay < 5 || tx.hourOfDay > 23) { score += 0.2; riskFactors.push("unusual transaction hour"); }

  if (!["US", "GB", "CA", "AU", "DE", "FR"].includes(tx.country)) {
    score += 0.25;
    riskFactors.push("high-risk country");
  }

  if (tx.category === "luxury") { score += 0.1; riskFactors.push("luxury merchant category"); }
  if (tx.category === "electronics" && !tx.cardPresent) { score += 0.08; riskFactors.push("CNP electronics purchase"); }

  score = Math.min(0.99, score + Math.random() * 0.04 - 0.02);
  score = Math.max(0.01, score);

  const decision: ScoringResult["decision"] =
    score >= 0.72 ? "decline" : score >= 0.38 ? "review" : "approve";

  return {
    tx,
    score,
    decision,
    riskFactors,
    latencyMs: Math.round(8 + Math.random() * 18),
    modelVersion: "lgbm-v4.2.1",
  };
}

const DECISION_STYLES: Record<ScoringResult["decision"], { label: string; color: string; bg: string; border: string }> = {
  approve: { label: "APPROVED", color: "#22c55e", bg: "bg-[#22c55e]/10", border: "border-[#22c55e]/30" },
  review:  { label: "REVIEW",   color: "#f59e0b", bg: "bg-[#f59e0b]/10", border: "border-[#f59e0b]/30" },
  decline: { label: "DECLINED", color: "#ef4444", bg: "bg-[#ef4444]/10", border: "border-[#ef4444]/30" },
};

let txCounter = 0;

export default function FraudDetectionDemo() {
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [results, setResults] = useState<ScoringResult[]>([]);
  const [scoring, setScoring] = useState(false);
  const [scenarioRunCounts, setScenarioRunCounts] = useState<number[]>([0, 0, 0]);

  async function runScoring() {
    if (scoring) return;
    setScoring(true);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 500));
    const tx = { ...SCENARIOS[selectedScenario].tx, id: `txn-${(++txCounter).toString().padStart(5, "0")}` };
    const result = scoreTransaction(tx);
    setResults((prev) => [{ txId: tx.id, ...result }, ...prev].slice(0, 30));
    setScenarioRunCounts((prev) => prev.map((c, i) => (i === selectedScenario ? c + 1 : c)));
    setScoring(false);
  }

  const latest = results[0];
  const approved = results.filter((r) => r.decision === "approve").length;
  const reviewed = results.filter((r) => r.decision === "review").length;
  const declined = results.filter((r) => r.decision === "decline").length;
  const avgLatency = results.length
    ? Math.round(results.reduce((a, r) => a + r.latencyMs, 0) / results.length)
    : null;

  return (
    <div className="min-h-screen pt-24 pb-24 px-6 bg-[#f0f7ff]">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/projects/fraud-detection"
          className="inline-flex items-center gap-2 text-[#57789a] hover:text-[#1a2f45] text-sm transition-colors mb-8 group"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:-translate-x-0.5">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to case study
        </Link>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3d9bd4]/10 text-[#3d9bd4] text-xs font-medium border border-[#3d9bd4]/20 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3d9bd4] animate-pulse" />
            Interactive Demo
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1a2f45] mb-3">
            Fraud Detection System
          </h1>
          <p className="text-[#57789a] text-sm leading-relaxed max-w-xl">
            Select a transaction scenario and press{" "}
            <strong className="text-[#1a2f45]">Score Transaction</strong> to see the LightGBM
            model evaluate it in real time — including fraud score, risk factors, and the
            approve / review / decline decision.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Scored", value: results.length.toString() },
            { label: "Approved",     value: approved.toString(),  color: "#22c55e" },
            { label: "Flagged",      value: reviewed.toString(),  color: "#f59e0b" },
            { label: "Declined",     value: declined.toString(),  color: "#ef4444" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-4">
              <div className="text-xs text-[#57789a] mb-1">{m.label}</div>
              <div className="text-xl font-semibold font-mono" style={{ color: m.color ?? "#1a2f45" }}>{m.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scenario selector + controls */}
          <div className="space-y-4">
            <div className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-5">
              <p className="text-xs text-[#57789a] uppercase tracking-widest font-medium mb-3">Transaction Scenario</p>
              <div className="space-y-2">
                {SCENARIOS.map((s, i) => (
                  <button
                    key={s.label}
                    onClick={() => { if (!scoring) setSelectedScenario(i); }}
                    className={`w-full text-left rounded-lg border p-3 transition-all ${
                      selectedScenario === i
                        ? "border-[#3d9bd4]/50 bg-[#3d9bd4]/05"
                        : "border-[rgba(61,155,212,0.10)] hover:border-[rgba(61,155,212,0.16)]"
                    } ${scoring ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="text-xs font-medium text-[#1a2f45] mb-0.5">{s.label}</div>
                    <div className="text-xs text-[#57789a]">{s.description}</div>
                    {scenarioRunCounts[i] > 0 && (
                      <div className="text-xs text-[#3d9bd4] mt-1">{scenarioRunCounts[i]}× scored</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction details */}
            <div className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-5">
              <p className="text-xs text-[#57789a] uppercase tracking-widest font-medium mb-3">Transaction Details</p>
              <div className="space-y-2">
                {[
                  { k: "Amount",       v: `$${SCENARIOS[selectedScenario].tx.amount.toFixed(2)}` },
                  { k: "Merchant",     v: SCENARIOS[selectedScenario].tx.merchant },
                  { k: "Category",     v: SCENARIOS[selectedScenario].tx.category },
                  { k: "Country",      v: SCENARIOS[selectedScenario].tx.country },
                  { k: "Card Present", v: SCENARIOS[selectedScenario].tx.cardPresent ? "Yes" : "No" },
                  { k: "Hour (UTC)",   v: `${SCENARIOS[selectedScenario].tx.hourOfDay}:00` },
                ].map(({ k, v }) => (
                  <div key={k} className="flex justify-between items-center text-xs">
                    <span className="text-[#57789a]">{k}</span>
                    <span className="text-[#1a2f45] font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={runScoring}
              disabled={scoring}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3d9bd4] text-white text-sm font-medium hover:bg-[#2880b5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scoring ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Scoring…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M5 3l8 5-8 5V3z" fill="currentColor" />
                  </svg>
                  Score Transaction
                </>
              )}
            </button>

            {avgLatency !== null && (
              <div className="text-center text-xs text-[#57789a]">
                avg scoring latency: <span className="text-[#1a2f45] font-mono">{avgLatency}ms</span>
                {" · "}model: <span className="text-[#1a2f45] font-mono">lgbm-v4.2.1</span>
              </div>
            )}
          </div>

          {/* Score output + history */}
          <div className="lg:col-span-2 space-y-4">
            {/* Latest result */}
            {latest ? (
              <div className={`rounded-xl border p-5 ${DECISION_STYLES[latest.decision].border} ${DECISION_STYLES[latest.decision].bg}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span
                      className="inline-block text-xs font-bold tracking-widest px-3 py-1 rounded-full border mb-2"
                      style={{
                        color: DECISION_STYLES[latest.decision].color,
                        borderColor: DECISION_STYLES[latest.decision].color + "55",
                        backgroundColor: DECISION_STYLES[latest.decision].color + "18",
                      }}
                    >
                      {DECISION_STYLES[latest.decision].label}
                    </span>
                    <div className="text-xs text-[#57789a] font-mono">{latest.txId}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold font-mono" style={{ color: DECISION_STYLES[latest.decision].color }}>
                      {(latest.score * 100).toFixed(1)}
                      <span className="text-sm font-normal text-[#57789a]">%</span>
                    </div>
                    <div className="text-xs text-[#57789a]">fraud score</div>
                  </div>
                </div>

                {/* Score bar */}
                <div className="mb-4">
                  <div className="h-2 rounded-full bg-[rgba(61,155,212,0.10)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${latest.score * 100}%`,
                        backgroundColor: DECISION_STYLES[latest.decision].color,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-[#57789a] mt-1">
                    <span>0 — safe</span>
                    <span className="text-[#f59e0b]">0.38 review</span>
                    <span className="text-[#ef4444]">0.72 decline</span>
                  </div>
                </div>

                {/* Risk factors */}
                {latest.riskFactors.length > 0 && (
                  <div>
                    <p className="text-xs text-[#57789a] mb-2">Risk factors detected:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {latest.riskFactors.map((f) => (
                        <span key={f} className="text-xs px-2 py-0.5 rounded-full border border-[#f59e0b]/25 bg-[#f59e0b]/08 text-[#f59e0b]">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-12 text-center text-sm text-[#57789a]">
                Select a scenario and press{" "}
                <span className="text-[#1a2f45]">Score Transaction</span> to see the model output
              </div>
            )}

            {/* Scoring history */}
            {results.length > 1 && (
              <div className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] overflow-hidden">
                <div className="px-5 py-3 border-b border-[rgba(61,155,212,0.10)]">
                  <div className="text-xs font-medium text-[#1a2f45]">Scoring History</div>
                </div>
                <div className="divide-y divide-[rgba(61,155,212,0.06)] max-h-[360px] overflow-y-auto">
                  {results.slice(1).map((r) => (
                    <div key={r.txId} className="px-5 py-2.5 flex items-center gap-3 hover:bg-[rgba(61,155,212,0.04)] transition-colors">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: DECISION_STYLES[r.decision].color }}
                      />
                      <span className="text-xs font-mono text-[#57789a] w-24 flex-shrink-0">{r.txId}</span>
                      <span className="text-xs text-[#57789a] flex-1 truncate">{r.tx.merchant}</span>
                      <span className="text-xs font-mono" style={{ color: DECISION_STYLES[r.decision].color }}>
                        {(r.score * 100).toFixed(1)}%
                      </span>
                      <span
                        className="text-xs font-medium w-16 text-right"
                        style={{ color: DECISION_STYLES[r.decision].color }}
                      >
                        {DECISION_STYLES[r.decision].label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
