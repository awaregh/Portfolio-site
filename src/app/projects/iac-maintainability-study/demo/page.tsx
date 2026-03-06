"use client";

import Link from "next/link";
import IaCMaintainabilityEmbed from "@/components/demos/IaCMaintainabilityEmbed";

export default function IaCMaintainabilityDemoPage() {
  return (
    <div className="min-h-screen pt-24 pb-24 px-6 bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/projects/iac-maintainability-study"
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
            IaC Maintainability Study
          </h1>
          <p className="text-[#888888] text-sm leading-relaxed max-w-xl">
            Run Terraform drift detection across modules to see which resources have drifted from
            their desired state.
          </p>
        </div>

        <IaCMaintainabilityEmbed />
      </div>
    </div>
  );
}
