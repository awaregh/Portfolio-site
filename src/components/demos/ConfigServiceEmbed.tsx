"use client";

import { useState } from "react";

type ConfigType = "boolean" | "number";

interface ConfigKey {
  key: string;
  type: ConfigType;
  value: boolean | number;
  description: string;
}

interface AuditEntry {
  id: string;
  key: string;
  oldValue: boolean | number;
  newValue: boolean | number;
  ts: number;
}

interface DeployLog {
  env: string;
  status: "pushed";
  ts: number;
}

const INITIAL_CONFIGS: ConfigKey[] = [
  { key: "feature.new_checkout",  type: "boolean", value: true,  description: "Enable redesigned checkout flow" },
  { key: "feature.ai_suggestions",type: "boolean", value: false, description: "AI-powered search suggestions" },
  { key: "api.rate_limit",        type: "number",  value: 100,   description: "Requests per minute per tenant" },
  { key: "api.timeout_ms",        type: "number",  value: 5000,  description: "Upstream request timeout" },
  { key: "app.maintenance_mode",  type: "boolean", value: false, description: "Take app offline for maintenance" },
  { key: "app.max_file_size_mb",  type: "number",  value: 10,    description: "Max upload size in megabytes" },
];

let auditCounter = 0;
let publishCounter = 0;

