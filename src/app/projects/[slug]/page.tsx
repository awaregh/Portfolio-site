import { notFound } from "next/navigation";
import Link from "next/link";
import * as runtime from "react/jsx-runtime";
import { evaluate } from "@mdx-js/mdx";
import { getProjectBySlug, getAllProjectSlugs, ProjectFrontmatter, projects } from "@/lib/projects";
import ProjectDemoEmbed from "@/components/ProjectDemoEmbed";

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
          Back to work
        </Link>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1a2f45] mb-4 leading-tight">
            {fm.title}
          </h1>
          <p className="text-[#57789a] text-base mb-6 leading-relaxed">
            {fm.description}
          </p>

          {/* Source code & quick start */}
          {(currentProject?.githubUrl || currentProject?.demoUrl) && (
            <div className="flex flex-wrap gap-3 mb-6">
              {currentProject?.demoUrl && (
                <Link
                  href={currentProject.demoUrl}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3d9bd4] text-white text-sm font-medium hover:bg-[#2880b5] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M2 8h12M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Live Demo
                </Link>
              )}
              {currentProject?.githubUrl && (
                <a
                  href={currentProject.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded border border-[rgba(61,155,212,0.22)] text-[#57789a] text-sm font-medium hover:text-[#1a2f45] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                  View Source
                </a>
              )}
            </div>
          )}

          {/* Architecture tags */}
          {fm.architecture && fm.architecture.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {fm.architecture.map((tag: string) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded font-mono bg-[rgba(61,155,212,0.08)] text-[#57789a] border border-[rgba(61,155,212,0.14)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Tech tags */}
          {fm.tags && fm.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {fm.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded font-mono bg-[rgba(61,155,212,0.08)] text-[#57789a] border border-[rgba(61,155,212,0.14)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <hr className="border-[rgba(61,155,212,0.14)] mb-10" />

        {/* MDX Content */}
        <div className="prose">
          <MDXContent />
        </div>

        {/* Demo embed */}
        <ProjectDemoEmbed slug={slug} />

        {/* Quick Start */}
        {currentProject?.quickStart && (
          <div className="mt-12 rounded border border-[rgba(61,155,212,0.14)] bg-[#ffffff] p-6">
            <h3 className="text-[#1a2f45] font-semibold text-sm mb-3">
              Quick Start
            </h3>
            <p className="text-[#57789a] text-sm mb-4">
              Clone and run locally with Docker:
            </p>
            <div className="bg-[#f8fbff] rounded-xl p-4 border border-[rgba(61,155,212,0.14)] overflow-x-auto">
              <code className="text-xs text-[#5aaedc] font-mono whitespace-pre-wrap break-all">
                {currentProject.quickStart}
              </code>
            </div>
            <a
              href={currentProject.githubUrl ? `${currentProject.githubUrl}#readme` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline inline-flex items-center gap-1.5 text-sm text-[#57789a] hover:text-[#1a2f45] transition-colors mt-4"
            >
              Full setup in README
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 12L12 4M12 4H6M12 4V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        )}

        {/* Prev / Next navigation */}
        {(prevProject || nextProject) && (
          <>
            <hr className="border-[rgba(61,155,212,0.14)] mt-16 mb-8" />
            <div className="flex items-stretch justify-between gap-4">
              {prevProject ? (
                <Link
                  href={`/projects/${prevProject.slug}`}
                  className="group flex-1 rounded-xl border border-[rgba(61,155,212,0.16)] bg-white p-5 hover:border-[rgba(61,155,212,0.28)] transition-colors duration-200"
                >
                  <span className="text-xs font-mono text-[#57789a] mb-1 block">
                    ← Previous
                  </span>
                  <span className="text-sm text-[#1a2f45] font-medium">
                    {prevProject.title}
                  </span>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
              {nextProject ? (
                <Link
                  href={`/projects/${nextProject.slug}`}
                  className="group flex-1 rounded-xl border border-[rgba(61,155,212,0.16)] bg-white p-5 hover:border-[rgba(61,155,212,0.28)] transition-colors duration-200 text-right"
                >
                  <span className="text-xs font-mono text-[#57789a] mb-1 block">
                    Next →
                  </span>
                  <span className="text-sm text-[#1a2f45] font-medium">
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

