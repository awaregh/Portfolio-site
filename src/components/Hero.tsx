"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="min-h-[90vh] flex items-center px-6 pt-20 pb-12">
      <div className="max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Availability badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ffffff06] border border-[rgba(255,255,255,0.08)] text-xs text-[#888888] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
            Available for senior &amp; staff roles
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-[#ededed] leading-[1.1] mb-4">
            Software Engineer
          </h1>
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.1] mb-8">
            <span className="text-[#888888]">Backend</span>
            <span className="text-[rgba(255,255,255,0.2)]"> · </span>
            <span className="text-[#888888]">Platform</span>
            <span className="text-[rgba(255,255,255,0.2)]"> · </span>
            <span className="text-[#3b82f6]">AI Systems</span>
          </h2>

          <p className="text-base sm:text-lg text-[#888888] max-w-2xl mb-10 leading-relaxed">
            I build multi-tenant SaaS platforms, workflow engines, and
            production AI systems. Focused on reliability, scalability, and
            developer-friendly architecture.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="#projects"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#3b82f6] text-white text-sm font-medium hover:bg-[#2563eb] transition-colors"
            >
              View Work
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M3 7H11M7 3L11 7L7 11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link
              href="#contact"
              className="inline-flex items-center px-5 py-2.5 rounded-lg bg-[#ffffff08] text-[#ededed] text-sm font-medium hover:bg-[#ffffff12] transition-colors border border-[rgba(255,255,255,0.08)]"
            >
              Get in Touch
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
