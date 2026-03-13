"use client";

import { motion } from "framer-motion";

export default function ContactSection() {
  return (
    <section
      id="contact"
      className="py-24 px-6 border-t border-[rgba(232,230,227,0.1)]"
    >
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[160px_1fr] gap-12">
        <div>
          <h2 className="text-sm font-mono text-[#b6b1a8] uppercase tracking-widest">
            Contact
          </h2>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-xl"
        >
          <p className="text-[#e8e6e3] text-2xl font-semibold tracking-tight mb-4">
            Let&apos;s talk.
          </p>
          <p className="text-[#b6b1a8] text-base mb-8 leading-relaxed">
            Building something in backend infrastructure, platform engineering,
            or AI systems? I&apos;d like to hear about it.
          </p>
          <div className="space-y-3">
            <a
              href="mailto:ahmedwaregh@gmail.com"
              className="link-underline block text-[#e8e6e3] text-base hover:text-white transition-colors"
            >
              ahmedwaregh@gmail.com
            </a>
            <p className="text-sm font-mono text-[#b6b1a8]">
              I respond within a few days.
            </p>
          </div>
          <div className="flex items-center gap-5 mt-8">
            <a
              href="https://github.com/awaregh"
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline text-sm text-[#b6b1a8] hover:text-[#e8e6e3] transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://linkedin.com/in/ahmedrswaregh"
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline text-sm text-[#b6b1a8] hover:text-[#e8e6e3] transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

