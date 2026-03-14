"use client";

import { useState, useRef } from "react";

type Strategy = "Idempotency Key DB" | "Saga Pattern" | "Outbox Pattern";

interface RequestLog {
  id: string;
  key: string;
  status: "PAYMENT PROCESSED" | "DUPLICATE DETECTED";
  strategy: Strategy;
  latencyMs: number;
  paymentId?: string;
  ts: number;
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let reqCounter = 0;

export default function IdempotentAPIsEmbed() {
  const [amount] = useState("99.00");
  const [idempotencyKey, setIdempotencyKey] = useState(generateUUID);
  const [strategy, setStrategy] = useState<Strategy>("Idempotency Key DB");
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [lastResult, setLastResult] = useState<RequestLog | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const seenKeysRef = useRef<Map<string, RequestLog>>(new Map());

  const totalRequests = logs.length;
  const duplicatesCaught = logs.filter((l) => l.status === "DUPLICATE DETECTED").length;
  const uniquePayments = logs.filter((l) => l.status === "PAYMENT PROCESSED").length;
  const duplicateRate = totalRequests > 0 ? ((duplicatesCaught / totalRequests) * 100).toFixed(0) : "0";

  async function submitPayment() {
    if (submitting) return;
    setSubmitting(true);
    const latency = 30 + Math.floor(Math.random() * 70);
    await new Promise((r) => setTimeout(r, latency));

    const id = `req-${(++reqCounter).toString().padStart(4, "0")}`;
    const seen = seenKeysRef.current.get(idempotencyKey);

    let entry: RequestLog;
    if (seen) {
      entry = {
        id,
        key: idempotencyKey,
        status: "DUPLICATE DETECTED",
        strategy,
        latencyMs: 8 + Math.floor(Math.random() * 10),
        paymentId: seen.paymentId,
        ts: Date.now(),
      };
    } else {
      const paymentId = `pay_${Math.random().toString(36).slice(2, 12)}`;
      entry = {
        id,
        key: idempotencyKey,
        status: "PAYMENT PROCESSED",
        strategy,
        latencyMs: latency,
        paymentId,
        ts: Date.now(),
      };
      seenKeysRef.current.set(idempotencyKey, entry);
    }

    setLogs((prev) => [entry, ...prev].slice(0, 40));
    setLastResult(entry);
    setSubmitting(false);
  }

  const STRATEGIES: Strategy[] = ["Idempotency Key DB", "Saga Pattern", "Outbox Pattern"];

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Requests", value: totalRequests.toString() },
          { label: "Duplicates Caught", value: duplicatesCaught.toString(), color: "#f59e0b" },
          { label: "Unique Payments", value: uniquePayments.toString(), color: "#22c55e" },
          { label: "Duplicate Rate", value: `${duplicateRate}%`, color: duplicatesCaught > 0 ? "#f59e0b" : "#57789a" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-4">
            <div className="text-xs text-[#57789a] mb-1">{m.label}</div>
            <div className="text-xl font-semibold font-mono" style={{ color: m.color || "#1a2f45" }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment form */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-5">
            <p className="text-xs text-[#57789a] uppercase tracking-widest font-medium mb-4">Payment Form</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#57789a] mb-1.5 block">Amount</label>
                <div className="flex items-center gap-2 bg-[#f0f7ff] border border-[rgba(61,155,212,0.14)] rounded-lg px-3 py-2.5">
                  <span className="text-[#57789a] text-sm">$</span>
                  <span className="text-sm text-[#1a2f45] font-mono">{amount}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#57789a] mb-1.5 block">Idempotency Key</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-[#f0f7ff] border border-[rgba(61,155,212,0.14)] rounded-lg px-3 py-2 overflow-hidden">
                    <span className="text-xs text-[#1a2f45] font-mono truncate block">{idempotencyKey.slice(0, 24)}…</span>
                  </div>
                  <button
                    onClick={() => setIdempotencyKey(generateUUID())}
                    className="flex-shrink-0 px-3 py-2 rounded-lg border border-[rgba(61,155,212,0.14)] text-xs text-[#57789a] hover:text-[#1a2f45] transition-colors"
                  >
                    Regen
                  </button>
                </div>
                <p className="text-xs text-[#57789a] mt-1">Re-use same key to test deduplication</p>
              </div>

              <div>
                <label className="text-xs text-[#57789a] mb-1.5 block">Strategy</label>
                <div className="space-y-2">
                  {STRATEGIES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStrategy(s)}
                      className={`w-full text-left rounded-lg border px-3 py-2.5 transition-all text-sm ${
                        strategy === s
                          ? "border-[#3d9bd4]/50 bg-[#3d9bd4]/05 text-[#1a2f45]"
                          : "border-[rgba(61,155,212,0.10)] text-[#57789a] hover:text-[#1a2f45] hover:border-[rgba(61,155,212,0.16)]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={submitPayment}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3d9bd4] text-white text-sm font-medium hover:bg-[#2880b5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing…
              </>
            ) : "Submit Payment"}
          </button>

          {/* Last result */}
          {lastResult && (
            <div className={`rounded-xl border p-4 ${
              lastResult.status === "DUPLICATE DETECTED"
                ? "border-[#f59e0b]/30 bg-[#f59e0b]/05"
                : "border-[#22c55e]/30 bg-[#22c55e]/05"
            }`}>
              <div className={`text-sm font-semibold mb-2 ${lastResult.status === "DUPLICATE DETECTED" ? "text-[#f59e0b]" : "text-[#22c55e]"}`}>
                {lastResult.status === "DUPLICATE DETECTED"
                  ? "⚠ DUPLICATE DETECTED — returning cached result"
                  : "✓ PAYMENT PROCESSED"}
              </div>
              <div className="text-xs font-mono text-[#57789a] space-y-0.5">
                {lastResult.paymentId && <div>payment_id: <span className="text-[#1a2f45]">{lastResult.paymentId}</span></div>}
                <div>latency: <span className="text-[#1a2f45]">{lastResult.latencyMs}ms</span></div>
                <div>strategy: <span className="text-[#1a2f45]">{lastResult.strategy}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Request log */}
        <div className="lg:col-span-2 rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(61,155,212,0.10)]">
            <div className="text-sm font-medium text-[#1a2f45]">Request Log</div>
          </div>
          <div className="divide-y divide-[rgba(61,155,212,0.06)] max-h-[500px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[#57789a]">
                Submit a payment to see the idempotency log
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="px-5 py-3 flex items-start gap-3 hover:bg-[rgba(61,155,212,0.04)] transition-colors">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${log.status === "PAYMENT PROCESSED" ? "bg-[#22c55e]" : "bg-[#f59e0b]"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs font-mono text-[#57789a]">{log.id}</span>
                      <span className={`text-xs font-semibold ${log.status === "PAYMENT PROCESSED" ? "text-[#22c55e]" : "text-[#f59e0b]"}`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-[#57789a]">key: {log.key.slice(0, 8)}…</span>
                      <span className="text-xs text-[#57789a]">·</span>
                      <span className="text-xs text-[#57789a]">{log.strategy}</span>
                      <span className="text-xs text-[#57789a]">·</span>
                      <span className="text-xs text-[#3d9bd4]">{log.latencyMs}ms</span>
                    </div>
                  </div>
                  <span className="text-xs text-[#57789a] flex-shrink-0">{new Date(log.ts).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
