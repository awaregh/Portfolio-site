"use client";

import Link from "next/link";

interface ProjectCardProps {
  title: string;
  description: string;
  tags: string[];
  slug: string;
  architecture: string[];
  repoPath?: string;
  githubUrl?: string;
  quickStart?: string;
}

export default function ProjectCard({
  title,
  description,
  tags,
  slug,
  architecture,
  githubUrl,
}: ProjectCardProps) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-6 sm:p-7 hover:border-[rgba(255,255,255,0.14)] hover:bg-[#141414] transition-all duration-200 group">
      <div className="flex items-start justify-between gap-4 mb-3">
        <Link
          href={`/projects/${slug}`}
          className="text-[#ededed] font-semibold text-lg tracking-tight group-hover:text-white transition-colors hover:underline decoration-[rgba(255,255,255,0.3)] underline-offset-4"
        >
          {title}
        </Link>
        <div className="flex items-center gap-3 flex-shrink-0 mt-1">
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#888888] hover:text-[#3b82f6] transition-colors"
              title="View source on GitHub"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </a>
          )}
          <Link
            href={`/projects/${slug}`}
            className="text-[#888888] group-hover:text-[#3b82f6] transition-colors"
            title="View project details"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M4 12L12 4M12 4H6M12 4V10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </div>
      <Link href={`/projects/${slug}`} className="block">
        <p className="text-[#888888] text-sm leading-relaxed mb-5">
          {description}
        </p>
      </Link>

      {/* Architecture signals */}
      <div className="flex flex-wrap gap-2 mb-4">
        {architecture.map((tag) => (
          <span
            key={tag}
            className="px-2.5 py-1 text-xs rounded-md bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 font-medium"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Tech stack */}
      <div className="flex flex-wrap gap-2 mb-5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-2.5 py-1 text-xs rounded-md bg-[#ffffff06] text-[#888888] border border-[rgba(255,255,255,0.06)] font-mono"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
        <Link
          href={`/projects/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-[#ededed] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Read Case Study
        </Link>
        {githubUrl && (
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-[#ededed] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            View Source
          </a>
        )}
      </div>
    </div>
  );
}
