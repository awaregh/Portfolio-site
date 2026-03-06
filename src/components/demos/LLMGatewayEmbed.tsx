"use client";

import { useState } from "react";

type RoutingStrategy = "Cost-Optimized" | "Latency-First" | "Availability" | "Round-Robin";

const PRESET_PROMPTS = [
  "Summarize this text",
  "Generate unit tests",
  "Explain this error",
  "Write a regex",
];

interface Provider {
  id: string;
  name: string;
  model: string;
  costPer1kIn: number;
  costPer1kOut: number;
  avgLatencyMs: number;
  available: boolean;
}

const PROVIDERS: Provider[] = [
  { id: "gpt-4o",          name: "openai",    model: "gpt-4o",              costPer1kIn: 0.005,  costPer1kOut: 0.015,  avgLatencyMs: 820,  available: true },
  { id: "gpt-4o-mini",     name: "openai",    model: "gpt-4o-mini",         costPer1kIn: 0.00015, costPer1kOut: 0.0006, avgLatencyMs: 420,  available: true },
  { id: "claude-3-haiku",  name: "anthropic", model: "claude-3-haiku",      costPer1kIn: 0.00025, costPer1kOut: 0.00125, avgLatencyMs: 480, available: true },
  { id: "gemini-flash",    name: "google",    model: "gemini-flash",         costPer1kIn: 0.0001,  costPer1kOut: 0.0004, avgLatencyMs: 350,  available: true },
];

const TOKEN_STEPS = [256, 512, 1024, 2048];

interface RequestLog {
  id: string;
  provider: string;
  model: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  strategy: RoutingStrategy;
  reason: string;
  ts: number;
}

let reqCounter = 0;

function selectProvider(strategy: RoutingStrategy, maxTokens: number, promptLen: number): { provider: Provider; reason: string } {
  const available = PROVIDERS.filter((p) => p.available);
  switch (strategy) {
    case "Cost-Optimized": {
      const p = available.reduce((a, b) => {
        const costA = a.costPer1kIn * (promptLen / 1000) + a.costPer1kOut * (maxTokens / 1000);
        const costB = b.costPer1kIn * (promptLen / 1000) + b.costPer1kOut * (maxTokens / 1000);
        return costA <= costB ? a : b;
      });
      return { provider: p, reason: `lowest cost for prompt length (${promptLen} tokens)` };
    }
    case "Latency-First": {
      const p = available.reduce((a, b) => a.avgLatencyMs <= b.avgLatencyMs ? a : b);
      return { provider: p, reason: `lowest p50 latency (${p.avgLatencyMs}ms)` };
    }
    case "Availability": {
      const p = available[Math.floor(Math.random() * available.length)];
      return { provider: p, reason: "highest recent availability (99.97%)" };
    }
    case "Round-Robin": {
      const p = available[reqCounter % available.length];
      return { provider: p, reason: `round-robin slot ${reqCounter % available.length + 1}/${available.length}` };
    }
  }
}

