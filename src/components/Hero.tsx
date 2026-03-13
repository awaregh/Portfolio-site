"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative pt-28 pb-20 px-6 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 lg:gap-16 items-start">
          {/* Left: text column */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-sm font-mono text-[#b6b1a8] mb-6 tracking-wide">
              Hi, I&apos;m Aware
            </p>

            <h1 className="text-[38px] sm:text-5xl font-semibold tracking-tight text-[#e8e6e3] leading-[1.1] mb-6">
              I design and ship<br />
              <span className="text-[#c4572f]">frontends</span> for<br />
              complex systems.
            </h1>

            <p className="text-base text-[#b6b1a8] max-w-lg mb-3 leading-relaxed">
              10+ years leading web UX for data-heavy products.
            </p>
            <p className="text-base text-[#b6b1a8] max-w-lg mb-10 leading-relaxed">
              I prototype in code; I care about latency budgets and readability.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#c4572f] text-[#e8e6e3] hover:bg-[#a8461f] transition-colors rounded"
              >
                View recent work
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M3 7H11M7 3L11 7L7 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <a
                href="mailto:ahmedwaregh@gmail.com"
                className="link-underline inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#b6b1a8] hover:text-[#e8e6e3] transition-colors border border-[rgba(232,230,227,0.18)] rounded"
              >
                Email
              </a>
            </div>
          </motion.div>

          {/* Right: code artifact — vertically offset */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="lg:mt-16 hidden lg:block"
          >
            <div className="rounded border border-[rgba(232,230,227,0.1)] bg-[#161920] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.4)]">
              {/* Terminal chrome */}
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[rgba(232,230,227,0.08)] bg-[#1a1d22]">
                <span className="w-2.5 h-2.5 rounded-full bg-[rgba(232,230,227,0.12)]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[rgba(232,230,227,0.12)]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[rgba(232,230,227,0.12)]" />
                <span className="ml-3 text-xs font-mono text-[#b6b1a8]">reconcile.ts</span>
              </div>
              <pre className="p-5 text-xs font-mono leading-relaxed overflow-x-auto">
                <code>
                  <span className="text-[rgba(182,177,168,0.5)]">{"// reconciliation view — event-sourced cache\n"}</span>
                  <span className="text-[#c4572f]">{"async function"}</span>
                  <span className="text-[#e8e6e3]">{" reconcile("}</span>
                  <span className="text-[#b6b1a8]">{"accountId: string"}</span>
                  <span className="text-[#e8e6e3]">{")"}</span>
                  <span className="text-[#e8e6e3]">{" {\n"}</span>
                  <span className="text-[#b6b1a8]">{"  const events = "}</span>
                  <span className="text-[#c4572f]">{"await"}</span>
                  <span className="text-[#b6b1a8]">{" eventLog.since(\n"}</span>
                  <span className="text-[#b6b1a8]">{"    lastCheckpoint(accountId)\n"}</span>
                  <span className="text-[#b6b1a8]">{"  );\n"}</span>
                  <span className="text-[#c4572f]">{"  return"}</span>
                  <span className="text-[#b6b1a8]">{" events.reduce(applyEvent, currentState);\n"}</span>
                  <span className="text-[#e8e6e3]">{"}\n\n"}</span>
                  <span className="text-[rgba(182,177,168,0.5)]">{"// result: p95 render -180ms, support tickets -42%"}</span>
                </code>
              </pre>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}


