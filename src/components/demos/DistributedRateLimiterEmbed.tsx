"use client";

import { useState, useEffect, useRef } from "react";

type Algorithm = "token-bucket" | "sliding-window";

interface Policy {
  tenantId: string;
  endpoint: string;
  limit: number;
  windowSec: number;
  algorithm: Algorithm;
}

interface CheckResult {
  id: string;
  policy: Policy;
  allowed: boolean;
  remaining: number;
  latencyMs: number;
  ts: number;
}

const POLICIES: Policy[] = [
  { tenantId: "acme-corp", endpoint: "POST /api/chat", limit: 10, windowSec: 10, algorithm: "token-bucket" },
  { tenantId: "fintech-co", endpoint: "GET /api/data", limit: 30, windowSec: 10, algorithm: "sliding-window" },
  { tenantId: "retail-inc", endpoint: "POST /api/orders", limit: 5, windowSec: 10, algorithm: "token-bucket" },
  { tenantId: "media-group", endpoint: "GET /api/stream", limit: 20, windowSec: 5, algorithm: "sliding-window" },
];

let reqCounter = 0;

export default function DistributedRateLimiterEmbed() {
  const [selectedPolicy, setSelectedPolicy] = useState<Policy>(POLICIES[0]);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [counters, setCounters] = useState<Record<string, number>>({});
  const [burstRunning, setBurstRunning] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const key = `${selectedPolicy.tenantId}:${selectedPolicy.endpoint}`;
  const windowCount = counters[key] || 0;
  const limitForKey = selectedPolicy.limit;
  const fillRate = Math.max(0, 1 - windowCount / limitForKey);

  function checkRequest(policy: Policy = selectedPolicy) {
    const k = `${policy.tenantId}:${policy.endpoint}`;
    const current = counters[k] || 0;
    const allowed = current < policy.limit;
    const remaining = Math.max(0, policy.limit - current - (allowed ? 1 : 0));
    const latency = 0.3 + Math.random() * 0.9;

    if (allowed) {
      setCounters((prev) => ({ ...prev, [k]: (prev[k] || 0) + 1 }));
    }

    const result: CheckResult = {
      id: `req-${(++reqCounter).toString().padStart(4, "0")}`,
      policy,
      allowed,
      remaining,
      latencyMs: parseFloat(latency.toFixed(1)),
      ts: Date.now(),
    };
    setResults((prev) => [result, ...prev].slice(0, 30));
  }

  async function runBurst() {
    if (burstRunning) return;
    setBurstRunning(true);
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 120));
      checkRequest();
    }
    setBurstRunning(false);
  }

  // Auto-reset counters every windowSec
  useEffect(() => {
    const reset = () => setCounters({});
    intervalRef.current = setInterval(reset, selectedPolicy.windowSec * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [selectedPolicy.windowSec]);

  const allowed = results.filter((r) => r.allowed).length;
  const rejected = results.filter((r) => !r.allowed).length;
  const allowRate = results.length ? Math.round((allowed / results.length) * 100) : null;
  const avgLatency = results.length
    ? (results.reduce((acc, r) => acc + r.latencyMs, 0) / results.length).toFixed(1)
    : "—";

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Requests Checked", value: results.length.toString() },
          { label: "Allowed", value: allowed.toString(), color: "#22c55e" },
          { label: "Rejected", value: rejected.toString(), color: "#ef4444" },
          { label: "Allow Rate %", value: allowRate !== null ? `${allowRate}%` : "—", color: allowRate !== null ? (allowRate >= 50 ? "#22c55e" : "#ef4444") : undefined },
          { label: "Avg Latency", value: avgLatency !== "—" ? `${avgLatency}ms` : "—" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4">
            <div className="text-xs text-[#888888] mb-1">{m.label}</div>
            <div className="text-xl font-semibold font-mono" style={{ color: m.color || "#ededed" }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policy config */}
        <div className="space-y-5">
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-[#888888] uppercase tracking-widest font-medium">Policy</p>
              <button
                onClick={() => setCompareMode((c) => !c)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  compareMode
                    ? "border-[#3b82f6]/50 bg-[#3b82f6]/10 text-[#3b82f6]"
                    : "border-[rgba(255,255,255,0.08)] text-[#888888] hover:text-[#ededed]"
                }`}
              >
                Compare Algorithms
              </button>
            </div>
            <div className="space-y-2">
              {POLICIES.map((p) => (
                <button
                  key={`${p.tenantId}:${p.endpoint}`}
                  onClick={() => setSelectedPolicy(p)}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    selectedPolicy === p
                      ? "border-[#3b82f6]/50 bg-[#3b82f6]/05"
                      : "border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]"
                  }`}
                >
                  <div className="text-xs font-medium text-[#ededed] mb-0.5">{p.tenantId}</div>
                  <div className="text-xs text-[#888888] font-mono mb-1">{p.endpoint}</div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-[#3b82f6]">{p.limit} req/{p.windowSec}s</span>
                    <span className="text-[#888888]">·</span>
                    <span className="text-[#888888]">{p.algorithm}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Bucket visualiser */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-5">
            <p className="text-xs text-[#888888] uppercase tracking-widest font-medium mb-3">
              {compareMode ? "Algorithm Comparison" : "Token Bucket"}
            </p>
            {compareMode ? (
              <div className="grid grid-cols-2 gap-3">
                {(["token-bucket", "sliding-window"] as const).map((algo) => {
                  const algoFill = algo === "token-bucket" ? fillRate : Math.max(0, 1 - (windowCount / limitForKey) * 0.7);
                  const algoColor = algoFill > 0.5 ? "#22c55e" : algoFill > 0.2 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={algo}>
                      <p className="text-xs text-[#888888] font-mono mb-1.5 truncate">{algo}</p>
                      <div className="relative w-full h-16 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] overflow-hidden">
                        <div
                          className="absolute bottom-0 left-0 right-0 transition-all duration-300"
                          style={{
                            height: `${algoFill * 100}%`,
                            background: `linear-gradient(to top, ${algoColor}22, ${algoColor}44)`,
                            borderTop: `2px solid ${algoColor}`,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-semibold font-mono" style={{ color: algoColor }}>
                            {Math.round(algoFill * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="relative w-full h-24 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] overflow-hidden mb-2">
                  <div
                    className="absolute bottom-0 left-0 right-0 transition-all duration-300"
                    style={{
                      height: `${fillRate * 100}%`,
                      background: fillRate > 0.5
                        ? "linear-gradient(to top, #22c55e22, #22c55e44)"
                        : fillRate > 0.2
                        ? "linear-gradient(to top, #f59e0b22, #f59e0b44)"
                        : "linear-gradient(to top, #ef444422, #ef444444)",
                      borderTop: `2px solid ${fillRate > 0.5 ? "#22c55e" : fillRate > 0.2 ? "#f59e0b" : "#ef4444"}`,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-semibold font-mono" style={{
                      color: fillRate > 0.5 ? "#22c55e" : fillRate > 0.2 ? "#f59e0b" : "#ef4444",
                    }}>
                      {limitForKey - windowCount} / {limitForKey}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#888888]">tokens remaining · resets in {selectedPolicy.windowSec}s window</p>
              </>
            )}
          </div>

          {/* Sliding Window timeline */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-5">
            <p className="text-xs text-[#888888] uppercase tracking-widest font-medium mb-3">Sliding Window (last 10s)</p>
            <div className="relative h-10 bg-[#0a0a0a] rounded-lg border border-[rgba(255,255,255,0.06)] overflow-hidden px-2">
              <div className="flex items-center h-full gap-px">
                {Array.from({ length: 10 }, (_, i) => {
                  const secAgo = 9 - i;
                  const tsFrom = Date.now() - (secAgo + 1) * 1000;
                  const tsTo = Date.now() - secAgo * 1000;
                  const bucket = results.filter((r) => r.ts >= tsFrom && r.ts < tsTo);
                  return (
                    <div key={i} className="flex-1 flex flex-col-reverse items-center gap-px pb-1">
                      {bucket.slice(0, 4).map((r, j) => (
                        <div
                          key={j}
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.allowed ? "bg-[#22c55e]" : "bg-[#ef4444]"}`}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-between text-xs text-[#444444] mt-1 px-1">
              <span>−10s</span>
              <span>now</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => checkRequest()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3b82f6] text-white text-sm font-medium hover:bg-[#2563eb] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Send Request
            </button>
            <button
              onClick={runBurst}
              disabled={burstRunning}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] text-[#888888] text-sm font-medium hover:text-[#ededed] transition-colors disabled:opacity-50"
            >
              {burstRunning ? "Bursting…" : "Send Burst (×15)"}
            </button>
          </div>
        </div>

        {/* Request log */}
        <div className="lg:col-span-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
            <div className="text-sm font-medium text-[#ededed]">Check Log</div>
          </div>
          <div className="divide-y divide-[rgba(255,255,255,0.04)] max-h-[480px] overflow-y-auto">
            {results.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[#888888]">
                Send a request to see rate limit decisions
              </div>
            ) : (
              results.map((r) => (
                <div key={r.id} className="px-5 py-3 flex items-start gap-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${r.allowed ? "bg-[#22c55e]" : "bg-[#ef4444]"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-[#888888]">{r.id}</span>
                      <span className={`text-xs font-semibold ${r.allowed ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                        {r.allowed ? "ALLOWED" : "REJECTED"}
                      </span>
                      <span className="text-xs text-[#888888] ml-auto">{r.latencyMs}ms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#888888]">{r.policy.tenantId}</span>
                      <span className="text-xs text-[#888888]">·</span>
                      <span className="text-xs text-[#888888] font-mono">{r.policy.endpoint}</span>
                      <span className="text-xs text-[#888888]">·</span>
                      <span className="text-xs text-[#3b82f6]">{r.remaining} remaining</span>
                    </div>
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