export default function LLMGatewayEmbed() {
  const [prompt, setPrompt] = useState(PRESET_PROMPTS[0]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [strategy, setStrategy] = useState<RoutingStrategy>("Cost-Optimized");
  const [maxTokensIdx, setMaxTokensIdx] = useState(1);
  const [routing, setRouting] = useState(false);
  const [lastRouting, setLastRouting] = useState<{ provider: Provider; reason: string; log: RequestLog } | null>(null);
  const [logs, setLogs] = useState<RequestLog[]>([]);

  const activePrompt = customPrompt.trim() || prompt;
  const maxTokens = TOKEN_STEPS[maxTokensIdx];
  const totalRequests = logs.length;
  const totalCost = logs.reduce((a, l) => a + l.cost, 0);
  const avgLatency = logs.length > 0 ? (logs.reduce((a, l) => a + l.latencyMs, 0) / logs.length).toFixed(0) : "—";
  const activeProviders = PROVIDERS.filter((p) => p.available).length;

  async function routeRequest() {
    if (routing) return;
    setRouting(true);

    const promptTokens = Math.floor(activePrompt.length / 3.5) + 10;
    const { provider, reason } = selectProvider(strategy, maxTokens, promptTokens);
    const latency = provider.avgLatencyMs + Math.floor((Math.random() - 0.5) * 120);
    await new Promise((r) => setTimeout(r, Math.min(latency, 900)));

    const tokensOut = Math.floor(maxTokens * (0.4 + Math.random() * 0.4));
    const cost = provider.costPer1kIn * (promptTokens / 1000) + provider.costPer1kOut * (tokensOut / 1000);
    const logEntry: RequestLog = {
      id: `req-${(++reqCounter).toString().padStart(4, "0")}`,
      provider: `${provider.name}/${provider.model}`,
      model: provider.model,
      latencyMs: latency,
      tokensIn: promptTokens,
      tokensOut,
      cost,
      strategy,
      reason,
      ts: Date.now(),
    };

    setLastRouting({ provider, reason, log: logEntry });
    setLogs((prev) => [logEntry, ...prev].slice(0, 40));
    setRouting(false);
  }

  const STRATEGIES: RoutingStrategy[] = ["Cost-Optimized", "Latency-First", "Availability", "Round-Robin"];

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Requests", value: totalRequests.toString() },
          { label: "Total Cost", value: `$${totalCost.toFixed(5)}`, color: "#f59e0b" },
          { label: "Avg Latency", value: avgLatency !== "—" ? `${avgLatency}ms` : "—" },
          { label: "Active Providers", value: activeProviders.toString(), color: "#22c55e" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4">
            <div className="text-xs text-[#888888] mb-1">{m.label}</div>
            <div className="text-xl font-semibold font-mono" style={{ color: m.color || "#ededed" }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: request form */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-5">
            <p className="text-xs text-[#888888] uppercase tracking-widest font-medium mb-3">Prompt</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => { setPrompt(p); setCustomPrompt(""); }}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    prompt === p && !customPrompt
                      ? "border-[#3b82f6]/50 bg-[#3b82f6]/10 text-[#3b82f6]"
                      : "border-[rgba(255,255,255,0.08)] text-[#888888] hover:text-[#ededed]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Or type a custom prompt…"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#ededed] placeholder-[#444444] focus:outline-none focus:border-[#3b82f6]/50"
            />
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-5">
            <p className="text-xs text-[#888888] uppercase tracking-widest font-medium mb-3">Routing Strategy</p>
            <div className="space-y-1.5">
              {STRATEGIES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStrategy(s)}
                  className={`w-full text-left rounded-lg border px-3 py-2 transition-all text-sm ${
                    strategy === s
                      ? "border-[#3b82f6]/50 bg-[#3b82f6]/05 text-[#ededed]"
                      : "border-[rgba(255,255,255,0.06)] text-[#888888] hover:text-[#ededed] hover:border-[rgba(255,255,255,0.12)]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-5">
            <p className="text-xs text-[#888888] uppercase tracking-widest font-medium mb-3">Max Tokens</p>
            <div className="flex gap-2">
              {TOKEN_STEPS.map((t, i) => (
                <button
                  key={t}
                  onClick={() => setMaxTokensIdx(i)}
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-all font-mono ${
                    maxTokensIdx === i
                      ? "border-[#3b82f6]/50 bg-[#3b82f6]/10 text-[#3b82f6]"
                      : "border-[rgba(255,255,255,0.08)] text-[#888888] hover:text-[#ededed]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={routeRequest}
            disabled={routing}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3b82f6] text-white text-sm font-medium hover:bg-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {routing ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Routing…
              </>
            ) : "Route Request"}
          </button>

          {/* Routing decision */}
          {lastRouting && (
            <div className="rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/05 p-4">
              <div className="text-xs text-[#22c55e] font-semibold mb-2">Selected Provider</div>
              <div className="text-sm font-mono text-[#ededed] mb-1">{lastRouting.provider.name}/{lastRouting.provider.model}</div>
              <div className="text-xs text-[#888888] mb-3">Reason: {lastRouting.reason}</div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div><span className="text-[#888888]">Tokens:</span> <span className="text-[#ededed]">{lastRouting.log.tokensIn}+{lastRouting.log.tokensOut}</span></div>
                <div><span className="text-[#888888]">Cost:</span> <span className="text-[#f59e0b]">${lastRouting.log.cost.toFixed(5)}</span></div>
                <div><span className="text-[#888888]">Latency:</span> <span className="text-[#ededed]">{lastRouting.log.latencyMs}ms</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Right: request log */}
        <div className="lg:col-span-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
            <div className="text-sm font-medium text-[#ededed]">Request Log</div>
          </div>
          <div className="divide-y divide-[rgba(255,255,255,0.04)] max-h-[560px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[#888888]">
                Route a request to see provider decisions
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="px-5 py-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono text-[#888888]">{log.id}</span>
                    <span className="text-xs font-semibold text-[#ededed] font-mono">{log.provider}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded border border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#3b82f6]">{log.strategy}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono flex-wrap">
                    <span className="text-[#888888]">{log.latencyMs}ms</span>
                    <span className="text-[#888888]">·</span>
                    <span className="text-[#888888]">{log.tokensIn}+{log.tokensOut}tk</span>
                    <span className="text-[#888888]">·</span>
                    <span className="text-[#f59e0b]">${log.cost.toFixed(5)}</span>
                    <span className="text-[#888888] ml-auto">{new Date(log.ts).toLocaleTimeString()}</span>
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
