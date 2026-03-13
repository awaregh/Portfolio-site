"use client";

import { motion } from "framer-motion";
import Link from "next/link";

function CloudShape({
  className,
  delay = 0,
  duration = 8,
}: {
  className?: string;
  delay?: number;
  duration?: number;
}) {
  return (
    <motion.div
      className={`absolute pointer-events-none select-none ${className}`}
      animate={{ y: [0, -14, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg viewBox="0 0 120 60" fill="white" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="60" cy="42" rx="48" ry="18" opacity="0.9" />
        <ellipse cx="42" cy="32" rx="26" ry="20" opacity="0.9" />
        <ellipse cx="74" cy="28" rx="28" ry="22" opacity="0.9" />
        <ellipse cx="55" cy="22" rx="18" ry="14" opacity="0.9" />
      </svg>
    </motion.div>
  );
}

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center px-6 pt-20 pb-12 overflow-hidden">
      {/* Floating cloud decorations */}
      <CloudShape
        className="w-48 opacity-60 -top-4 right-[8%]"
        delay={0}
        duration={9}
      />
      <CloudShape
        className="w-32 opacity-40 top-24 right-[28%]"
        delay={2}
        duration={11}
      />
      <CloudShape
        className="w-56 opacity-50 top-12 left-[5%]"
        delay={1}
        duration={10}
      />
      <CloudShape
        className="w-24 opacity-30 bottom-24 left-[20%]"
        delay={3}
        duration={8}
      />
      <CloudShape
        className="w-36 opacity-35 bottom-16 right-[12%]"
        delay={1.5}
        duration={12}
      />

      <div className="max-w-5xl mx-auto w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Availability badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 border border-[rgba(147,197,253,0.4)] text-xs text-[#5b9bd5] mb-8 shadow-soft backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5b9bd5] motion-safe:animate-pulse" />
            Available for senior & staff roles
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-[#1a2e4a] leading-[1.1] mb-4">
            Software Engineer
          </h1>
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.1] mb-8">
            <span className="text-[#6b7ea3]">Backend</span>
            <span className="text-[rgba(91,155,213,0.4)]"> · </span>
            <span className="text-[#6b7ea3]">Platform</span>
            <span className="text-[rgba(91,155,213,0.4)]"> · </span>
            <span className="text-[#5b9bd5]">AI Systems</span>
          </h2>

          <p className="text-base sm:text-lg text-[#6b7ea3] max-w-2xl mb-10 leading-relaxed">
            I build multi-tenant SaaS platforms, workflow engines, and
            production AI systems. Focused on reliability, scalability, and
            developer-friendly architecture.
          </p>

          <div className="flex flex-wrap gap-4">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5b9bd5] text-white text-sm font-medium hover:bg-[#4a8cc4] transition-all shadow-soft hover:shadow-soft-lg"
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
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="#contact"
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-white/70 text-[#1a2e4a] text-sm font-medium hover:bg-white/90 transition-all border border-[rgba(147,197,253,0.4)] backdrop-blur-sm shadow-soft hover:shadow-soft-lg"
              >
                Get in Touch
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
