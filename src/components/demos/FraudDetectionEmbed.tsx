"use client";

import { useState, useRef } from "react";
import { scoreTxn, CATEGORIES, PRESETS, FRAUD_THRESHOLD, Transaction } from "@/lib/fraudScoring";

export default function FraudDetectionEmbed() {
  const [amount, setAmount] = useState("150.00");
  const [time, setTime] = useState("43200");
  const [category, setCategory] = useState("online_purchase");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [scoring, setScoring] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const txnCounterRef = useRef(0);

  const threshold = FRAUD_THRESHOLD;

  async function scoreTransaction(amt?: number, t?: number, cat?: string) {
    if (scoring) return;
    setScoring(true);
    const txnAmount = amt ?? (parseFloat(amount) || 0);
    const txnTime = t ?? (parseInt(time) || 0);
    const txnCategory = cat ?? category;

    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

    const { score, features } = scoreTxn(txnAmount, txnTime, txnCategory);
    const txn: Transaction = {
      id: `txn-${(++txnCounterRef.current).toString().padStart(4, "0")}`,
      amount: txnAmount,
      time: txnTime,
      category: txnCategory,
      fraudScore: parseFloat(score.toFixed(4)),
      prediction: score >= threshold ? "fraud" : "legit",
      latencyMs: parseFloat((20 + Math.random() * 60).toFixed(1)),
      topFeatures: features.slice(0, 4),
    };
    setTransactions((prev) => [txn, ...prev].slice(0, 30));
    setScoring(false);
  }

  async function runBatch() {
    if (scoring) return;
    setScoring(true);
    for (const preset of PRESETS) {
      await new Promise((r) => setTimeout(r, 180));
      const { score, features } = scoreTxn(preset.amount, preset.time, preset.category);
      const txn: Transaction = {
        id: `txn-${(++txnCounterRef.current).toString().padStart(4, "0")}`,
        amount: preset.amount,
        time: preset.time,
        category: preset.category,
        fraudScore: parseFloat(score.toFixed(4)),
        prediction: score >= threshold ? "fraud" : "legit",
        latencyMs: parseFloat((20 + Math.random() * 60).toFixed(1)),
        topFeatures: features.slice(0, 4),
      };
      setTransactions((prev) => [txn, ...prev].slice(0, 30));
    }
    setScoring(false);
  }

  const fraudCount = transactions.filter((t) => t.prediction === "fraud").length;
  const legitCount = transactions.filter((t) => t.prediction === "legit").length;
  const avgLatency = transactions.length
    ? (transactions.reduce((acc, t) => acc + t.latencyMs, 0) / transactions.length).toFixed(1)
    : "—";

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Transactions Scored", value: transactions.length.toString() },
          { label: "Flagged as Fraud", value: fraudCount.toString(), color: "#ef4444" },
          { label: "Legitimate", value: legitCount.toString(), color: "#22c55e" },
          { label: "Avg Latency", value: avgLatency !== "—" ? `${avgLatency}ms` : "—" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4">
            <div className="text-xs text-[#888888] mb-1">{m.label}</div>
            <div className="text-xl font-semibold font-mono" style={{ color: m.color || "#ededed" }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction form */}
        <div className="space-y-5">
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-5">
            <p className="text-xs text-[#888888] uppercase tracking-widest font-medium mb-3">Transaction Input</p>
            <form ref={formRef} onSubmit={(e) => { e.preventDefault(); scoreTransaction(); }} className="space-y-3">
              <div>
                <label className="text-xs text-[#888888] mb-1 block">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#ededed] font-mono outline-none focus:border-[#3b82f6]/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-[#888888] mb-1 block">Time (seconds since midnight)</label>
                <input
                  type="number"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#ededed] font-mono outline-none focus:border-[#3b82f6]/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-[#888888] mb-1 block">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#ededed] outline-none focus:border-[#3b82f6]/50 transition-colors"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            </form>

            {/* Presets */}
            <p className="text-xs text-[#888888] mt-4 mb-2">Quick presets</p>
            <div className="space-y-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setAmount(p.amount.toString());
                    setTime(p.time.toString());
                    setCategory(p.category);
                    scoreTransaction(p.amount, p.time, p.category);
                  }}
                  disabled={scoring}
                  className="w-full text-left rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] p-2 transition-all disabled:opacity-50"
                >
                  <div className="text-xs font-medium text-[#ededed]">{p.label}</div>
                  <div className="text-xs text-[#888888] font-mono">${p.amount.toFixed(2)} · {p.category.replace(/_/g, " ")}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => scoreTransaction()}
              disabled={scoring}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3b82f6] text-white text-sm font-medium hover:bg-[#2563eb] transition-colors disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 8h12M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {scoring ? "Scoring…" : "Score Transaction"}
            </button>
            <button
              onClick={runBatch}
              disabled={scoring}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] text-[#888888] text-sm font-medium hover:text-[#ededed] transition-colors disabled:opacity-50"
            >
              {scoring ? "Processing…" : "Run Batch (×5)"}
            </button>
          </div>
        </div>

        {/* Scoring log */}
        <div className="lg:col-span-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
            <div className="text-sm font-medium text-[#ededed]">Scoring Log</div>
          </div>
          <div className="divide-y divide-[rgba(255,255,255,0.04)] max-h-[480px] overflow-y-auto">
            {transactions.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[#888888]">
                Submit a transaction to see fraud scoring results
              </div>
            ) : (
              transactions.map((txn) => (
                <div key={txn.id} className="px-5 py-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${txn.prediction === "fraud" ? "bg-[#ef4444]" : "bg-[#22c55e]"}`} />
                    <span className="text-xs font-mono text-[#888888]">{txn.id}</span>
                    <span className={`text-xs font-semibold ${txn.prediction === "fraud" ? "text-[#ef4444]" : "text-[#22c55e]"}`}>
                      {txn.prediction === "fraud" ? "FRAUD" : "LEGIT"}
                    </span>
                    <span className="text-xs text-[#888888] ml-auto">{txn.latencyMs}ms</span>
                  </div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-xs text-[#ededed] font-mono">${txn.amount.toFixed(2)}</span>
                    <span className="text-xs text-[#888888]">{txn.category.replace(/_/g, " ")}</span>
                    <span className="text-xs text-[#888888]">·</span>
                    <span className="text-xs text-[#888888]">score: </span>
                    <span className={`text-xs font-mono font-semibold ${txn.fraudScore >= threshold ? "text-[#ef4444]" : "text-[#22c55e]"}`}>
                      {txn.fraudScore.toFixed(4)}
                    </span>
                  </div>
                  {/* Feature importance */}
                  <div className="flex flex-wrap gap-1.5">
                    {txn.topFeatures.map((f) => (
                      <span key={f.name} className={`px-1.5 py-0.5 text-xs rounded font-mono border ${
                        f.impact > 0
                          ? "text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/20"
                          : "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20"
                      }`}>
                        {f.name} {f.impact > 0 ? "+" : ""}{f.impact}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
