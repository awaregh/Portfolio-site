"use client";

import { motion } from "framer-motion";

export default function RecruiterSummary() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      className="px-6 pb-16"
    >
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl border border-[rgba(61,155,212,0.16)] bg-[#e4f2fc] p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="border-r-0 sm:border-r border-[rgba(61,155,212,0.14)] pr-0 sm:pr-6">
            <p className="text-xs font-mono text-[#57789a] uppercase tracking-widest mb-2">
              Experience
            </p>
            <p className="text-[#1a2f45] text-sm leading-relaxed">
              10+ years building production web systems
            </p>
          </div>
          <div className="border-r-0 sm:border-r border-[rgba(61,155,212,0.14)] pr-0 sm:pr-6">
            <p className="text-xs font-mono text-[#57789a] uppercase tracking-widest mb-2">
              Specializes in
            </p>
            <p className="text-[#57789a] text-sm leading-relaxed">
              Frontend systems &bull; Design systems &bull; Distributed
              architecture &bull; AI product UX
            </p>
          </div>
          <div>
            <p className="text-xs font-mono text-[#57789a] uppercase tracking-widest mb-2">
              Open to
            </p>
            <p className="text-[#57789a] text-sm leading-relaxed">
              Senior Frontend &bull; Staff Engineer &bull; Platform Engineer roles
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

