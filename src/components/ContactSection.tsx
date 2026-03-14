"use client";

import { motion } from "framer-motion";

export default function ContactSection() {
  return (
    <section
      id="contact"
      className="py-24 px-6 border-t border-[rgba(61,155,212,0.14)]"
    >
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[160px_1fr] gap-12">
        <div>
          <h2 className="text-sm font-mono text-[#57789a] uppercase tracking-widest">
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
          <p className="text-[#1a2f45] text-2xl font-semibold tracking-tight mb-4">
            Let&apos;s talk.
          </p>
          <p className="text-[#57789a] text-base mb-8 leading-relaxed">
            Building something in backend infrastructure, platform engineering,
            or AI systems? I&apos;d like to hear about it.
          </p>
          <div className="space-y-3">
            <a
              href="mailto:ahmedwaregh@gmail.com"
              className="link-underline block text-[#1a2f45] text-base hover:text-[#3d9bd4] transition-colors"
            >
              ahmedwaregh@gmail.com
            </a>
            <p className="text-sm font-mono text-[#57789a]">
              I respond within a few days.
            </p>
          </div>
          <div className="flex items-center gap-5 mt-8">
            <a
              href="https://github.com/awaregh"
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline text-sm text-[#57789a] hover:text-[#1a2f45] transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://linkedin.com/in/ahmedrswaregh"
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline text-sm text-[#57789a] hover:text-[#1a2f45] transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

