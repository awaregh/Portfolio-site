import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { projects } from "./projectsData";
export type { Project } from "./projectsData";
export { projects } from "./projectsData";

export interface ProjectFrontmatter {
  title: string;
  description: string;
  tags?: string[];
  architecture?: string[];
}

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
