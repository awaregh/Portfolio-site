"use client";

import Link from "next/link";
import { useState } from "react";

const TEMPLATES = [
  {
    id: "portfolio",
    name: "Portfolio",
    accent: "#3b82f6",
    nav: ["Home", "Work", "Contact"],
    hero: "Ahmed Waregh",
    sub: "Backend Engineer · AI Infrastructure",
    sections: ["Featured Projects", "About Me"],
  },
  {
    id: "agency",
    name: "Agency",
    accent: "#a855f7",
    nav: ["Services", "Work", "Team", "Contact"],
    hero: "We Build Digital Products",
    sub: "Strategy · Design · Engineering",
    sections: ["Our Services", "Recent Work"],
  },
  {
    id: "saas",
    name: "SaaS Landing",
    accent: "#22c55e",
    nav: ["Features", "Pricing", "Docs", "Login"],
    hero: "Ship Faster With Our Platform",
    sub: "The developer-first infrastructure for modern teams",
    sections: ["Features", "Pricing Plans"],
  },
];

type BuildStatus = "idle" | "building" | "done";

interface BuildStep {
  label: string;
  status: "pending" | "running" | "done";
}

export default function SaasWebsiteBuilderDemo() {
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [buildStatus, setBuildStatus] = useState<BuildStatus>("idle");
  const [buildSteps, setBuildSteps] = useState<BuildStep[]>([]);
  const [publishUrl, setPublishUrl] = useState("");
  const [siteName, setSiteName] = useState("my-site");

  const steps = [
    "Resolving content model",
    "Rendering 12 pages",
    "Optimising images (WebP)",
    "Fingerprinting assets",
    "Uploading to S3 (v" + (Math.floor(Math.random() * 40) + 10) + ")",
    "Invalidating CDN cache",
    "Health check passed",
  ];

  async function buildAndPublish() {
    if (buildStatus === "building") return;
    setBuildStatus("building");
    setPublishUrl("");
    const fresh: BuildStep[] = steps.map((label) => ({ label, status: "pending" }));
    setBuildSteps(fresh);

    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 150));
      setBuildSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, status: "running" } : s));
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
      setBuildSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, status: "done" } : s));
    }

    setPublishUrl(`https://${siteName}.builder-demo.app`);
    setBuildStatus("done");
  }

  return (
    <div className="min-h-screen pt-24 pb-24 px-6 bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/projects/saas-website-builder"
          className="inline-flex items-center gap-2 text-[#888888] hover:text-[#ededed] text-sm transition-colors mb-8 group"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:-translate-x-0.5">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to case study
        </Link>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3b82f6]/10 text-[#3b82f6] text-xs font-medium border border-[#3b82f6]/20 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
            Interactive Demo
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#ededed] mb-3">
            SaaS Website Builder
          </h1>
          <p className="text-[#888888] text-sm leading-relaxed max-w-xl">
            Pick a template, name your site, and hit <strong className="text-[#ededed]">Publish</strong> to
            simulate the full build pipeline — from content rendering to CDN deployment.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: editor panel */}
          <div className="space-y-5">
            {/* Template picker */}
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-5">
              <p className="text-xs text-[#888888] uppercase tracking-widest font-medium mb-3">Template</p>
              <div className="flex gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { if (buildStatus !== "building") { setTemplate(t); setBuildStatus("idle"); setPublishUrl(""); } }}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border ${
                      template.id === t.id
                        ? "border-[#3b82f6]/50 bg-[#3b82f6]/10 text-[#3b82f6]"
                        : "border-[rgba(255,255,255,0.08)] text-[#888888] hover:text-[#ededed]"
                    } ${buildStatus === "building" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Site name */}
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-5">
              <label className="text-xs text-[#888888] uppercase tracking-widest font-medium block mb-3">
                Site Name
              </label>
              <div className="flex items-center gap-0">
                <span className="px-3 py-2 text-sm text-[#888888] bg-[#0a0a0a] border border-r-0 border-[rgba(255,255,255,0.08)] rounded-l-lg font-mono">
                  https://
                </span>
                <input
                  value={siteName}
                  onChange={(e) => { if (buildStatus !== "building") setSiteName(e.target.value.replace(/[^a-z0-9-]/g, "")); }}
                  className="flex-1 px-3 py-2 text-sm text-[#ededed] bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] font-mono outline-none focus:border-[#3b82f6]/50"
                />
                <span className="px-3 py-2 text-sm text-[#888888] bg-[#0a0a0a] border border-l-0 border-[rgba(255,255,255,0.08)] rounded-r-lg font-mono">
                  .builder-demo.app
                </span>
              </div>
            </div>

            {/* Publish button */}
            <button
              onClick={buildAndPublish}
              disabled={buildStatus === "building" || !siteName}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#3b82f6] text-white text-sm font-semibold hover:bg-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {buildStatus === "building" ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Building…
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 11l3-3 2 2 4-5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Publish Site
                </>
              )}
            </button>

            {/* Build log */}
            {buildSteps.length > 0 && (
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-5">
                <p className="text-xs text-[#888888] uppercase tracking-widest font-medium mb-3">Build Log</p>
                <div className="space-y-2">
                  {buildSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                        {step.status === "running" && (
                          <svg className="animate-spin w-3.5 h-3.5 text-[#3b82f6]" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        )}
                        {step.status === "done" && (
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8l3 3 7-7" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {step.status === "pending" && (
                          <div className="w-3 h-3 rounded-full border border-[rgba(255,255,255,0.12)]" />
                        )}
                      </div>
                      <span className={`text-xs font-mono ${
                        step.status === "done" ? "text-[#888888]" :
                        step.status === "running" ? "text-[#ededed]" : "text-[#444444]"
                      }`}>{step.label}</span>
                    </div>
                  ))}
                </div>
                {publishUrl && (
                  <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-2 text-xs">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" fill="#22c55e" fillOpacity="0.15" stroke="#22c55e" strokeWidth="1.5" />
                        <path d="M5 8l2 2 4-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="text-[#22c55e] font-medium">Live at</span>
                      <span className="text-[#93c5fd] font-mono">{publishUrl}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: site preview */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex-1 mx-2 px-3 py-1 rounded bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] text-xs text-[#888888] font-mono truncate">
                {publishUrl || `${siteName}.builder-demo.app`}
              </div>
            </div>
            {/* Simulated site */}
            <div className="bg-[#0d0d0d] min-h-[400px]">
              {/* Nav */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.05)]">
                <div className="text-sm font-semibold text-[#ededed]">{siteName || "my-site"}</div>
                <div className="flex gap-4">
                  {template.nav.map((item) => (
                    <span key={item} className="text-xs text-[#888888]">{item}</span>
                  ))}
                </div>
              </div>
              {/* Hero */}
              <div className="px-6 py-10 text-center">
                <div className="inline-block w-12 h-12 rounded-full mb-4" style={{ backgroundColor: template.accent + "22", border: `2px solid ${template.accent}44` }} />
                <h2 className="text-xl font-semibold text-[#ededed] mb-2">{template.hero}</h2>
                <p className="text-sm text-[#888888]">{template.sub}</p>
                <div className="mt-5">
                  <span className="inline-block px-4 py-2 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: template.accent }}>
                    Get Started
                  </span>
                </div>
              </div>
              {/* Sections */}
              <div className="px-6 pb-8 space-y-4">
                {template.sections.map((section) => (
                  <div key={section} className="rounded-lg border border-[rgba(255,255,255,0.06)] p-4">
                    <div className="text-xs font-medium text-[#ededed] mb-2">{section}</div>
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-2 rounded-full bg-[rgba(255,255,255,0.05)]" style={{ width: `${60 + i * 15}%` }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
