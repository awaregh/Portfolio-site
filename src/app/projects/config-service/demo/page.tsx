"use client";

import Link from "next/link";
import ConfigServiceEmbed from "@/components/demos/ConfigServiceEmbed";

export default function ConfigServiceDemoPage() {
  return (
    <div className="min-h-screen pt-24 pb-24 px-6 bg-[#f0f7ff]">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/projects/config-service"
          className="inline-flex items-center gap-2 text-[#57789a] hover:text-[#1a2f45] text-sm transition-colors mb-8 group"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:-translate-x-0.5">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to case study
        </Link>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3d9bd4]/10 text-[#3d9bd4] text-xs font-medium border border-[#3d9bd4]/20 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3d9bd4] animate-pulse" />
            Interactive Demo
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1a2f45] mb-3">
            Config Service
          </h1>
          <p className="text-[#57789a] text-sm leading-relaxed max-w-xl">
            Edit feature flags and config values, publish changes to all environments, and inspect
            the audit trail.
          </p>
        </div>

        <ConfigServiceEmbed />
      </div>
    </div>
  );
}
