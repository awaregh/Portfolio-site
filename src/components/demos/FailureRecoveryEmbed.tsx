"use client";

import { useState, useRef } from "react";

type CircuitState = "CLOSED" | "OPEN" | "HALF-OPEN";

interface ServiceBreaker {
  id: string;
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  errorRate: number;
  lastTripped: number | null;
}

interface RequestEntry {
  id: string;
  service: string;
  status: "SUCCESS" | "CIRCUIT_OPEN" | "TIMEOUT" | "FAILURE";
  latencyMs: number;
  circuitState: CircuitState;
  ts: number;
}

const FAILURE_THRESHOLD = 5;
const HALF_OPEN_AFTER_MS = 5000;

let reqCounter = 0;

const INITIAL_SERVICES: ServiceBreaker[] = [
  { id: "payment-service", name: "payment-service", state: "CLOSED", failures: 0, successes: 0, errorRate: 0.1, lastTripped: null },
  { id: "inventory-api", name: "inventory-api", state: "CLOSED", failures: 0, successes: 0, errorRate: 0.1, lastTripped: null },
  { id: "notification-svc", name: "notification-svc", state: "CLOSED", failures: 0, successes: 0, errorRate: 0.1, lastTripped: null },
];

const STATE_STYLES: Record<CircuitState, { border: string; bg: string; text: string; dot: string }> = {
  CLOSED:     { border: "border-[#22c55e]/40",  bg: "bg-[#22c55e]/08",  text: "text-[#22c55e]",  dot: "bg-[#22c55e]" },
  OPEN:       { border: "border-[#ef4444]/40",  bg: "bg-[#ef4444]/08",  text: "text-[#ef4444]",  dot: "bg-[#ef4444]" },
  "HALF-OPEN":{ border: "border-[#f59e0b]/40",  bg: "bg-[#f59e0b]/08",  text: "text-[#f59e0b]",  dot: "bg-[#f59e0b]" },
};

