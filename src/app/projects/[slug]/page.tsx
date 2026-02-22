import { notFound } from "next/navigation";
import Link from "next/link";
import { getProjectBySlug, getAllProjectSlugs, ProjectFrontmatter } from "@/lib/projects";
import { MDXRemote } from "next-mdx-remote/rsc";

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = getAllProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const project = getProjectBySlug(params.slug);
  if (!project) return {};
  const fm = project.frontmatter as ProjectFrontmatter;
  return {
    title: `${fm.title} — Ahmed Waregh`,
    description: fm.description,
  };
}

export default async function ProjectPage({ params }: Props) {
  const project = getProjectBySlug(params.slug);
  if (!project) notFound();

  const { frontmatter, content } = project;
  const fm = frontmatter as ProjectFrontmatter;

  return (
    <div className="min-h-screen pt-24 pb-24 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          href="/#projects"
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
          <MDXRemote source={content} />
        </div>
      </div>
    </div>
  );
}
