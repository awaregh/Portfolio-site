"use client";

import { useState, useEffect, useRef } from "react";

interface Event {
  id: string;
  topic: string;
  tenantId: string;
  schema: string;
  payload: string;
  ts: number;
  latencyMs: number;
  sink: "ClickHouse" | "Alerting" | "Billing" | "DLQ";
  schemaValid: boolean;
}

const TOPICS = ["user.pageview", "order.created", "payment.processed", "session.end", "error.captured"];
const SCHEMAS = ["UserEvent/v3", "OrderEvent/v2", "PaymentEvent/v4", "SessionEvent/v1", "ErrorEvent/v2"];
const TENANTS = ["acme-corp", "fintech-co", "retail-inc", "dev-tools-ltd", "media-group"];
const SINKS: Array<"ClickHouse" | "Alerting" | "Billing"> = ["ClickHouse", "Alerting", "Billing"];

let eventCounter = 0;
function generateEvent(): Event {
  const idx = Math.floor(Math.random() * TOPICS.length);
  const schemaValid = Math.random() > 0.05;
  return {
    id: `evt-${(++eventCounter).toString().padStart(6, "0")}`,
    topic: TOPICS[idx],
    tenantId: TENANTS[Math.floor(Math.random() * TENANTS.length)],
    schema: SCHEMAS[idx],
    payload: JSON.stringify({ event_id: `${Math.random().toString(36).slice(2, 10)}`, ts: Date.now() }),
    ts: Date.now(),
    latencyMs: 80 + Math.floor(Math.random() * 270),
    sink: schemaValid ? SINKS[Math.floor(Math.random() * SINKS.length)] : "DLQ",
    schemaValid,
  };
}

const SINK_COLORS: Record<Event["sink"], string> = {
  ClickHouse: "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20",
  Alerting: "text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/20",
  Billing: "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20",
  DLQ: "text-[#f97316] bg-[#f97316]/10 border-[#f97316]/20",
};

export default function RealTimePipelineEmbed() {
  const [events, setEvents] = useState<Event[]>([]);
  const [running, setRunning] = useState(false);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [avgLatency, setAvgLatency] = useState(0);
  const [eventsPerSec, setEventsPerSec] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const epsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const epsCountRef = useRef(0);

  function startPipeline() {
    if (running) return;
    setRunning(true);
    intervalRef.current = setInterval(() => {
      const newEvts: Event[] = Array.from({ length: Math.floor(Math.random() * 3) + 1 }, generateEvent);
      setEvents((prev) => [...newEvts, ...prev].slice(0, 40));
      setTotalProcessed((prev) => prev + newEvts.length);
      setAvgLatency((prev) => {
        const avg = newEvts.reduce((acc, e) => acc + e.latencyMs, 0) / newEvts.length;
        return Math.round(prev * 0.8 + avg * 0.2);
      });
      epsCountRef.current += newEvts.length;
    }, 400);
    epsIntervalRef.current = setInterval(() => {
      setEventsPerSec(epsCountRef.current);
      epsCountRef.current = 0;
    }, 1000);
  }

  function stopPipeline() {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (epsIntervalRef.current) clearInterval(epsIntervalRef.current);
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (epsIntervalRef.current) clearInterval(epsIntervalRef.current);
    };
  }, []);

  const topicCounts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.topic] = (acc[e.topic] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Events Processed", value: totalProcessed.toLocaleString() },
          { label: "Events / sec", value: running ? eventsPerSec.toString() : "—" },
          { label: "Avg Latency (p50)", value: avgLatency ? `${avgLatency}ms` : "—" },
          { label: "Consumer Lag", value: running ? `${Math.floor(Math.random() * 8) + 1}s` : "—" },
          { label: "Schema Errors", value: events.filter((e) => !e.schemaValid).length.toString(), color: "#ef4444" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4">
            <div className="text-xs text-[#888888] mb-1">{m.label}</div>
            <div className="text-xl font-semibold font-mono" style={{ color: (m as { color?: string }).color || "#ededed" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={running ? stopPipeline : startPipeline}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            running
              ? "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 hover:bg-[#ef4444]/20"
              : "bg-[#3b82f6] text-white hover:bg-[#2563eb]"
          }`}
        >
          {running ? (
            <>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="3" width="4" height="10" rx="1" />
                <rect x="9" y="3" width="4" height="10" rx="1" />
              </svg>
              Pause Pipeline
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 3l9 5-9 5V3z" fill="currentColor" />
              </svg>
              Start Pipeline
            </>
          )}
        </button>
        <button
          onClick={() => { setEvents([]); setTotalProcessed(0); setAvgLatency(0); setEventsPerSec(0); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[#888888] border border-[rgba(255,255,255,0.08)] hover:text-[#ededed] transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event stream */}
        <div className="lg:col-span-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
            <div className="text-sm font-medium text-[#ededed]">Event Stream</div>
            {running && <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />}
          </div>
          <div className="divide-y divide-[rgba(255,255,255,0.04)] max-h-[360px] overflow-y-auto">
            {events.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[#888888]">
                Start the pipeline to see events
              </div>
            ) : (
              events.map((evt) => (
                <div key={evt.id} className="px-5 py-3 flex items-start gap-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="text-xs font-mono text-[#444444]">{evt.id}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-[#ededed]">{evt.topic}</span>
                      <span className="text-xs text-[#888888]">·</span>
                      <span className="text-xs text-[#888888] font-mono">{evt.schema}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#888888]">{evt.tenantId}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-mono ${SINK_COLORS[evt.sink]}`}>
                        → {evt.sink}
                      </span>
                      <span className="text-xs text-[#888888] ml-auto">{evt.latencyMs}ms</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Topic breakdown */}
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-5">
          <p className="text-xs text-[#888888] uppercase tracking-widest font-medium mb-4">Topic Breakdown</p>
          {TOPICS.map((topic) => {
            const count = topicCounts[topic] || 0;
            const total = events.length || 1;
            return (
              <div key={topic} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#888888] font-mono truncate max-w-[140px]">{topic}</span>
                  <span className="text-[#ededed] ml-2 flex-shrink-0">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#3b82f6] transition-all duration-300"
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}

          <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.06)]">
            <p className="text-xs text-[#888888] uppercase tracking-widest font-medium mb-3">Sink Distribution</p>
            {(["ClickHouse", "Alerting", "Billing", "DLQ"] as const).map((sink) => {
              const count = events.filter((e) => e.sink === sink).length;
              return (
                <div key={sink} className="flex items-center justify-between text-xs mb-2">
                  <span className={`px-2 py-0.5 rounded border font-mono ${SINK_COLORS[sink]}`}>{sink}</span>
                  <span className="text-[#888888]">{count} events</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
