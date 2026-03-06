"use client";

import { useState } from "react";

const PRESET_QUERIES = [
  "What were our Q3 earnings?",
  "Who are our top customers?",
  "What is our product roadmap?",
  "When was the company founded?",
  "What's our employee count?",
];

interface ResponseData {
  withoutGuardrails: {
    text: string;
    riskBadges: string[];
  };
  withGuardrails: {
    text: string;
    sources: string[];
    confidence: number;
    groundedBadges: string[];
  };
}

const RESPONSE_DATA: Record<string, ResponseData> = {
  "What were our Q3 earnings?": {
    withoutGuardrails: {
      text: "Our Q3 earnings were $47.3M in revenue, up 28% YoY, with EBITDA margins improving to 22%. Net income came in at $8.1M, beating analyst consensus by $1.2M.",
      riskBadges: ["unverified figures", "no source cited", "hallucination risk"],
    },
    withGuardrails: {
      text: "I don't have access to verified Q3 earnings data in the provided context. Please refer to the official investor relations release or SEC filings for accurate figures.",
      sources: ["[Grounding check: no matching doc found]"],
      confidence: 0.12,
      groundedBadges: ["citation-grounded", "low confidence flagged"],
    },
  },
  "Who are our top customers?": {
    withoutGuardrails: {
      text: "Our top customers are Acme Corp ($2.4M ARR), Fintech Co ($1.8M ARR), and Retail Inc ($1.1M ARR). Together they represent 34% of total revenue.",
      riskBadges: ["fabricated ARR values", "customer names invented", "hallucination risk"],
    },
    withGuardrails: {
      text: "Customer-specific revenue data is not available in the context provided. Top customer information may be found in the CRM or sales reports marked as confidential.",
      sources: ["[No matching document retrieved]", "Privacy policy doc: customer data restricted"],
      confidence: 0.09,
      groundedBadges: ["citation-grounded", "data-restricted flagged"],
    },
  },
  "What is our product roadmap?": {
    withoutGuardrails: {
      text: "Our Q4 roadmap includes: launching the AI assistant feature, expanding to EU markets, and releasing mobile apps for iOS and Android. Beta access starts November 15.",
      riskBadges: ["dates fabricated", "features invented", "hallucination risk"],
    },
    withGuardrails: {
      text: "Based on the retrieved product docs (last updated 2024-03): The roadmap lists three themes — reliability, developer experience, and growth. Specific dates were not found in context.",
      sources: ["product-strategy-2024.md §2.1", "eng-planning-q3.md §Overview"],
      confidence: 0.71,
      groundedBadges: ["citation-grounded", "partial match"],
    },
  },
  "When was the company founded?": {
    withoutGuardrails: {
      text: "The company was founded in 2017 by two MIT graduates who met during a hackathon. It was incorporated in Delaware and raised a $3M seed round in early 2018.",
      riskBadges: ["founding year uncertain", "details fabricated", "hallucination risk"],
    },
    withGuardrails: {
      text: "According to the About page retrieved: the company was founded in 2019. Founding team and funding details were not present in the retrieved context.",
      sources: ["about-us.md §History", "company-handbook.md §Background"],
      confidence: 0.88,
      groundedBadges: ["citation-grounded", "high confidence"],
    },
  },
  "What's our employee count?": {
    withoutGuardrails: {
      text: "We currently have 214 full-time employees across 6 offices. The engineering team is the largest at 87 people, followed by sales at 52.",
      riskBadges: ["headcount fabricated", "office count invented", "hallucination risk"],
    },
    withGuardrails: {
      text: "The most recent employee count found in context (HR handbook, updated Q2 2024) states 'approximately 180 employees'. Current figures may differ — please check HR systems.",
      sources: ["hr-handbook-q2-2024.pdf §1.2 Company Size"],
      confidence: 0.63,
      groundedBadges: ["citation-grounded", "stale data flagged"],
    },
  },
};

interface QueryResult {
  query: string;
  data: ResponseData;
}

