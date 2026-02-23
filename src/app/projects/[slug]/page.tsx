import { notFound } from "next/navigation";
import Link from "next/link";
import * as runtime from "react/jsx-runtime";
import { evaluate } from "@mdx-js/mdx";
import { getProjectBySlug, getAllProjectSlugs, ProjectFrontmatter, projects } from "@/lib/projects";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};
  const fm = project.frontmatter as ProjectFrontmatter;
  return {
    title: `${fm.title} — Ahmed Waregh`,
    description: fm.description,
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const { frontmatter, content } = project;
  const fm = frontmatter as ProjectFrontmatter;

  const currentIndex = projects.findIndex((p) => p.slug === slug);
  const currentProject = currentIndex >= 0 ? projects[currentIndex] : null;
  const prevProject = currentIndex > 0 ? projects[currentIndex - 1] : null;
  const nextProject =
    currentIndex < projects.length - 1 ? projects[currentIndex + 1] : null;

  const { default: MDXContent } = await evaluate(content, {
    ...runtime,
    baseUrl: import.meta.url,
  });

  return (
    <div className="min-h-screen pt-24 pb-24 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          href="/projects"
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
          Back to work
        </Link>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#ededed] mb-4 leading-tight">
            {fm.title}
          </h1>
          <p className="text-[#888888] text-base mb-6 leading-relaxed">
            {fm.description}
          </p>

          {/* Source code & quick start */}
          {currentProject?.githubUrl && (
            <div className="flex flex-wrap gap-3 mb-6">
              <a
                href={currentProject.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ffffff08] text-[#ededed] text-sm font-medium hover:bg-[#ffffff12] transition-colors border border-[rgba(255,255,255,0.08)]"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                View Source on GitHub
              </a>
              <a
                href={`${currentProject.githubUrl}#readme`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3b82f6] text-white text-sm font-medium hover:bg-[#2563eb] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Clone & Run Locally
              </a>
            </div>
          )}

          {/* Architecture tags */}
          {fm.architecture && fm.architecture.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {fm.architecture.map((tag: string) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 text-xs rounded-md bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Tech tags */}
          {fm.tags && fm.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {fm.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 text-xs rounded-md bg-[#ffffff08] text-[#888888] border border-[rgba(255,255,255,0.08)] font-mono"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <hr className="border-[rgba(255,255,255,0.08)] mb-10" />

        {/* MDX Content */}
        <div className="prose">
          <MDXContent />
        </div>

        {/* Quick Start */}
        {currentProject?.quickStart && (
          <div className="mt-12 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-6">
            <h3 className="text-[#ededed] font-semibold text-base mb-3 flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M6 2l4 6H6l4 6" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Quick Start
            </h3>
            <p className="text-[#888888] text-sm mb-4">
              Clone the repo and run locally with Docker:
            </p>
            <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[rgba(255,255,255,0.06)] overflow-x-auto">
              <code className="text-sm text-[#93c5fd] font-mono whitespace-pre-wrap break-all">
                {currentProject.quickStart}
              </code>
            </div>
            <a
              href={currentProject.githubUrl ? `${currentProject.githubUrl}#readme` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[#3b82f6] hover:text-[#60a5fa] transition-colors mt-4"
            >
              Full setup instructions in README
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 12L12 4M12 4H6M12 4V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        )}

        {/* Prev / Next navigation */}
        {(prevProject || nextProject) && (
          <>
            <hr className="border-[rgba(255,255,255,0.08)] mt-16 mb-8" />
            <div className="flex items-stretch justify-between gap-4">
              {prevProject ? (
                <Link
                  href={`/projects/${prevProject.slug}`}
                  className="group flex-1 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-5 hover:border-[rgba(255,255,255,0.14)] hover:bg-[#141414] transition-all duration-200"
                >
                  <span className="text-xs text-[#888888] mb-1 block">
                    ← Previous
                  </span>
                  <span className="text-sm text-[#ededed] font-medium group-hover:text-white transition-colors">
                    {prevProject.title}
                  </span>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
              {nextProject ? (
                <Link
                  href={`/projects/${nextProject.slug}`}
                  className="group flex-1 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-5 hover:border-[rgba(255,255,255,0.14)] hover:bg-[#141414] transition-all duration-200 text-right"
                >
                  <span className="text-xs text-[#888888] mb-1 block">
                    Next →
                  </span>
                  <span className="text-sm text-[#ededed] font-medium group-hover:text-white transition-colors">
                    {nextProject.title}
                  </span>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
