"use client";

import { motion } from "framer-motion";

const stack = [
  {
    category: "Languages & Runtimes",
    items: ["TypeScript", "Node.js", "Python", "Go"],
  },
  {
    category: "Frontend",
    items: ["React", "Next.js", "SSR", "Design Systems"],
  },
  {
    category: "Databases",
    items: ["PostgreSQL", "Redis", "Pinecone", "Weaviate"],
  },
  {
    category: "Infrastructure",
    items: ["Docker", "Kubernetes", "AWS", "GCP"],
  },
  {
    category: "AI / ML",
    items: ["OpenAI API", "LangChain", "RAG", "Embedding Pipelines"],
  },
  {
    category: "Queues & Observability",
    items: [
      "BullMQ",
      "RabbitMQ",
      "Kafka",
      "Prometheus",
      "Grafana",
      "OpenTelemetry",
    ],
  },
];

export default function TechStackSection() {
  return (
    <section className="py-16 px-6 border-t border-[rgba(61,155,212,0.14)]">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[160px_1fr] gap-12">
        <div>
          <h2 className="text-sm font-mono text-[#57789a] uppercase tracking-widest">
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
              <p className="text-xs font-mono text-[#57789a] uppercase tracking-widest mb-2">
                {group.category}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="px-2 py-0.5 text-xs rounded-full font-mono bg-[#e4f2fc] text-[#3d9bd4] border border-[rgba(61,155,212,0.18)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
