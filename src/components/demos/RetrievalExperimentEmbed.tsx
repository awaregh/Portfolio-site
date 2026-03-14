"use client";

import { useState } from "react";

interface Strategy {
  id: string;
  name: string;
  description: string;
  params: string;
}

interface RetrievalResult {
  strategyId: string;
  precision3: number;
  ndcg10: number;
  latencyMs: number;
  chunks: string[];
}

const STRATEGIES: Strategy[] = [
  {
    id: "fixed-chunk",
    name: "Fixed Chunk",
    description: "Fixed-size token windows",
    params: "chunk_size=512, overlap=0",
  },
  {
    id: "semantic-split",
    name: "Semantic Split",
    description: "Sentence-boundary aware",
    params: "dynamic sizing, sentence boundaries",
  },
  {
    id: "hierarchical",
    name: "Hierarchical",
    description: "Doc → section → chunk tree",
    params: "3-level tree, parent context",
  },
];

const PRESET_QUERIES = [
  "What is the refund policy?",
  "How does authentication work?",
  "List API rate limits",
  "Error handling best practices",
];

const RESULT_DATA: Record<string, Record<string, RetrievalResult>> = {
  "What is the refund policy?": {
    "fixed-chunk":     { strategyId: "fixed-chunk",    precision3: 0.67, ndcg10: 0.71, latencyMs: 38, chunks: ["Refunds are processed within 5-7 business days…", "To request a refund, contact support@…", "Partial refunds apply to subscription plan…"] },
    "semantic-split":  { strategyId: "semantic-split", precision3: 0.89, ndcg10: 0.84, latencyMs: 52, chunks: ["Full refund guaranteed within 30 days of purchase.", "Subscription refunds are prorated based on…", "Refund requests must include order ID and…"] },
    "hierarchical":    { strategyId: "hierarchical",   precision3: 0.94, ndcg10: 0.91, latencyMs: 74, chunks: ["§3.2 Refund Policy: Customers are entitled to…", "§3.2.1 Eligibility: All digital products…", "§3.2.3 Process: Submit via /account/refunds…"] },
  },
  "How does authentication work?": {
    "fixed-chunk":     { strategyId: "fixed-chunk",    precision3: 0.72, ndcg10: 0.68, latencyMs: 35, chunks: ["Authentication uses JWT tokens with 1h expiry…", "Refresh tokens are stored in HttpOnly cookies…", "OAuth2 flows supported: authorization_code, client…"] },
    "semantic-split":  { strategyId: "semantic-split", precision3: 0.83, ndcg10: 0.79, latencyMs: 49, chunks: ["The API uses Bearer token authentication via JWT.", "Tokens expire after 3600 seconds; use /auth/refresh.", "PKCE is required for public clients."] },
    "hierarchical":    { strategyId: "hierarchical",   precision3: 0.91, ndcg10: 0.88, latencyMs: 71, chunks: ["§2 Auth Overview: All endpoints require…", "§2.1 JWT Structure: header.payload.sig encoded…", "§2.3 Refresh Flow: POST /auth/token {grant_type…"] },
  },
  "List API rate limits": {
    "fixed-chunk":     { strategyId: "fixed-chunk",    precision3: 0.61, ndcg10: 0.65, latencyMs: 33, chunks: ["Rate limits reset every 60 seconds…", "POST /api/chat: 10 req/min per tenant…", "Exceeding limits returns HTTP 429…"] },
    "semantic-split":  { strategyId: "semantic-split", precision3: 0.78, ndcg10: 0.76, latencyMs: 47, chunks: ["Default tier: 60 req/min; Pro tier: 600 req/min.", "Rate limit headers: X-RateLimit-Remaining, -Reset.", "Burst allowance of 2× limit for 10 seconds."] },
    "hierarchical":    { strategyId: "hierarchical",   precision3: 0.88, ndcg10: 0.86, latencyMs: 68, chunks: ["§5 Rate Limiting: Enforced per API key per…", "§5.1 Limits table: /search 30/min, /ingest 120/min…", "§5.2 Headers: consult X-RateLimit-* on every resp…"] },
  },
  "Error handling best practices": {
    "fixed-chunk":     { strategyId: "fixed-chunk",    precision3: 0.69, ndcg10: 0.72, latencyMs: 40, chunks: ["Always check HTTP status codes before parsing…", "Retry with exponential backoff on 5xx errors…", "4xx errors indicate client mistakes; log and fix…"] },
    "semantic-split":  { strategyId: "semantic-split", precision3: 0.85, ndcg10: 0.81, latencyMs: 55, chunks: ["Wrap API calls in try/catch; inspect error.code.", "Use idempotency keys for safe retries on network err.", "Circuit breakers prevent cascading failures."] },
    "hierarchical":    { strategyId: "hierarchical",   precision3: 0.92, ndcg10: 0.90, latencyMs: 77, chunks: ["§8 Error Handling: The SDK exposes typed…", "§8.1 Retryable errors: 429, 503, network timeout…", "§8.3 Non-retryable: 400, 401, 403 — fix before retry"] },
  },
};

