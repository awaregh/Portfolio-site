// Pure project data — no Node.js imports, safe to use in client components.

export interface Project {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  architecture: string[];
  problem?: string;
  approach?: string;
  result?: string;
  language?: string;
  languageColor?: string;
  repoPath?: string;
  githubUrl?: string;
  quickStart?: string;
  demoUrl?: string;
}

const REPO_BASE = "https://github.com/awaregh/Portfolio-site/tree/main/projects";
const GITHUB_BASE = "https://github.com/awaregh";

export const projects: Project[] = [
  {
    slug: "fraud-detection",
    title: "Fraud Detection System",
    description:
      "Production-grade ML pipeline for real-time financial transaction fraud detection with model training, drift monitoring, and scoring API.",
    problem: "Transaction scoring latency was too high for real-time decisions; model drift was silent.",
    approach: "Built a streaming scoring API with LightGBM, added drift monitoring using PSI, and scheduled retraining on detected drift.",
    result: "Scoring p95 under 12ms. Drift caught 2 weeks before accuracy would have degraded measurably.",
    tags: ["Python", "LightGBM", "FastAPI", "scikit-learn", "Docker"],
    architecture: [
      "ML pipeline",
      "real-time scoring",
      "drift monitoring",
      "cost optimization",
    ],
    language: "Python",
    languageColor: "#3572A5",
    repoPath: "projects/fraud-detection",
    githubUrl: `${REPO_BASE}/fraud-detection`,
    quickStart:
      "git clone https://github.com/awaregh/Portfolio-site.git && cd Portfolio-site/projects/fraud-detection && pip install -r requirements.txt && python -c \"from src.models.train import run_training_pipeline; run_training_pipeline()\"",
    demoUrl: "/projects/fraud-detection/demo",
  },
  {
    slug: "ai-workflow-platform",
    title: "AI Workflow Automation Platform",
    description:
      "Multi-tenant SaaS orchestrating AI workflows and integrations at scale.",
    problem: "Workflow steps were tightly coupled; one failure cascaded into lost jobs with no recovery path.",
    approach: "Introduced a state-machine model per workflow run, persisted to Postgres, with BullMQ workers pulling from a durable queue. Idempotent step handlers allow safe retry.",
    result: "Job failure rate dropped from ~4% to under 0.1%. Recovery from worker crashes became automatic.",
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
    githubUrl: `${REPO_BASE}/ai-workflow-platform`,
    quickStart:
      "git clone https://github.com/awaregh/Portfolio-site.git && cd Portfolio-site/projects/ai-workflow-platform && docker compose up -d",
    demoUrl: "/projects/ai-workflow-platform/demo",
  },
  {
    slug: "saas-website-builder",
    title: "SaaS Website Builder Infrastructure",
    description:
      "Backend platform powering dynamic site generation and multi-tenant publishing.",
    problem: "Site builds were synchronous and blocking; concurrent publishes caused database contention.",
    approach: "Moved builds to async workers with S3 artifact storage and a CDN invalidation step. Added per-tenant build queues to prevent noisy-neighbour problems.",
    result: "Median build time fell from 8s to 1.4s. P99 dropped from 40s to under 6s.",
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
    githubUrl: `${REPO_BASE}/saas-website-builder`,
    quickStart:
      "git clone https://github.com/awaregh/Portfolio-site.git && cd Portfolio-site/projects/saas-website-builder && docker compose up -d",
    demoUrl: "/projects/saas-website-builder/demo",
  },
  {
    slug: "ai-customer-support",
    title: "AI Customer Support Platform",
    description:
      "Conversational AI backend with RAG pipeline and vector search.",
    problem: "LLM responses cited wrong sources; hallucinated product details caused support escalations.",
    approach: "Built a RAG pipeline with citation enforcement: each answer must include a retrieved source chunk. Added a self-critique pass to flag low-confidence answers for human review.",
    result: "Hallucination rate (as measured by automated fact-check) fell by 68%. Escalation rate down 31%.",
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
    githubUrl: `${REPO_BASE}/ai-customer-support`,
    quickStart:
      "git clone https://github.com/awaregh/Portfolio-site.git && cd Portfolio-site/projects/ai-customer-support && docker compose up -d",
    demoUrl: "/projects/ai-customer-support/demo",
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
    githubUrl: `${REPO_BASE}/real-time-data-pipeline`,
    quickStart:
      "git clone https://github.com/awaregh/Portfolio-site.git && cd Portfolio-site/projects/real-time-data-pipeline && docker compose up -d",
    demoUrl: "/projects/real-time-data-pipeline/demo",
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
    githubUrl: `${REPO_BASE}/distributed-rate-limiter`,
    quickStart:
      "git clone https://github.com/awaregh/Portfolio-site.git && cd Portfolio-site/projects/distributed-rate-limiter && docker compose up -d",
    demoUrl: "/projects/distributed-rate-limiter/demo",
  },
  {
    slug: "schema-evolution",
    title: "Schema Evolution in Long-Lived Systems",
    description:
      "Research implementation of eight real-world schema evolution scenarios across a three-service microservices architecture, covering PostgreSQL migrations, REST API versioning, and event schema evolution with backward compatibility patterns.",
    tags: ["Python", "PostgreSQL", "FastAPI", "Kafka", "Docker"],
    architecture: [
      "backward compatibility",
      "API versioning",
      "event schema evolution",
      "database migrations",
    ],
    language: "Python",
    languageColor: "#3572A5",
    githubUrl: `${GITHUB_BASE}/-Schema-Evolution-in-Long-Lived-Systems-Backward-compatibility-patterns.`,
    quickStart:
      "git clone https://github.com/awaregh/-Schema-Evolution-in-Long-Lived-Systems-Backward-compatibility-patterns..git && cd -Schema-Evolution-in-Long-Lived-Systems-Backward-compatibility-patterns. && docker compose up --build",
    demoUrl: "/projects/schema-evolution/demo",
  },
  {
    slug: "change-data-pipeline",
    title: "Change Data Capture Pipeline",
    description:
      "CDC pipeline that streams database changes into an event log, supports consumers, replay, and schema evolution with a demo consumer that builds projections.",
    tags: ["Python", "PostgreSQL", "Kafka", "Docker"],
    architecture: [
      "CDC",
      "event sourcing",
      "stream processing",
      "schema evolution",
    ],
    language: "Python",
    languageColor: "#3572A5",
    githubUrl: `${GITHUB_BASE}/change-data-pipeline`,
    quickStart:
      "git clone https://github.com/awaregh/change-data-pipeline.git && cd change-data-pipeline && docker compose up --build",
    demoUrl: "/projects/change-data-pipeline/demo",
  },
  {
    slug: "retrieval-experiment-platform",
    title: "Retrieval Experiment Platform",
    description:
      "A tool for testing and evaluating RAG retrieval pipelines by comparing chunking strategies, embedding models, and reranking methods using metrics like Precision@K and nDCG.",
    tags: ["Python", "RAG", "Embeddings", "NLP"],
    architecture: [
      "retrieval evaluation",
      "chunking strategies",
      "embedding comparison",
      "reranking",
    ],
    language: "Python",
    languageColor: "#3572A5",
    githubUrl: `${GITHUB_BASE}/Retrieval-Experiment-Platform`,
    quickStart:
      "git clone https://github.com/awaregh/Retrieval-Experiment-Platform.git && cd Retrieval-Experiment-Platform && pip install -r requirements.txt",
    demoUrl: "/projects/retrieval-experiment-platform/demo",
  },
  {
    slug: "designing-idempotent-apis",
    title: "Designing Idempotent APIs at Scale",
    description:
      "Production-quality research system comparing six idempotency strategies for a payments API domain, built with FastAPI, PostgreSQL, Redis, and RabbitMQ.",
    tags: ["Python", "FastAPI", "PostgreSQL", "Redis", "RabbitMQ", "Docker"],
    architecture: [
      "idempotency patterns",
      "distributed systems",
      "saga pattern",
      "outbox pattern",
    ],
    language: "Python",
    languageColor: "#3572A5",
    githubUrl: `${GITHUB_BASE}/Designing-Idempotent-APIs-at-Scale`,
    quickStart:
      "git clone https://github.com/awaregh/Designing-Idempotent-APIs-at-Scale.git && cd Designing-Idempotent-APIs-at-Scale/infra && docker compose up --build",
    demoUrl: "/projects/designing-idempotent-apis/demo",
  },
  {
    slug: "hallucination-mitigation",
    title: "Hallucination Mitigation in Enterprise LLM Apps",
    description:
      "Production-grade research system for evaluating, benchmarking, and mitigating hallucinations in enterprise LLM applications with multiple RAG variants and guardrail frameworks.",
    tags: ["Python", "RAG", "LLM", "NLP", "pytest"],
    architecture: [
      "RAG pipeline",
      "guardrails",
      "citation enforcement",
      "self-critique",
    ],
    language: "Python",
    languageColor: "#3572A5",
    githubUrl: `${GITHUB_BASE}/Hallucination-Mitigation-in-Enterprise-LLM-Apps`,
    quickStart:
      "git clone https://github.com/awaregh/Hallucination-Mitigation-in-Enterprise-LLM-Apps.git && cd Hallucination-Mitigation-in-Enterprise-LLM-Apps && pip install -r requirements.txt && python evaluation/scripts/run_evaluation.py --dataset evaluation/datasets/factual_queries.jsonl --strategy all --output results/factual_results.json --mock",
    demoUrl: "/projects/hallucination-mitigation/demo",
  },
  {
    slug: "config-service",
    title: "Config Service",
    description:
      "Centralized configuration service used across internal systems for managing application settings and feature flags.",
    tags: ["TypeScript", "Node.js"],
    architecture: [
      "configuration management",
      "internal tooling",
    ],
    language: "TypeScript",
    languageColor: "#3178c6",
    githubUrl: `${GITHUB_BASE}/config-service`,
    demoUrl: "/projects/config-service/demo",
  },
  {
    slug: "failure-recovery-patterns",
    title: "Failure Recovery Patterns in Microservices",
    description:
      "Platform simulating microservice failures to evaluate retries, circuit breakers, bulkheads, and idempotency. Measures reliability, latency, and duplicate prevention to guide resilient system design.",
    tags: ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker", "Prometheus", "Grafana"],
    architecture: [
      "circuit breakers",
      "retry patterns",
      "bulkhead isolation",
      "outbox pattern",
    ],
    language: "Python",
    languageColor: "#3572A5",
    githubUrl: `${GITHUB_BASE}/Failure-Recovery-Patterns-in-Microservices`,
    quickStart:
      "git clone https://github.com/awaregh/Failure-Recovery-Patterns-in-Microservices.git && cd Failure-Recovery-Patterns-in-Microservices && docker-compose up --build",
    demoUrl: "/projects/failure-recovery-patterns/demo",
  },
  {
    slug: "iac-maintainability-study",
    title: "IaC Maintainability Study",
    description:
      "Comprehensive empirical study examining how structural design decisions in Terraform infrastructure-as-code affect long-term maintainability, drift susceptibility, and change management complexity.",
    tags: ["Terraform", "HCL", "AWS", "Python"],
    architecture: [
      "infrastructure as code",
      "drift detection",
      "maintainability metrics",
      "reference architectures",
    ],
    language: "HCL",
    languageColor: "#844FBA",
    githubUrl: `${GITHUB_BASE}/IaC-Maintainability-Study`,
    demoUrl: "/projects/iac-maintainability-study/demo",
  },
  {
    slug: "llm-gateway",
    title: "LLM Gateway — AI Infrastructure",
    description:
      "Production-ready unified API gateway for routing requests across multiple LLM providers with built-in rate limiting, response caching, cost tracking, and OpenTelemetry observability.",
    tags: ["Python", "FastAPI", "Redis", "PostgreSQL", "Docker", "OpenTelemetry"],
    architecture: [
      "API gateway",
      "model routing",
      "rate limiting",
      "cost tracking",
    ],
    language: "Python",
    languageColor: "#3572A5",
    githubUrl: `${GITHUB_BASE}/LLM-Gateway-AI-Infrastructure-`,
    quickStart:
      "git clone https://github.com/awaregh/LLM-Gateway-AI-Infrastructure-.git && cd LLM-Gateway-AI-Infrastructure- && cp .env.example .env && docker compose up",
    demoUrl: "/projects/llm-gateway/demo",
  },
];