export default function ConfigServiceEmbed() {
  const [configs, setConfigs] = useState<ConfigKey[]>(INITIAL_CONFIGS);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [deployLog, setDeployLog] = useState<DeployLog[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());

  const activeKeys = configs.length;
  const featureFlagsOn = configs.filter((c) => c.type === "boolean" && c.value === true).length;
  const overrides = auditLog.length;
  const lastPublished = deployLog.length > 0 ? new Date(deployLog[0].ts).toLocaleTimeString() : "—";

  function startEdit(cfg: ConfigKey) {
    setEditingKey(cfg.key);
    setEditValue(String(cfg.value));
  }

  function applyEdit(cfg: ConfigKey) {
    const oldValue = cfg.value;
    let newValue: boolean | number;
    if (cfg.type === "boolean") {
      newValue = editValue === "true";
    } else {
      const parsed = Number(editValue);
      if (isNaN(parsed)) { setEditingKey(null); return; }
      newValue = parsed;
    }

    if (newValue === oldValue) { setEditingKey(null); return; }

    setConfigs((prev) => prev.map((c) => c.key === cfg.key ? { ...c, value: newValue } : c));
    setPendingChanges((prev) => new Set([...prev, cfg.key]));
    const entry: AuditEntry = {
      id: `chg-${(++auditCounter).toString().padStart(3, "0")}`,
      key: cfg.key,
      oldValue,
      newValue,
      ts: Date.now(),
    };
    setAuditLog((prev) => [entry, ...prev].slice(0, 40));
    setEditingKey(null);
  }

  async function publish() {
    if (publishing || pendingChanges.size === 0) return;
    setPublishing(true);
    await new Promise((r) => setTimeout(r, 900));
    const envs = ["development", "staging", "production"];
    const now = Date.now();
    const newDeployEntries: DeployLog[] = envs.map((env) => ({ env, status: "pushed" as const, ts: now + envs.indexOf(env) * 50 }));
    setDeployLog((prev) => [...newDeployEntries, ...prev].slice(0, 20));
    setPendingChanges(new Set());
    publishCounter++;
    setPublishing(false);
  }

  function formatValue(cfg: ConfigKey) {
    if (cfg.type === "boolean") return cfg.value ? "true" : "false";
    return String(cfg.value);
  }

  function valueColor(cfg: ConfigKey) {
    if (cfg.type === "boolean") return cfg.value ? "#22c55e" : "#ef4444";
    return "#f59e0b";
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Keys", value: activeKeys.toString() },
          { label: "Feature Flags On", value: featureFlagsOn.toString(), color: "#22c55e" },
          { label: "Overrides", value: overrides.toString(), color: overrides > 0 ? "#f59e0b" : "#57789a" },
          { label: "Last Published", value: lastPublished },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-4">
            <div className="text-xs text-[#57789a] mb-1">{m.label}</div>
            <div className="text-lg font-semibold font-mono truncate" style={{ color: m.color || "#1a2f45" }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Config keys */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-[#57789a] uppercase tracking-widest font-medium">Config Keys</p>
            <button
              onClick={publish}
              disabled={publishing || pendingChanges.size === 0}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                pendingChanges.size > 0
                  ? "bg-[#3d9bd4] text-white hover:bg-[#2880b5]"
                  : "border border-[rgba(61,155,212,0.14)] text-[#57789a] cursor-not-allowed"
              } disabled:opacity-50`}
            >
              {publishing ? (
                <>
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Publishing…
                </>
              ) : pendingChanges.size > 0 ? `Publish (${pendingChanges.size} change${pendingChanges.size > 1 ? "s" : ""})` : "Publish"}
            </button>
          </div>

          <div className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] overflow-hidden">
            <div className="divide-y divide-[rgba(61,155,212,0.06)]">
              {configs.map((cfg) => {
                const isEditing = editingKey === cfg.key;
                const isPending = pendingChanges.has(cfg.key);
                return (
                  <div key={cfg.key} className="px-5 py-4 hover:bg-[rgba(61,155,212,0.04)] transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-mono font-semibold text-[#1a2f45]">{cfg.key}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${
                            cfg.type === "boolean"
                              ? "text-[#a855f7] bg-[#a855f7]/10 border-[#a855f7]/20"
                              : "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20"
                          }`}>{cfg.type}</span>
                          {isPending && <span className="text-xs text-[#f59e0b]">● unsaved</span>}
                        </div>
                        <div className="text-xs text-[#57789a]">{cfg.description}</div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isEditing ? (
                          cfg.type === "boolean" ? (
                            <div className="flex gap-1">
                              {["true", "false"].map((v) => (
                                <button
                                  key={v}
                                  onClick={() => { setEditValue(v); applyEdit({ ...cfg, value: v === "true" }); }}
                                  className={`text-xs px-2.5 py-1 rounded border transition-all ${
                                    editValue === v
                                      ? "border-[#3d9bd4]/50 bg-[#3d9bd4]/10 text-[#3d9bd4]"
                                      : "border-[rgba(61,155,212,0.14)] text-[#57789a] hover:text-[#1a2f45]"
                                  }`}
                                >
                                  {v}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") applyEdit(cfg); if (e.key === "Escape") setEditingKey(null); }}
                                autoFocus
                                className="w-20 bg-[#f0f7ff] border border-[#3d9bd4]/50 rounded px-2 py-1 text-xs font-mono text-[#1a2f45] focus:outline-none"
                              />
                              <button onClick={() => applyEdit(cfg)} className="text-xs px-2 py-1 rounded bg-[#3d9bd4] text-white">✓</button>
                              <button onClick={() => setEditingKey(null)} className="text-xs px-2 py-1 rounded border border-[rgba(61,155,212,0.14)] text-[#57789a]">✕</button>
                            </div>
                          )
                        ) : (
                          <button
                            onClick={() => startEdit(cfg)}
                            className="font-mono text-sm font-semibold px-2 py-0.5 rounded hover:bg-[rgba(61,155,212,0.10)] transition-colors"
                            style={{ color: valueColor(cfg) }}
                          >
                            {formatValue(cfg)}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deploy log */}
          {deployLog.length > 0 && (
            <div className="rounded-xl border border-[#22c55e]/20 bg-[#22c55e]/05 p-4">
              <div className="text-xs font-semibold text-[#22c55e] mb-2">Config pushed to 3 environments</div>
              <div className="space-y-1">
                {deployLog.slice(0, 3).map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-[#22c55e]">✓</span>
                    <span className="text-[#57789a]">{d.env}</span>
                    <span className="text-[#57789a]">→</span>
                    <span className="text-[#1a2f45]">pushed</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Audit log */}
        <div className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(61,155,212,0.10)]">
            <div className="text-sm font-medium text-[#1a2f45]">Audit Log</div>
          </div>
          <div className="divide-y divide-[rgba(61,155,212,0.06)] max-h-[480px] overflow-y-auto">
            {auditLog.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[#57789a]">
                Edit a config key to see audit entries
              </div>
            ) : (
              auditLog.map((entry) => (
                <div key={entry.id} className="px-4 py-3 hover:bg-[rgba(61,155,212,0.04)] transition-colors">
                  <div className="text-xs font-mono text-[#1a2f45] mb-1 truncate">{entry.key}</div>
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <span className="text-[#ef4444]">{String(entry.oldValue)}</span>
                    <span className="text-[#57789a]">→</span>
                    <span className="text-[#22c55e]">{String(entry.newValue)}</span>
                  </div>
                  <div className="text-xs text-[#57789a] mt-0.5">{new Date(entry.ts).toLocaleTimeString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
