// Pure project data — no Node.js imports, safe to use in client components.

export interface Project {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  architecture: string[];
  language?: string;
  languageColor?: string;
  repoPath?: string;
  githubUrl?: string;
  quickStart?: string;
}

export const projects: Project[] = [
  {
    slug: "ai-workflow-platform",
    title: "AI Workflow Automation Platform",
    description:
      "Multi-tenant SaaS orchestrating AI workflows and integrations at scale.",
    tags: ["Node.js", "PostgreSQL", "Prisma", "BullMQ", "OpenAI"],
    architecture: [
      "event-driven",
      "distributed workers",
      "multi-tenant",
      "state machine",
    ],
    language: "TypeScript",
    languageColor: "#3178c6",
    repoPath: "projects/ai-workflow-platform",
    githubUrl: "https://github.com/awaregh/ai-workflow-platform",
    quickStart:
      "git clone https://github.com/awaregh/ai-workflow-platform.git && cd ai-workflow-platform && docker compose up -d",
  },
  {
    slug: "saas-website-builder",
    title: "SaaS Website Builder Infrastructure",
    description:
      "Backend platform powering dynamic site generation and multi-tenant publishing.",
    tags: ["Node.js", "PostgreSQL", "S3", "CDN", "Docker"],
    architecture: [
      "versioned rendering",
      "build workers",
      "storage pipeline",
      "multi-tenant",
    ],
    language: "TypeScript",
    languageColor: "#3178c6",
    repoPath: "projects/saas-website-builder",
    githubUrl: "https://github.com/awaregh/saas-website-builder",
    quickStart:
      "git clone https://github.com/awaregh/saas-website-builder.git && cd saas-website-builder && docker compose up -d",
  },
  {
    slug: "ai-customer-support",
    title: "AI Customer Support Platform",
    description:
      "Conversational AI backend with RAG pipeline and vector search.",
    tags: ["Python", "PostgreSQL", "Pinecone", "OpenAI", "FastAPI"],
    architecture: [
      "RAG pipeline",
      "vector search",
      "ingestion pipeline",
      "conversation orchestration",
    ],
    language: "Python",
    languageColor: "#3572A5",
    repoPath: "projects/ai-customer-support",
    githubUrl: "https://github.com/awaregh/ai-customer-support",
    quickStart:
      "git clone https://github.com/awaregh/ai-customer-support.git && cd ai-customer-support && docker compose up -d",
  },
  {
    slug: "real-time-data-pipeline",
    title: "Real-Time Data Processing Pipeline",
    description:
      "High-throughput streaming pipeline for ingesting, transforming, and routing millions of events per second.",
    tags: ["Go", "Kafka", "ClickHouse", "Kubernetes", "gRPC"],
    architecture: [
      "stream processing",
      "exactly-once delivery",
      "schema registry",
      "backpressure control",
    ],
    language: "Go",
    languageColor: "#00ADD8",
    repoPath: "projects/real-time-data-pipeline",
    githubUrl: "https://github.com/awaregh/real-time-data-pipeline",
    quickStart:
      "git clone https://github.com/awaregh/real-time-data-pipeline.git && cd real-time-data-pipeline && docker compose up -d",
  },
  {
    slug: "distributed-rate-limiter",
    title: "Distributed Rate Limiter Service",
    description:
      "Token-bucket and sliding-window rate limiting as a standalone service, supporting multi-region consistency.",
    tags: ["Go", "Redis", "gRPC", "Prometheus", "Docker"],
    architecture: [
      "token bucket",
      "sliding window",
      "multi-region sync",
      "sidecar-ready",
    ],
    language: "Go",
    languageColor: "#00ADD8",
    repoPath: "projects/distributed-rate-limiter",
    githubUrl: "https://github.com/awaregh/distributed-rate-limiter",
    quickStart:
      "git clone https://github.com/awaregh/distributed-rate-limiter.git && cd distributed-rate-limiter && docker compose up -d",
  },
];
