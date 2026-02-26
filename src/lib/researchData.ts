// Research paper / article data for the portfolio site.

export interface ResearchPaper {
  title: string;
  abstract: string;
  topics: string[];
  year: number;
  url?: string;
  pdfUrl?: string;
  venue?: string;
}

export const researchPapers: ResearchPaper[] = [
  {
    title:
      "Hierarchical Chunking Strategies for Production RAG Systems: Balancing Retrieval Precision and Context Coherence",
    abstract:
      "Retrieval-Augmented Generation systems degrade in precision as knowledge bases grow. This paper examines chunking strategies — fixed-size, paragraph-level, and hierarchical parent–child — across corpora of varying size and domain density. We introduce a re-ranking layer using cross-encoder models and show it recovers precision lost at scale while remaining compatible with standard vector-search backends. Benchmarks are run against a golden dataset of 2,400 support queries across four enterprise tenants.",
    topics: ["RAG", "LLM", "Vector Search", "Information Retrieval"],
    year: 2024,
    venue: "Internal Technical Report",
  },
  {
    title:
      "Multi-Tenant Event Sourcing at Scale: Schema Isolation, Replay Semantics, and Operational Lessons",
    abstract:
      "Event sourcing in multi-tenant SaaS systems introduces tension between tenant isolation and operational simplicity. We describe our experience migrating a 30-tenant workflow platform from a shared event log to a namespace-isolated architecture, covering schema-per-tenant trade-offs, aggregate snapshot strategies to bound replay time, and the tooling required to safely replay tenant event streams without cross-tenant interference.",
    topics: [
      "Event Sourcing",
      "Multi-Tenant",
      "Distributed Systems",
      "CQRS",
    ],
    year: 2024,
    venue: "Internal Technical Report",
  },
  {
    title:
      "Exactly-Once Delivery in Heterogeneous Sink Pipelines: Lessons from a High-Throughput Kafka Consumer Fleet",
    abstract:
      "Exactly-once semantics in streaming pipelines are well-studied within a single system but become subtle when events must be durably committed to multiple heterogeneous sinks — analytics stores, billing aggregators, and alerting systems — in a single logical transaction. We detail the rebalance-listener pattern, idempotency key design, and per-sink commit protocols that enabled zero duplicate charges across 40M+ daily events on a Kafka-backed pipeline.",
    topics: [
      "Apache Kafka",
      "Stream Processing",
      "Exactly-Once Delivery",
      "Distributed Systems",
    ],
    year: 2025,
    venue: "Internal Technical Report",
  },
  {
    title:
      "Clock-Independent Rate Limiting: Eliminating Skew Drift in Distributed Token-Bucket Implementations",
    abstract:
      "Token-bucket rate limiters that compute refill amounts using client-side timestamps accumulate systematic drift when hosts have clock skew. This paper quantifies the drift under realistic NTP conditions and proposes using authoritative server-side timestamps — specifically Redis server time via Lua scripts — to eliminate client clock dependence entirely. We compare bucket accuracy across five implementations under 50ms and 200ms of injected skew.",
    topics: ["Rate Limiting", "Distributed Systems", "Redis", "Algorithms"],
    year: 2025,
    venue: "Internal Technical Report",
  },
];
