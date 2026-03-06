"use client";

import { useState, useRef } from "react";

type StepStatus = "pending" | "running" | "done";

interface MigrationStep {
  phase: string;
  badge: string;
  badgeColor: string;
  output: string;
}

interface Scenario {
  id: string;
  label: string;
  description: string;
  steps: MigrationStep[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "add-nullable",
    label: "Add Nullable Column",
    description: "Add metadata JSONB NULL to orders table",
    steps: [
      {
        phase: "Plan",
        badge: "plan",
        badgeColor: "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20",
        output: "ALTER TABLE orders ADD COLUMN metadata JSONB NULL;\n-- Backward-compatible: existing rows default to NULL",
      },
      {
        phase: "Validate backward compat",
        badge: "validate",
        badgeColor: "text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/20",
        output: "✓ Column is nullable — no default required\n✓ Existing consumers unaffected\n✓ 3 services checked: orders-svc, billing-svc, reporting-svc",
      },
      {
        phase: "Apply migration",
        badge: "migrate",
        badgeColor: "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20",
        output: "psql> ALTER TABLE orders ADD COLUMN metadata JSONB NULL;\nALTER TABLE\nTime: 12.4ms  Rows affected: 0",
      },
      {
        phase: "Health check",
        badge: "verify",
        badgeColor: "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20",
        output: "✓ orders-svc /health → 200 OK\n✓ billing-svc /health → 200 OK\n✓ Schema registry updated → version 4.2.1",
      },
    ],
  },
  {
    id: "rename-column",
    label: "Rename Column",
    description: "Rename user_name → display_name with backward-compat view",
    steps: [
      {
        phase: "Plan",
        badge: "plan",
        badgeColor: "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20",
        output: "-- Phase 1: add new column\nALTER TABLE users ADD COLUMN display_name TEXT;\n-- Phase 2: create compat view\nCREATE OR REPLACE VIEW users_v1 AS\n  SELECT *, display_name AS user_name FROM users;",
      },
      {
        phase: "Validate backward compat",
        badge: "validate",
        badgeColor: "text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/20",
        output: "✓ View users_v1 exposes legacy column name\n✓ 2 consumers still query user_name via view\n✓ No breaking change detected",
      },
      {
        phase: "Apply migration",
        badge: "migrate",
        badgeColor: "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20",
        output: "ALTER TABLE users ADD COLUMN display_name TEXT;\nUPDATE users SET display_name = user_name;\nCREATE VIEW users_v1 ...\nTime: 34.1ms  Rows affected: 18,204",
      },
      {
        phase: "Health check",
        badge: "verify",
        badgeColor: "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20",
        output: "✓ Legacy queries via users_v1 → correct results\n✓ New queries via display_name → correct results\n✓ Dual-write period: 7 days scheduled",
      },
    ],
  },
  {
    id: "kafka-field",
    label: "Add Kafka Field (Backward-Compat)",
    description: "Add optional field to Avro event schema",
    steps: [
      {
        phase: "Plan",
        badge: "plan",
        badgeColor: "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20",
        output: '// Avro schema diff\n+ {"name": "region", "type": ["null", "string"],\n+  "default": null, "doc": "ISO 3166-1 alpha-2"}',
      },
      {
        phase: "Validate backward compat",
        badge: "validate",
        badgeColor: "text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/20",
        output: "✓ Field is union with null default — backward-compatible\n✓ Schema Registry compatibility check: BACKWARD_TRANSITIVE\n✓ 4 consumer groups validated",
      },
      {
        phase: "Apply migration",
        badge: "migrate",
        badgeColor: "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20",
        output: "PUT /subjects/order-events/versions\nSchema ID: 47  Version: 8\nCompatibility: BACKWARD_TRANSITIVE ✓",
      },
      {
        phase: "Health check",
        badge: "verify",
        badgeColor: "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20",
        output: "✓ Producers publishing with new field\n✓ Old consumers deserialise without error\n✓ Consumer lag: 0 across all partitions",
      },
    ],
  },
  {
    id: "api-version-fork",
    label: "API Version Fork",
    description: "Split /api/v1/users → /api/v2/users",
    steps: [
      {
        phase: "Plan",
        badge: "plan",
        badgeColor: "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20",
        output: "// Router diff\n+ app.get('/api/v2/users', v2UsersHandler);\n  app.get('/api/v1/users', v1UsersHandler); // kept\n// v2 returns {data, meta, links} envelope",
      },
      {
        phase: "Validate backward compat",
        badge: "validate",
        badgeColor: "text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/20",
        output: "✓ v1 route still mounted and returns same shape\n✓ Contract tests pass for /api/v1/users\n✓ 3rd-party clients on v1 unaffected",
      },
      {
        phase: "Apply migration",
        badge: "migrate",
        badgeColor: "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20",
        output: "Deploying users-svc@2.4.0 → prod\nRolling update: 3/3 pods healthy\nRoute /api/v2/users registered",
      },
      {
        phase: "Health check",
        badge: "verify",
        badgeColor: "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20",
        output: "✓ GET /api/v1/users → 200 (legacy shape)\n✓ GET /api/v2/users → 200 (new envelope)\n✓ Deprecation header added to v1 responses",
      },
    ],
  },
];

interface RunRecord {
  id: string;
  scenarioLabel: string;
  durationMs: number;
  ts: number;
}

interface ActiveStep {
  index: number;
  status: StepStatus;
}

