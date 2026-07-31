"use client";

import { motion } from "framer-motion";
import Link from "next/link";

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

export default function FocusAreas({ limit }: { limit?: number }) {
  const visibleAreas = typeof limit === "number" ? areas.slice(0, limit) : areas;

  return (
    <section className="py-16 px-6 border-t border-[rgba(61,155,212,0.14)]">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[160px_1fr] gap-12">
        <div>
          <h2 className="text-sm font-mono text-[#57789a] uppercase tracking-widest">
            Focus
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
          {visibleAreas.map((area, index) => (
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
              <h3 className="text-[#1a2f45] font-medium text-sm mb-2">
                {area.title}
              </h3>
              <p className="text-[#57789a] text-sm leading-relaxed">
                {area.description}
              </p>
            </motion.div>
          ))}
          {typeof limit === "number" && areas.length > limit && (
            <div className="sm:col-span-2">
              <Link
                href="/projects"
                className="link-underline inline-flex items-center gap-2 text-[#57789a] hover:text-[#1a2f45] text-sm transition-colors"
              >
                View full project archive
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 7H11M7 3L11 7L7 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
