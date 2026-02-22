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
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="border-r-0 sm:border-r border-[rgba(255,255,255,0.06)] pr-0 sm:pr-6">
            <p className="text-xs text-[#888888] uppercase tracking-widest mb-2 font-medium">
              Experience
            </p>
            <p className="text-[#ededed] text-sm font-medium leading-relaxed">
              5+ years building production backend systems
            </p>
          </div>
          <div className="border-r-0 sm:border-r border-[rgba(255,255,255,0.06)] pr-0 sm:pr-6">
            <p className="text-xs text-[#888888] uppercase tracking-widest mb-2 font-medium">
              Specializes in
            </p>
            <p className="text-[#ededed] text-sm leading-relaxed">
              Event-driven architecture · Distributed systems · Multi-tenant
              SaaS · AI infrastructure
            </p>
          </div>
          <div>
            <p className="text-xs text-[#888888] uppercase tracking-widest mb-2 font-medium">
              Open to
            </p>
            <p className="text-[#ededed] text-sm leading-relaxed">
              Senior Backend · Staff Engineer · Platform Engineer · AI Systems
              roles
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
