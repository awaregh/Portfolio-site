"use client";

import { motion } from "framer-motion";

export default function AboutSection() {
  return (
    <section
      id="about"
      className="py-24 px-6 border-t border-[rgba(255,255,255,0.06)]"
    >
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-12">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#ededed]">
            About
          </h2>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-5"
        >
          <p className="text-[#a1a1aa] leading-relaxed">
            I&apos;m a software engineer focused on building reliable backend
            systems and platforms.
          </p>
          <p className="text-[#a1a1aa] leading-relaxed">
            My work spans event-driven architectures, multi-tenant SaaS
            products, and AI-powered backend services. I care about systems that
            scale cleanly, fail gracefully, and are a pleasure for teams to
            operate.
          </p>
          <p className="text-[#a1a1aa] leading-relaxed">
            I&apos;ve worked across the full lifecycle of production systems —
            from initial design through to observability and incident response.
          </p>
          <p className="text-[#888888] leading-relaxed text-sm border-l-2 border-[#3b82f6] pl-4">
            Currently focused on backend infrastructure, platform engineering,
            and AI systems.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
