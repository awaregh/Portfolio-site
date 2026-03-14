import Link from "next/link";
import type { Metadata } from "next";
import ProjectCard from "@/components/ProjectCard";
import { projects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Projects — Ahmed Waregh",
  description:
    "Production systems I've designed and built end-to-end — backend platforms, AI infrastructure, and distributed systems.",
};

export default function ProjectsPage() {
  return (
    <div className="min-h-screen pt-24 pb-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Back link */}
        <Link
          href="/"
          className="link-underline inline-flex items-center gap-2 text-[#57789a] hover:text-[#1a2f45] text-sm transition-colors mb-10"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back home
        </Link>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1a2f45] mb-4 leading-tight">
            Projects
          </h1>
          <p className="text-[#57789a] text-base leading-relaxed max-w-2xl">
            Production systems I&apos;ve designed and built end-to-end —
            backend platforms, AI infrastructure, and distributed systems.
          </p>
        </div>

        {/* Project list */}
        <div className="grid grid-cols-1 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.slug} {...project} />
          ))}
        </div>
      </div>
    </div>
  );
}

