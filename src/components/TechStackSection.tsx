"use client";

import { motion } from "framer-motion";

const stack = [
  {
    category: "Languages & Runtimes",
    prose: "Node.js + TypeScript (primary), Python for ML pipelines, Go for high-throughput services.",
  },
  {
    category: "Frontend",
    prose: "React + TypeScript (SSR, hydration budgets), Next.js, design systems governance.",
  },
  {
    category: "Databases",
    prose: "PostgreSQL as default, Redis for ephemeral state and rate-limiting, vector DBs (Pinecone, Weaviate) for similarity search.",
  },
  {
    category: "Infrastructure",
    prose: "Docker-first local dev, Kubernetes for orchestration, AWS / GCP for managed services.",
  },
  {
    category: "AI / ML",
    prose: "OpenAI API integration, LangChain for RAG orchestration, embedding pipelines, hallucination mitigation patterns.",
  },
  {
    category: "Queues & Observability",
    prose: "BullMQ + RabbitMQ for async work, Kafka for streaming. Prometheus + Grafana for metrics; OpenTelemetry traces.",
  },
];

export default function TechStackSection() {
  return (
    <section className="py-24 px-6 border-t border-[rgba(232,230,227,0.1)]">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[160px_1fr] gap-12">
        <div>
          <h2 className="text-sm font-mono text-[#b6b1a8] uppercase tracking-widest">
            Stack
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
          {stack.map((group, index) => (
            <motion.div
              key={group.category}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
            >
              <p className="text-xs font-mono text-[#b6b1a8] uppercase tracking-widest mb-2">
                {group.category}
              </p>
              <p className="text-sm text-[#b6b1a8] leading-relaxed">
                {group.prose}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

