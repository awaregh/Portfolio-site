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
