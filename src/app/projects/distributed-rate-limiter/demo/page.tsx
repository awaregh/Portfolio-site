"use client";

import Link from "next/link";
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
];

let reqCounter = 0;

export default function DistributedRateLimiterDemo() {
  const [selectedPolicy, setSelectedPolicy] = useState<Policy>(POLICIES[0]);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [counters, setCounters] = useState<Record<string, number>>({});
  const [algorithm, setAlgorithm] = useState<Algorithm>("token-bucket");
  const [burstRunning, setBurstRunning] = useState(false);
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
  const avgLatency = results.length
    ? (results.reduce((acc, r) => acc + r.latencyMs, 0) / results.length).toFixed(1)
    : "—";

  return (
    <div className="min-h-screen pt-24 pb-24 px-6 bg-[#f0f7ff]">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/projects/distributed-rate-limiter"
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
            Distributed Rate Limiter
          </h1>
          <p className="text-[#57789a] text-sm leading-relaxed max-w-xl">
            Select a rate-limit policy and fire requests to see real-time allow/reject decisions.
            Counters reset every window period. Try a burst to exhaust the quota.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Requests Checked", value: results.length.toString() },
            { label: "Allowed", value: allowed.toString(), color: "#22c55e" },
            { label: "Rejected", value: rejected.toString(), color: "#ef4444" },
            { label: "Avg Latency", value: avgLatency !== "—" ? `${avgLatency}ms` : "—" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-4">
              <div className="text-xs text-[#57789a] mb-1">{m.label}</div>
              <div className="text-xl font-semibold font-mono" style={{ color: m.color || "#1a2f45" }}>{m.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Policy config */}
          <div className="space-y-5">
            <div className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-5">
              <p className="text-xs text-[#57789a] uppercase tracking-widest font-medium mb-3">Policy</p>
              <div className="space-y-2">
                {POLICIES.map((p) => (
                  <button
                    key={`${p.tenantId}:${p.endpoint}`}
                    onClick={() => setSelectedPolicy(p)}
                    className={`w-full text-left rounded-lg border p-3 transition-all ${
                      selectedPolicy === p
                        ? "border-[#3d9bd4]/50 bg-[#3d9bd4]/05"
                        : "border-[rgba(61,155,212,0.10)] hover:border-[rgba(61,155,212,0.16)]"
                    }`}
                  >
                    <div className="text-xs font-medium text-[#1a2f45] mb-0.5">{p.tenantId}</div>
                    <div className="text-xs text-[#57789a] font-mono mb-1">{p.endpoint}</div>
                    <div className="flex gap-2 text-xs">
                      <span className="text-[#3d9bd4]">{p.limit} req/{p.windowSec}s</span>
                      <span className="text-[#57789a]">·</span>
                      <span className="text-[#57789a]">{p.algorithm}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Bucket visualiser */}
            <div className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-5">
              <p className="text-xs text-[#57789a] uppercase tracking-widest font-medium mb-3">
                Token Bucket
              </p>
              <div className="relative w-full h-24 rounded-lg border border-[rgba(61,155,212,0.14)] bg-[#f0f7ff] overflow-hidden mb-2">
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
              <p className="text-xs text-[#57789a]">tokens remaining · resets in {selectedPolicy.windowSec}s window</p>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={() => checkRequest()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3d9bd4] text-white text-sm font-medium hover:bg-[#2880b5] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Send Request
              </button>
              <button
                onClick={runBurst}
                disabled={burstRunning}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[rgba(61,155,212,0.14)] text-[#57789a] text-sm font-medium hover:text-[#1a2f45] transition-colors disabled:opacity-50"
              >
                {burstRunning ? "Bursting…" : "Send Burst (×15)"}
              </button>
            </div>
          </div>

          {/* Request log */}
          <div className="lg:col-span-2 rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] overflow-hidden">
            <div className="px-5 py-4 border-b border-[rgba(61,155,212,0.10)]">
              <div className="text-sm font-medium text-[#1a2f45]">Check Log</div>
            </div>
            <div className="divide-y divide-[rgba(61,155,212,0.06)] max-h-[480px] overflow-y-auto">
              {results.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-[#57789a]">
                  Send a request to see rate limit decisions
                </div>
              ) : (
                results.map((r) => (
                  <div key={r.id} className="px-5 py-3 flex items-start gap-3 hover:bg-[rgba(61,155,212,0.04)] transition-colors">
                    <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${r.allowed ? "bg-[#22c55e]" : "bg-[#ef4444]"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-[#57789a]">{r.id}</span>
                        <span className={`text-xs font-semibold ${r.allowed ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                          {r.allowed ? "ALLOWED" : "REJECTED"}
                        </span>
                        <span className="text-xs text-[#57789a] ml-auto">{r.latencyMs}ms</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#57789a]">{r.policy.tenantId}</span>
                        <span className="text-xs text-[#57789a]">·</span>
                        <span className="text-xs text-[#57789a] font-mono">{r.policy.endpoint}</span>
                        <span className="text-xs text-[#57789a]">·</span>
                        <span className="text-xs text-[#3d9bd4]">{r.remaining} remaining</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
