"use client";

import { useState, useEffect, useRef } from "react";

type OpType = "INSERT" | "UPDATE" | "DELETE";

interface CdcEvent {
  id: string;
  op: OpType;
  table: string;
  row_id: number;
  tenant: string;
  latencyMs: number;
  ts: number;
}

const TABLES = ["orders", "users", "products", "payments", "sessions"];
const TENANTS = ["acme-corp", "fintech-co", "retail-inc", "dev-tools-ltd"];
const OPS: OpType[] = ["INSERT", "UPDATE", "DELETE", "INSERT", "INSERT", "UPDATE"];

let evtCounter = 0;
function generateEvent(): CdcEvent {
  const op = OPS[Math.floor(Math.random() * OPS.length)];
  return {
    id: `cdc-${(++evtCounter).toString().padStart(5, "0")}`,
    op,
    table: TABLES[Math.floor(Math.random() * TABLES.length)],
    row_id: Math.floor(Math.random() * 99_000) + 1000,
    tenant: TENANTS[Math.floor(Math.random() * TENANTS.length)],
    latencyMs: 4 + Math.floor(Math.random() * 28),
    ts: Date.now(),
  };
}

const OP_COLORS: Record<OpType, string> = {
  INSERT: "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20",
  UPDATE: "text-[#3d9bd4] bg-[#3d9bd4]/10 border-[#3d9bd4]/20",
  DELETE: "text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/20",
};

interface Consumer {
  id: string;
  name: string;
  label: string;
  processed: number;
}

const INITIAL_CONSUMERS: Consumer[] = [
  { id: "search-index", name: "search-index", label: "Syncing documents", processed: 0 },
  { id: "analytics-db", name: "analytics-db", label: "Row count", processed: 0 },
  { id: "audit-log", name: "audit-log", label: "Entries logged", processed: 0 },
];

export default function ChangeDataPipelineEmbed() {
  const [events, setEvents] = useState<CdcEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [consumers, setConsumers] = useState<Consumer[]>(INITIAL_CONSUMERS);
  const [totalCaptured, setTotalCaptured] = useState(0);
  const [lagMs, setLagMs] = useState(0);
  const [throughput, setThroughput] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tpCountRef = useRef(0);
  const tpIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [replaying, setReplaying] = useState(false);

  function startStream() {
    if (running) return;
    setRunning(true);
    intervalRef.current = setInterval(() => {
      const batch = Array.from({ length: Math.floor(Math.random() * 3) + 1 }, generateEvent);
      setEvents((prev) => [...batch, ...prev].slice(0, 60));
      setTotalCaptured((n) => n + batch.length);
      setLagMs(Math.floor(Math.random() * 30) + 2);
      tpCountRef.current += batch.length;

      setConsumers((prev) => prev.map((c, i) => ({
        ...c,
        processed: c.processed + batch.filter((_, bi) => (bi + i) % 3 !== 0 ? true : Math.random() > 0.1).length,
      })));
    }, 450);

    tpIntervalRef.current = setInterval(() => {
      setThroughput(tpCountRef.current);
      tpCountRef.current = 0;
    }, 1000);
  }

  function stopStream() {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (tpIntervalRef.current) clearInterval(tpIntervalRef.current);
    setLagMs(0);
    setThroughput(0);
  }

  async function replayCheckpoint() {
    if (replaying || events.length === 0) return;
    setReplaying(true);
    const last10 = events.slice(0, 10);
    for (const evt of last10) {
      await new Promise((r) => setTimeout(r, 120));
      setConsumers((prev) => prev.map((c) => ({ ...c, processed: c.processed + 1 })));
      void evt;
    }
    setReplaying(false);
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (tpIntervalRef.current) clearInterval(tpIntervalRef.current);
    };
  }, []);

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Events Captured", value: totalCaptured.toLocaleString() },
          { label: "Consumers", value: consumers.length.toString(), color: "#a855f7" },
          { label: "Lag (ms)", value: running ? `${lagMs}ms` : "—", color: lagMs > 20 ? "#f59e0b" : "#22c55e" },
          { label: "Throughput", value: running ? `${throughput}/s` : "—" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-4">
            <div className="text-xs text-[#57789a] mb-1">{m.label}</div>
            <div className="text-xl font-semibold font-mono" style={{ color: m.color || "#1a2f45" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={running ? stopStream : startStream}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            running
              ? "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 hover:bg-[#ef4444]/20"
              : "bg-[#3d9bd4] text-white hover:bg-[#2880b5]"
          }`}
        >
          {running ? (
            <>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="3" width="4" height="10" rx="1" />
                <rect x="9" y="3" width="4" height="10" rx="1" />
              </svg>
              Stop Stream
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 3l9 5-9 5V3z" fill="currentColor" />
              </svg>
              Start Stream
            </>
          )}
        </button>
        <button
          onClick={replayCheckpoint}
          disabled={replaying || events.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[#57789a] border border-[rgba(61,155,212,0.14)] hover:text-[#1a2f45] transition-colors disabled:opacity-50"
        >
          {replaying ? "Replaying…" : "Replay from checkpoint"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event stream */}
        <div className="lg:col-span-2 rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(61,155,212,0.10)] flex items-center justify-between">
            <div className="text-sm font-medium text-[#1a2f45]">DB Operation Events</div>
            {running && <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />}
          </div>
          <div className="divide-y divide-[rgba(61,155,212,0.06)] max-h-[380px] overflow-y-auto">
            {events.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[#57789a]">
                Start the stream to capture CDC events
              </div>
            ) : (
              events.map((evt) => (
                <div key={evt.id} className="px-5 py-3 flex items-center gap-3 hover:bg-[rgba(61,155,212,0.04)] transition-colors">
                  <span className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded border flex-shrink-0 ${OP_COLORS[evt.op]}`}>
                    {evt.op}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#1a2f45]">{evt.table}</span>
                      <span className="text-xs text-[#57789a]">row #{evt.row_id}</span>
                      <span className="text-xs text-[#57789a]">·</span>
                      <span className="text-xs text-[#57789a]">{evt.tenant}</span>
                    </div>
                  </div>
                  <span className="text-xs text-[#57789a] font-mono flex-shrink-0">{evt.latencyMs}ms</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Consumer projections */}
        <div className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-5">
          <p className="text-xs text-[#57789a] uppercase tracking-widest font-medium mb-4">Consumer Projections</p>
          <div className="space-y-4">
            {consumers.map((c) => (
              <div key={c.id} className="rounded-lg border border-[rgba(61,155,212,0.10)] bg-[#f0f7ff] p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#1a2f45] font-mono">{c.name}</span>
                  <span className="text-xs text-[#3d9bd4] font-mono">{c.processed.toLocaleString()}</span>
                </div>
                <div className="text-xs text-[#57789a] mb-2">{c.label}</div>
                <div className="h-1.5 rounded-full bg-[rgba(61,155,212,0.10)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#3d9bd4] transition-all duration-300"
                    style={{ width: `${Math.min(100, (c.processed / Math.max(totalCaptured, 1)) * 100)}%` }}
                  />
                </div>
                <div className="text-xs text-[#57789a] mt-1">
                  {totalCaptured > 0 ? Math.round((c.processed / totalCaptured) * 100) : 0}% synced
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
