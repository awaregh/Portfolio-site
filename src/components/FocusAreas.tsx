"use client";

import { motion } from "framer-motion";

const areas = [
  {
    title: "Event-Driven Architecture",
    description:
      "Async events, queues, reliable delivery. Designing systems where out-of-order messages and partial failures are expected.",
  },
  {
    title: "Distributed Systems",
    description:
      "Retries, idempotency, circuit breakers, eventual consistency. Building for failure rather than hoping for success.",
  },
  {
    title: "Multi-Tenant SaaS",
    description:
      "Schema-per-tenant isolation, billing metering, usage tracking, scoped workspaces.",
  },
  {
    title: "AI Infrastructure",
    description:
      "Ingestion pipelines, vector search, RAG architectures, model orchestration. Latency and cost budgets matter.",
  },
  {
    title: "Platform Engineering",
    description:
      "Developer tooling, build systems, CI/CD abstractions, internal platforms that reduce toil.",
  },
  {
    title: "Production Reliability",
    description:
      "Observability, SLOs, alerting, incident response. Systems fail — the question is how they fail.",
  },
];

export default function FocusAreas() {
  return (
    <section className="py-24 px-6 border-t border-[rgba(232,230,227,0.1)]">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[160px_1fr] gap-12">
        <div>
          <h2 className="text-sm font-mono text-[#b6b1a8] uppercase tracking-widest">
            Focus
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
          {areas.map((area, index) => (
            <motion.div
              key={area.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.4,
                delay: index * 0.06,
                ease: "easeOut",
              }}
            >
              <h3 className="text-[#e8e6e3] font-medium text-sm mb-2">
                {area.title}
              </h3>
              <p className="text-[#b6b1a8] text-sm leading-relaxed">
                {area.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

