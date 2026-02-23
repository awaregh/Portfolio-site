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
          className="inline-flex items-center gap-2 text-[#888888] hover:text-[#ededed] text-sm transition-colors mb-10 group"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="transition-transform group-hover:-translate-x-0.5"
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
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#ededed] mb-4 leading-tight">
            Selected Projects
          </h1>
          <p className="text-[#888888] text-base leading-relaxed max-w-2xl">
            Production systems I&apos;ve designed and built end-to-end —
            backend platforms, AI infrastructure, and distributed systems.
          </p>
        </div>

        {/* Project list */}
        <div className="grid grid-cols-1 gap-5">
          {projects.map((project) => (
            <ProjectCard key={project.slug} {...project} />
          ))}
        </div>
      </div>
    </div>
  );
}