export default function FailureRecoveryEmbed() {
  const [services, setServices] = useState<ServiceBreaker[]>(INITIAL_SERVICES);
  const [selectedServiceId, setSelectedServiceId] = useState(INITIAL_SERVICES[0].id);
  const [logs, setLogs] = useState<RequestEntry[]>([]);
  const [sending, setSending] = useState(false);
  const halfOpenTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const selectedService = services.find((s) => s.id === selectedServiceId) ?? services[0];
  const totalRequests = logs.length;
  const successCount = logs.filter((l) => l.status === "SUCCESS").length;
  const successRate = totalRequests > 0 ? ((successCount / totalRequests) * 100).toFixed(0) : "0";
  const circuitTrips = logs.filter((l) => l.status === "CIRCUIT_OPEN").length;
  const avgLatency = logs.length > 0
    ? (logs.reduce((a, l) => a + l.latencyMs, 0) / logs.length).toFixed(0)
    : "—";

  function scheduleHalfOpen(serviceId: string) {
    if (halfOpenTimersRef.current[serviceId]) clearTimeout(halfOpenTimersRef.current[serviceId]);
    halfOpenTimersRef.current[serviceId] = setTimeout(() => {
      setServices((prev) => prev.map((s) => s.id === serviceId && s.state === "OPEN"
        ? { ...s, state: "HALF-OPEN" }
        : s
      ));
    }, HALF_OPEN_AFTER_MS);
  }

  async function sendRequest() {
    if (sending) return;
    setSending(true);
    const svc = services.find((s) => s.id === selectedServiceId)!;
    const latency = 40 + Math.floor(Math.random() * 120);
    await new Promise((r) => setTimeout(r, Math.min(latency, 300)));

    let status: RequestEntry["status"];
    let newState = svc.state;
    let failures = svc.failures;
    let successes = svc.successes;

    if (svc.state === "OPEN") {
      status = "CIRCUIT_OPEN";
    } else {
      const failed = Math.random() < svc.errorRate;
      if (failed) {
        status = Math.random() < 0.5 ? "TIMEOUT" : "FAILURE";
        failures += 1;
        if (failures >= FAILURE_THRESHOLD) {
          newState = "OPEN";
          scheduleHalfOpen(svc.id);
        }
      } else {
        status = "SUCCESS";
        successes += 1;
        if (svc.state === "HALF-OPEN") {
          newState = "CLOSED";
          failures = 0;
        }
      }
    }

    setServices((prev) => prev.map((s) => s.id === selectedServiceId
      ? { ...s, state: newState, failures, successes, lastTripped: newState === "OPEN" ? Date.now() : s.lastTripped }
      : s
    ));

    const entry: RequestEntry = {
      id: `req-${(++reqCounter).toString().padStart(4, "0")}`,
      service: svc.name,
      status,
      latencyMs: status === "CIRCUIT_OPEN" ? 0 : latency,
      circuitState: newState,
      ts: Date.now(),
    };
    setLogs((prev) => [entry, ...prev].slice(0, 40));
    setSending(false);
  }

  function injectFailure() {
    setServices((prev) => prev.map((s) => s.id === selectedServiceId
      ? { ...s, errorRate: 0.95 }
      : s
    ));
  }

  function resetBreaker() {
    if (halfOpenTimersRef.current[selectedServiceId]) {
      clearTimeout(halfOpenTimersRef.current[selectedServiceId]);
    }
    setServices((prev) => prev.map((s) => s.id === selectedServiceId
      ? { ...s, state: "CLOSED", failures: 0, successes: 0, errorRate: 0.1, lastTripped: null }
      : s
    ));
  }

  const STATUS_COLORS: Record<RequestEntry["status"], string> = {
    SUCCESS:      "text-[#22c55e]",
    CIRCUIT_OPEN: "text-[#ef4444]",
    TIMEOUT:      "text-[#f59e0b]",
    FAILURE:      "text-[#ef4444]",
  };

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Requests", value: totalRequests.toString() },
          { label: "Success Rate", value: `${successRate}%`, color: Number(successRate) >= 80 ? "#22c55e" : "#ef4444" },
          { label: "Circuit Trips", value: circuitTrips.toString(), color: circuitTrips > 0 ? "#ef4444" : "#57789a" },
          { label: "Avg Latency", value: avgLatency !== "—" ? `${avgLatency}ms` : "—" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-4">
            <div className="text-xs text-[#57789a] mb-1">{m.label}</div>
            <div className="text-xl font-semibold font-mono" style={{ color: m.color || "#1a2f45" }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: circuit diagram + controls */}
        <div className="space-y-4">
          {/* State diagram */}
          <div className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-5">
            <p className="text-xs text-[#57789a] uppercase tracking-widest font-medium mb-4">Circuit State Machine</p>
            <div className="flex flex-col items-center gap-2">
              {(["CLOSED", "HALF-OPEN", "OPEN"] as CircuitState[]).map((state) => {
                const isCurrent = selectedService.state === state;
                const s = STATE_STYLES[state];
                return (
                  <div key={state} className="flex flex-col items-center w-full">
                    <div className={`w-full rounded-lg border px-4 py-3 text-center transition-all duration-300 ${isCurrent ? `${s.border} ${s.bg}` : "border-[rgba(61,155,212,0.10)] bg-[#f0f7ff]"}`}>
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${isCurrent ? s.dot : "bg-[rgba(61,155,212,0.18)]"} ${isCurrent ? "animate-pulse" : ""}`} />
                        <span className={`text-sm font-semibold ${isCurrent ? s.text : "text-[#57789a]"}`}>{state}</span>
                      </div>
                    </div>
                    {state !== "OPEN" && (
                      <div className="flex items-center gap-1 my-0.5">
                        <div className="w-px h-3 bg-[rgba(61,155,212,0.12)]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-xs text-[#57789a] text-center">
              {selectedService.state === "CLOSED" && "Requests flowing normally"}
              {selectedService.state === "OPEN" && `Tripped · auto half-open in 5s`}
              {selectedService.state === "HALF-OPEN" && "Probing — one test request allowed"}
            </div>
          </div>

          {/* Service selector */}
          <div className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-5">
            <p className="text-xs text-[#57789a] uppercase tracking-widest font-medium mb-3">Services</p>
            <div className="space-y-2">
              {services.map((svc) => {
                const s = STATE_STYLES[svc.state];
                return (
                  <button
                    key={svc.id}
                    onClick={() => setSelectedServiceId(svc.id)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 transition-all ${
                      selectedServiceId === svc.id
                        ? "border-[#3d9bd4]/50 bg-[#3d9bd4]/05"
                        : "border-[rgba(61,155,212,0.10)] hover:border-[rgba(61,155,212,0.16)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[#1a2f45]">{svc.name}</span>
                      <span className={`text-xs font-semibold ${s.text}`}>{svc.state}</span>
                    </div>
                    <div className="text-xs text-[#57789a] mt-0.5">
                      err rate: {Math.round(svc.errorRate * 100)}% · failures: {svc.failures}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button onClick={sendRequest} disabled={sending} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3d9bd4] text-white text-sm font-medium hover:bg-[#2880b5] transition-colors disabled:opacity-50">
              {sending ? "Sending…" : "Send Request"}
            </button>
            <button onClick={injectFailure} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#ef4444]/30 text-[#ef4444] text-sm font-medium hover:bg-[#ef4444]/05 transition-colors">
              Inject Failure
            </button>
            <button onClick={resetBreaker} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[rgba(61,155,212,0.14)] text-[#57789a] text-sm font-medium hover:text-[#1a2f45] transition-colors">
              Reset Breaker
            </button>
          </div>
        </div>

        {/* Right: request log */}
        <div className="lg:col-span-2 rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(61,155,212,0.10)]">
            <div className="text-sm font-medium text-[#1a2f45]">Request Log</div>
          </div>
          <div className="divide-y divide-[rgba(61,155,212,0.06)] max-h-[520px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[#57789a]">
                Send a request to see the circuit breaker in action
              </div>
            ) : (
              logs.map((log) => {
                const s = STATE_STYLES[log.circuitState];
                return (
                  <div key={log.id} className="px-5 py-3 flex items-start gap-3 hover:bg-[rgba(61,155,212,0.04)] transition-colors">
                    <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      log.status === "SUCCESS" ? "bg-[#22c55e]" : log.status === "CIRCUIT_OPEN" ? "bg-[#ef4444]" : "bg-[#f59e0b]"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-xs font-mono text-[#57789a]">{log.id}</span>
                        <span className={`text-xs font-semibold ${STATUS_COLORS[log.status]}`}>{log.status}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${s.border} ${s.text}`}>{log.circuitState}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#57789a] font-mono">{log.service}</span>
                        <span className="text-xs text-[#57789a]">·</span>
                        <span className="text-xs text-[#3d9bd4]">{log.status === "CIRCUIT_OPEN" ? "0ms (short-circuited)" : `${log.latencyMs}ms`}</span>
                      </div>
                    </div>
                    <span className="text-xs text-[#57789a] flex-shrink-0">{new Date(log.ts).toLocaleTimeString()}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
