"use client";

import Link from "next/link";
import { motion } from "framer-motion";

function CloudShape({
  className,
  size = 120,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size * 0.6}
      viewBox="0 0 120 72"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M24 56c-11 0-20-8.5-20-19s9-19 20-19c1 0 2 .1 3 .3C29 10.7 37.5 4 48 4c12 0 21.8 9 22.9 20.6C74 23.6 77 23 80 23c11 0 20 8.5 20 19s-9 19-20 19H24z"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  );
}

export default function Hero() {
  return (
    <section className="relative pt-28 pb-20 px-6 overflow-hidden">
      {/* Sky gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(160deg, #e8f4fd 0%, #f0f7ff 45%, #fce8f2 100%)",
          opacity: 0.55,
        }}
      />

      {/* Decorative cloud shapes */}
      <CloudShape
        size={180}
        className="absolute top-8 right-[5%] text-[#cce8f9] animate-cloud-float opacity-60 hidden md:block"
      />
      <CloudShape
        size={110}
        className="absolute top-24 left-[2%] text-[#fce8f2] animate-cloud-float-slow opacity-50 hidden lg:block"
      />
      <CloudShape
        size={80}
        className="absolute bottom-12 right-[18%] text-[#cce8f9] animate-cloud-float opacity-40 hidden lg:block"
      />

      <div className="relative max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 lg:gap-16 items-start">
          {/* Left: text column */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-sm font-mono text-[#57789a] mb-6 tracking-wide">
              Hi, I&apos;m Aware
            </p>

            <h1 className="text-[38px] sm:text-5xl font-semibold tracking-tight text-[#1a2f45] leading-[1.1] mb-6">
              I design and ship<br />
              <span className="text-[#3d9bd4]">backends</span> for<br />
              complex systems.
            </h1>

            <p className="text-base text-[#57789a] max-w-lg mb-3 leading-relaxed">
              Software Engineer — Backend · Platform · AI Systems.
            </p>
            <p className="text-base text-[#57789a] max-w-lg mb-10 leading-relaxed">
              I prototype in code; I care about latency budgets, reliability, and clean system design.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#3d9bd4] text-white hover:bg-[#2880b5] transition-colors rounded-xl shadow-sm"
              >
                View recent work
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M3 7H11M7 3L11 7L7 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <a
                href="mailto:ahmedwaregh@gmail.com"
                className="link-underline inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#57789a] hover:text-[#1a2f45] transition-colors border border-[rgba(61,155,212,0.22)] rounded-xl bg-white/60"
              >
                Email
              </a>
            </div>
          </motion.div>

          {/* Right: code artifact (dark navy panel for contrast) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="lg:mt-16 hidden lg:block"
          >
            <div className="rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(61,155,212,0.18)] border border-[rgba(61,155,212,0.14)]">
              {/* Terminal chrome */}
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[rgba(255,255,255,0.08)] bg-[#1a2f45]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#e8a3be] opacity-80" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#cce8f9] opacity-80" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#7ec8e3] opacity-80" />
                <span className="ml-3 text-xs font-mono text-[#7aadcc]">reconcile.ts</span>
              </div>
              <pre className="p-5 text-xs font-mono leading-relaxed overflow-x-auto bg-[#1f3a52]">
                <code>
                  <span className="text-[#5a8aaa]">{"// reconciliation view — event-sourced cache\n"}</span>
                  <span className="text-[#7ec8e3]">{"async function"}</span>
                  <span className="text-[#cde8f5]">{" reconcile("}</span>
                  <span className="text-[#a8d4e8]">{"accountId: string"}</span>
                  <span className="text-[#cde8f5]">{")"}</span>
                  <span className="text-[#cde8f5]">{" {\n"}</span>
                  <span className="text-[#a8d4e8]">{"  const events = "}</span>
                  <span className="text-[#7ec8e3]">{"await"}</span>
                  <span className="text-[#a8d4e8]">{" eventLog.since(\n"}</span>
                  <span className="text-[#a8d4e8]">{"    lastCheckpoint(accountId)\n"}</span>
                  <span className="text-[#a8d4e8]">{"  );\n"}</span>
                  <span className="text-[#7ec8e3]">{"  return"}</span>
                  <span className="text-[#a8d4e8]">{" events.reduce(applyEvent, currentState);\n"}</span>
                  <span className="text-[#cde8f5]">{"}\n\n"}</span>
                  <span className="text-[#e8a3be]">{"// result: p95 render -180ms, tickets -42%"}</span>
                </code>
              </pre>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