export default function HallucinationMitigationEmbed() {
  const [query, setQuery] = useState(PRESET_QUERIES[0]);
  const [customQuery, setCustomQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [queriesRun, setQueriesRun] = useState(0);
  const [hallucinationsCaught, setHallucinationsCaught] = useState(0);
  const [citationsAdded, setCitationsAdded] = useState(0);
  const [totalConfidence, setTotalConfidence] = useState(0);

  const activeQuery = customQuery.trim() || query;
  const avgConfidence = queriesRun > 0 ? (totalConfidence / queriesRun).toFixed(2) : "—";

  async function askQuery() {
    if (running) return;
    setRunning(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));

    const data = RESPONSE_DATA[activeQuery] ?? RESPONSE_DATA[PRESET_QUERIES[0]];
    setResult({ query: activeQuery, data });
    setQueriesRun((n) => n + 1);
    setHallucinationsCaught((n) => n + 1);
    setCitationsAdded((n) => n + data.withGuardrails.sources.length);
    setTotalConfidence((n) => n + data.withGuardrails.confidence);
    setRunning(false);
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Queries Run", value: queriesRun.toString() },
          { label: "Hallucinations Caught", value: hallucinationsCaught.toString(), color: "#ef4444" },
          { label: "Citations Added", value: citationsAdded.toString(), color: "#22c55e" },
          { label: "Avg Confidence", value: avgConfidence !== "—" ? avgConfidence : "—", color: "#3b82f6" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4">
            <div className="text-xs text-[#888888] mb-1">{m.label}</div>
            <div className="text-xl font-semibold font-mono" style={{ color: m.color || "#ededed" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Query panel */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-5 mb-6">
        <p className="text-xs text-[#888888] uppercase tracking-widest font-medium mb-3">Query</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESET_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => { setQuery(q); setCustomQuery(""); }}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                query === q && !customQuery
                  ? "border-[#3b82f6]/50 bg-[#3b82f6]/10 text-[#3b82f6]"
                  : "border-[rgba(255,255,255,0.08)] text-[#888888] hover:text-[#ededed]"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Or type a custom question…"
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askQuery()}
            className="flex-1 bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#ededed] placeholder-[#444444] focus:outline-none focus:border-[#3b82f6]/50"
          />
          <button
            onClick={askQuery}
            disabled={running}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3b82f6] text-white text-sm font-medium hover:bg-[#2563eb] transition-colors disabled:opacity-50"
          >
            {running ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : "Ask"}
          </button>
        </div>
      </div>

      {/* Comparison */}
      {!result && !running && (
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] py-12 text-center text-sm text-[#888888]">
          Ask a question to compare responses with and without guardrails
        </div>
      )}
      {running && (
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] py-12 text-center text-sm text-[#888888]">
          <svg className="animate-spin w-5 h-5 text-[#3b82f6] mx-auto mb-2" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Generating responses…
        </div>
      )}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Without guardrails */}
          <div className="rounded-xl border border-[#ef4444]/25 bg-[#111111] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#ef4444]/15 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
              <span className="text-sm font-semibold text-[#ededed]">Without Guardrails</span>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-[#ededed] leading-relaxed">{result.data.withoutGuardrails.text}</p>
              <div className="flex flex-wrap gap-2">
                {result.data.withoutGuardrails.riskBadges.map((b) => (
                  <span key={b} className="text-xs px-2 py-0.5 rounded border border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]">
                    {b}
                  </span>
                ))}
              </div>
              <div className="text-xs text-[#888888] italic">No sources cited · Confidence: unscored</div>
            </div>
          </div>

          {/* With guardrails */}
          <div className="rounded-xl border border-[#22c55e]/25 bg-[#111111] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#22c55e]/15 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
              <span className="text-sm font-semibold text-[#ededed]">With Guardrails</span>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-[#ededed] leading-relaxed">{result.data.withGuardrails.text}</p>
              <div className="flex flex-wrap gap-2">
                {result.data.withGuardrails.groundedBadges.map((b) => (
                  <span key={b} className="text-xs px-2 py-0.5 rounded border border-[#22c55e]/30 bg-[#22c55e]/10 text-[#22c55e]">
                    {b}
                  </span>
                ))}
              </div>
              <div className="space-y-1.5">
                <div className="text-xs text-[#888888] uppercase tracking-widest">Sources</div>
                {result.data.withGuardrails.sources.map((s, i) => (
                  <div key={i} className="text-xs font-mono text-[#93c5fd] px-2 py-1 rounded bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)]">
                    {s}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#888888]">Confidence:</span>
                <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${result.data.withGuardrails.confidence * 100}%`,
                      background: result.data.withGuardrails.confidence >= 0.7 ? "#22c55e" : result.data.withGuardrails.confidence >= 0.4 ? "#f59e0b" : "#ef4444",
                    }}
                  />
                </div>
                <span className="text-xs font-mono text-[#ededed]">{result.data.withGuardrails.confidence.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
