"use client";

import { motion } from "framer-motion";

export default function AboutSection() {
  return (
    <section
      id="about"
      className="py-24 px-6 border-t border-[rgba(61,155,212,0.14)]"
    >
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[160px_1fr] gap-12">
        <div>
          <h2 className="text-sm font-mono text-[#57789a] uppercase tracking-widest">
            About
          </h2>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-5 max-w-2xl"
        >
          <p className="text-[#1a2f45] text-base leading-relaxed">
            Former IC / lead at B2B platforms. I work end-to-end: interaction
            models, design systems, perf profiling.
          </p>
          <p className="text-[#57789a] text-base leading-relaxed">
            My work spans event-driven architectures, multi-tenant SaaS products,
            and AI-powered systems. I care about systems that scale cleanly, fail
            gracefully, and are a pleasure for teams to operate.
          </p>
          <p className="text-[#57789a] text-base leading-relaxed">
            I&apos;ve worked across the full lifecycle of production systems —
            initial design through to observability and incident response.
          </p>
          <p className="text-sm font-mono text-[#57789a] border-l-2 border-[#3d9bd4] pl-4 leading-relaxed">
            React + TypeScript (SSR, hydration budgets) &bull; Systems design for
            client data flows &bull; Design systems governance.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

