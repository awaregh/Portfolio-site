"use client";

import { motion } from "framer-motion";

const stack = [
  {
    category: "Backend",
    items: ["Node.js", "TypeScript", "Python", "Go (learning)"],
  },
  {
    category: "Databases",
    items: ["PostgreSQL", "Redis", "MongoDB", "Vector DBs"],
  },
  {
    category: "Infrastructure",
    items: ["Docker", "Kubernetes", "AWS", "GCP"],
  },
  {
    category: "AI / ML",
    items: ["OpenAI API", "LangChain", "Pinecone", "Weaviate"],
  },
  {
    category: "Queues & Streaming",
    items: ["BullMQ", "RabbitMQ", "Kafka"],
  },
  {
    category: "Frameworks",
    items: ["Next.js", "Express", "FastAPI", "Prisma"],
  },
];

export default function TechStackSection() {
  return (
    <section className="py-24 px-6 border-t border-[rgba(255,255,255,0.06)]">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold tracking-tight text-[#ededed] mb-2">
          Tech Stack
        </h2>
        <p className="text-[#888888] text-sm mb-12">
          Tools and technologies I work with regularly.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stack.map((group, index) => (
            <motion.div
              key={group.category}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
            >
              <p className="text-xs text-[#888888] uppercase tracking-widest mb-3 font-medium">
                {group.category}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="px-2.5 py-1 text-xs rounded-md bg-[#ffffff06] text-[#a1a1aa] border border-[rgba(255,255,255,0.06)] font-mono"
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
