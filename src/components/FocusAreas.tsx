"use client";

import { motion } from "framer-motion";

const areas = [
  {
    icon: "⚡",
    title: "Event-Driven Architecture",
    description:
      "Designing systems around async events, queues, and reliable message delivery.",
  },
  {
    icon: "🔗",
    title: "Distributed Systems",
    description:
      "Building for failure: retries, idempotency, circuit breakers, eventual consistency.",
  },
  {
    icon: "🏗️",
    title: "Multi-Tenant SaaS",
    description:
      "Schema-per-tenant, billing metering, usage tracking, isolated workspaces.",
  },
  {
    icon: "🤖",
    title: "AI Infrastructure",
    description:
      "Ingestion pipelines, vector search, RAG architectures, model orchestration.",
  },
  {
    icon: "🛠️",
    title: "Platform Engineering",
    description:
      "Developer tooling, build systems, CI/CD abstractions, internal platforms.",
  },
  {
    icon: "📊",
    title: "Production Reliability",
    description:
      "Observability, alerting, incident response, SLOs.",
  },
];

export default function FocusAreas() {
  return (
    <section className="py-24 px-6 border-t border-[rgba(147,197,253,0.2)]">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold tracking-tight text-[#1a2e4a] mb-2">
          What I Focus On
        </h2>
        <p className="text-[#6b7ea3] text-sm mb-12">
          Core competencies in backend and infrastructure engineering.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map((area, index) => (
            <motion.div
              key={area.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(147,197,253,0.22)" }}
              viewport={{ once: true }}
              transition={{
                duration: 0.4,
                delay: index * 0.06,
                ease: "easeOut",
              }}
              className="rounded-2xl border border-[rgba(147,197,253,0.25)] bg-white/70 backdrop-blur-sm p-5 shadow-soft"
            >
              <div className="text-2xl mb-3">{area.icon}</div>
              <h3 className="text-[#1a2e4a] font-semibold text-sm mb-2">
                {area.title}
              </h3>
              <p className="text-[#6b7ea3] text-sm leading-relaxed">
                {area.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