function metricColor(val: number, lo: number, hi: number) {
  if (val >= hi) return "#22c55e";
  if (val >= lo) return "#f59e0b";
  return "#ef4444";
}

export default function RetrievalExperimentEmbed() {
  const [query, setQuery] = useState(PRESET_QUERIES[0]);
  const [customQuery, setCustomQuery] = useState("");
  const [selectedStrategies, setSelectedStrategies] = useState<Set<string>>(new Set(["fixed-chunk", "semantic-split", "hierarchical"]));
  const [results, setResults] = useState<RetrievalResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [queriesRun, setQueriesRun] = useState(0);
  const [avgP3, setAvgP3] = useState(0);
  const [avgNdcg, setAvgNdcg] = useState(0);
  const [bestStrategy, setBestStrategy] = useState("—");

  const activeQuery = customQuery.trim() || query;

  function toggleStrategy(id: string) {
    setSelectedStrategies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function runRetrieval() {
    if (running) return;
    setRunning(true);
    setResults(null);
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));

    const dataForQuery = RESULT_DATA[activeQuery] ?? RESULT_DATA[PRESET_QUERIES[0]];
    const out: RetrievalResult[] = [...selectedStrategies].map((sid) => {
      const base = dataForQuery[sid] ?? { strategyId: sid, precision3: 0.7 + Math.random() * 0.2, ndcg10: 0.65 + Math.random() * 0.25, latencyMs: 30 + Math.floor(Math.random() * 60), chunks: ["Retrieved chunk 1…", "Retrieved chunk 2…", "Retrieved chunk 3…"] };
      return base;
    });

    setResults(out);
    setQueriesRun((n) => n + 1);
    const p3Avg = out.reduce((a, r) => a + r.precision3, 0) / out.length;
    const ndcgAvg = out.reduce((a, r) => a + r.ndcg10, 0) / out.length;
    setAvgP3(p3Avg);
    setAvgNdcg(ndcgAvg);
    const best = out.reduce((a, b) => a.precision3 >= b.precision3 ? a : b);
    setBestStrategy(STRATEGIES.find((s) => s.id === best.strategyId)?.name ?? "—");
    setRunning(false);
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Queries Run", value: queriesRun.toString() },
          { label: "Best Strategy", value: bestStrategy, color: "#a855f7" },
          { label: "Avg P@3", value: queriesRun > 0 ? avgP3.toFixed(2) : "—", color: "#22c55e" },
          { label: "Avg nDCG", value: queriesRun > 0 ? avgNdcg.toFixed(2) : "—", color: "#3d9bd4" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-4">
            <div className="text-xs text-[#57789a] mb-1">{m.label}</div>
            <div className="text-lg font-semibold font-mono truncate" style={{ color: m.color || "#1a2f45" }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Query + strategies */}
        <div className="space-y-5">
          <div className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-5">
            <p className="text-xs text-[#57789a] uppercase tracking-widest font-medium mb-3">Query</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => { setQuery(q); setCustomQuery(""); }}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    query === q && !customQuery
                      ? "border-[#3d9bd4]/50 bg-[#3d9bd4]/10 text-[#3d9bd4]"
                      : "border-[rgba(61,155,212,0.14)] text-[#57789a] hover:text-[#1a2f45]"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Or type a custom query…"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              className="w-full bg-[#f0f7ff] border border-[rgba(61,155,212,0.14)] rounded-lg px-3 py-2 text-sm text-[#1a2f45] placeholder-[#57789a] focus:outline-none focus:border-[#3d9bd4]/50"
            />
          </div>

          <div className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-5">
            <p className="text-xs text-[#57789a] uppercase tracking-widest font-medium mb-3">Strategies</p>
            <div className="space-y-2">
              {STRATEGIES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleStrategy(s.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    selectedStrategies.has(s.id)
                      ? "border-[#3d9bd4]/50 bg-[#3d9bd4]/05"
                      : "border-[rgba(61,155,212,0.10)] hover:border-[rgba(61,155,212,0.16)]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center ${selectedStrategies.has(s.id) ? "border-[#3d9bd4] bg-[#3d9bd4]" : "border-[rgba(61,155,212,0.24)]"}`}>
                      {selectedStrategies.has(s.id) && <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
                    </div>
                    <span className="text-xs font-semibold text-[#1a2f45]">{s.name}</span>
                  </div>
                  <div className="text-xs text-[#57789a] ml-5">{s.description}</div>
                  <div className="text-xs font-mono text-[#444444] ml-5 mt-0.5">{s.params}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={runRetrieval}
            disabled={running}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3d9bd4] text-white text-sm font-medium hover:bg-[#2880b5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Retrieving…
              </>
            ) : "Run Retrieval"}
          </button>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[rgba(61,155,212,0.14)] bg-[#ffffff] overflow-hidden">
            <div className="px-5 py-4 border-b border-[rgba(61,155,212,0.10)]">
              <div className="text-sm font-medium text-[#1a2f45]">Retrieval Results</div>
              <div className="text-xs text-[#57789a] font-mono truncate mt-0.5">{activeQuery}</div>
            </div>
            <div className="p-5 space-y-4">
              {!results && !running && (
                <div className="py-8 text-center text-sm text-[#57789a]">
                  Select strategies and run retrieval to compare results
                </div>
              )}
              {running && (
                <div className="py-8 text-center text-sm text-[#57789a]">
                  <svg className="animate-spin w-5 h-5 text-[#3d9bd4] mx-auto mb-2" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Running retrieval across strategies…
                </div>
              )}
              {results && results.map((r) => {
                const strat = STRATEGIES.find((s) => s.id === r.strategyId)!;
                return (
                  <div key={r.strategyId} className="rounded-lg border border-[rgba(61,155,212,0.14)] bg-[#f0f7ff] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-[#1a2f45]">{strat.name}</span>
                      <div className="flex gap-3 text-xs font-mono">
                        <span style={{ color: metricColor(r.precision3, 0.7, 0.85) }}>P@3 {r.precision3.toFixed(2)}</span>
                        <span style={{ color: metricColor(r.ndcg10, 0.7, 0.85) }}>nDCG {r.ndcg10.toFixed(2)}</span>
                        <span className="text-[#57789a]">{r.latencyMs}ms</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {r.chunks.map((chunk, ci) => (
                        <div key={ci} className="text-xs text-[#57789a] px-3 py-2 rounded bg-[#ffffff] border border-[rgba(61,155,212,0.08)] font-mono">
                          <span className="text-[#444444] mr-2">#{ci + 1}</span>{chunk}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