export default function SchemaEvolutionEmbed() {
  const [selected, setSelected] = useState<Scenario>(SCENARIOS[0]);
  const [activeSteps, setActiveSteps] = useState<ActiveStep[]>([]);
  const [running, setRunning] = useState(false);
  const [runLog, setRunLog] = useState<RunRecord[]>([]);
  const [totalMigrations, setTotalMigrations] = useState(0);
  const [applied, setApplied] = useState(0);
  const [lastDuration, setLastDuration] = useState<number | null>(null);
  const runIdRef = useRef(0);

  async function runMigration() {
    if (running) return;
    setRunning(true);
    setActiveSteps(selected.steps.map((_, i) => ({ index: i, status: "pending" as StepStatus })));

    const start = Date.now();
    for (let i = 0; i < selected.steps.length; i++) {
      await new Promise((r) => setTimeout(r, 180));
      setActiveSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, status: "running" } : s));
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
      setActiveSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, status: "done" } : s));
    }

    const duration = Date.now() - start;
    setLastDuration(duration);
    setTotalMigrations((n) => n + 1);
    setApplied((n) => n + 1);
    const logId = `mig-${(++runIdRef.current).toString().padStart(3, "0")}`;
    setRunLog((prev) => [
      { id: logId, scenarioLabel: selected.label, durationMs: duration, ts: Date.now() },
      ...prev,
    ].slice(0, 20));
    setRunning(false);
  }

  const passedValidation = runLog.length;

  return (
    <div>
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Migrations", value: totalMigrations.toString() },
          { label: "Passed Validation", value: passedValidation.toString(), color: "#22c55e" },
          { label: "Applied", value: applied.toString(), color: "#3b82f6" },
          { label: "Last Duration", value: lastDuration ? `${(lastDuration / 1000).toFixed(1)}s` : "—" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4">
            <div className="text-xs text-[#888888] mb-1">{m.label}</div>
            <div className="text-xl font-semibold font-mono" style={{ color: m.color || "#ededed" }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scenario selector */}
        <div className="space-y-3">
          <p className="text-xs text-[#888888] uppercase tracking-widest font-medium mb-4">Migration Scenarios</p>
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => { if (!running) { setSelected(sc); setActiveSteps([]); } }}
              className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
                selected.id === sc.id
                  ? "border-[#3b82f6]/50 bg-[#3b82f6]/05"
                  : "border-[rgba(255,255,255,0.08)] bg-[#111111] hover:border-[rgba(255,255,255,0.14)]"
              } ${running ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="text-sm font-medium text-[#ededed] mb-1">{sc.label}</div>
              <div className="text-xs text-[#888888]">{sc.description}</div>
            </button>
          ))}

          <button
            onClick={runMigration}
            disabled={running}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3b82f6] text-white text-sm font-medium hover:bg-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {running ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Running…
              </>
            ) : (
              "Run Migration"
            )}
          </button>
        </div>

        {/* Steps + log */}
        <div className="lg:col-span-2 space-y-4">
          {/* Migration steps */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] overflow-hidden">
            <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
              <div className="text-sm font-semibold text-[#ededed]">{selected.label}</div>
              <div className="text-xs text-[#888888]">{selected.description}</div>
            </div>
            <div className="p-5 space-y-3">
              {selected.steps.map((step, idx) => {
                const activeStep = activeSteps[idx];
                const status: StepStatus = activeStep?.status ?? "pending";
                return (
                  <div key={idx}>
                    {idx > 0 && (
                      <div className="flex justify-center py-1">
                        <div className={`w-px h-4 transition-colors duration-300 ${status !== "pending" ? "bg-[#3b82f6]/40" : "bg-[rgba(255,255,255,0.08)]"}`} />
                      </div>
                    )}
                    <div className={`rounded-lg border p-3.5 transition-all duration-300 ${
                      status === "running"
                        ? "border-[#3b82f6]/40 bg-[#3b82f6]/05"
                        : status === "done"
                        ? "border-[rgba(255,255,255,0.10)] bg-[#0f0f0f]"
                        : "border-[rgba(255,255,255,0.06)] bg-[#0a0a0a]"
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                          {status === "running" && (
                            <svg className="animate-spin w-4 h-4 text-[#3b82f6]" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          )}
                          {status === "done" && (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <circle cx="8" cy="8" r="7" fill="#22c55e" fillOpacity="0.15" stroke="#22c55e" strokeWidth="1.5" />
                              <path d="M5 8l2 2 4-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                          {status === "pending" && (
                            <div className="w-4 h-4 rounded-full border border-[rgba(255,255,255,0.15)]" />
                          )}
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${step.badgeColor}`}>
                          {step.badge}
                        </span>
                        <span className={`text-sm flex-1 ${status === "pending" ? "text-[#888888]" : "text-[#ededed]"}`}>
                          {step.phase}
                        </span>
                      </div>
                      {status === "done" && (
                        <div className="mt-2.5 ml-8 px-3 py-2 rounded bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)]">
                          <pre className="text-xs text-[#93c5fd] font-mono whitespace-pre-wrap">{step.output}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Migration log */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] overflow-hidden">
            <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
              <div className="text-sm font-medium text-[#ededed]">Migration Log</div>
            </div>
            <div className="divide-y divide-[rgba(255,255,255,0.04)] max-h-[180px] overflow-y-auto">
              {runLog.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-[#888888]">
                  No migrations run yet
                </div>
              ) : (
                runLog.map((r) => (
                  <div key={r.id} className="px-5 py-3 flex items-center gap-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <span className="text-xs font-mono text-[#888888]">{r.id}</span>
                    <span className="text-xs font-medium text-[#ededed] flex-1">{r.scenarioLabel}</span>
                    <span className="text-xs text-[#22c55e]">{(r.durationMs / 1000).toFixed(1)}s</span>
                    <span className="text-xs text-[#888888]">{new Date(r.ts).toLocaleTimeString()}</span>
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
