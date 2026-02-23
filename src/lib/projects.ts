import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface ProjectFrontmatter {
  title: string;
  description: string;
  tags?: string[];
  architecture?: string[];
}

export interface Project {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  architecture: string[];
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
    repoPath: "projects/ai-workflow-platform",
    githubUrl: "https://github.com/awaregh/Portfolio-site/tree/main/projects/ai-workflow-platform",
    quickStart: "git clone https://github.com/awaregh/Portfolio-site.git && cd Portfolio-site/projects/ai-workflow-platform && docker compose up -d",
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
    repoPath: "projects/saas-website-builder",
    githubUrl: "https://github.com/awaregh/Portfolio-site/tree/main/projects/saas-website-builder",
    quickStart: "git clone https://github.com/awaregh/Portfolio-site.git && cd Portfolio-site/projects/saas-website-builder && docker compose up -d",
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
    repoPath: "projects/ai-customer-support",
    githubUrl: "https://github.com/awaregh/Portfolio-site/tree/main/projects/ai-customer-support",
    quickStart: "git clone https://github.com/awaregh/Portfolio-site.git && cd Portfolio-site/projects/ai-customer-support && docker compose up -d",
  },
];

const contentDir = path.join(process.cwd(), "content", "projects");

export function getAllProjectSlugs(): string[] {
  try {
    const files = fs.readdirSync(contentDir);
    return files
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => f.replace(/\.mdx$/, ""));
  } catch {
    return projects.map((p) => p.slug);
  }
}

export function getProjectBySlug(slug: string): {
  frontmatter: ProjectFrontmatter;
  content: string;
} | null {
  try {
    const filePath = path.join(contentDir, `${slug}.mdx`);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    return { frontmatter: data as ProjectFrontmatter, content };
  } catch {
    return null;
  }
}
