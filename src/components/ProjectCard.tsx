"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface ProjectCardProps {
  title: string;
  description: string;
  tags: string[];
  slug: string;
  architecture: string[];
  problem?: string;
  approach?: string;
  result?: string;
  repoPath?: string;
  githubUrl?: string;
  quickStart?: string;
  demoUrl?: string;
}

export default function ProjectCard({
  title,
  description,
  tags,
  slug,
  architecture,
  problem,
  approach,
  result,
  githubUrl,
  demoUrl,
}: ProjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-[rgba(61,155,212,0.16)] bg-white p-6 sm:p-7 hover:border-[rgba(61,155,212,0.28)] hover:shadow-[0_4px_20px_rgba(61,155,212,0.12)] transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <Link
          href={`/projects/${slug}`}
          className="link-underline text-[#1a2f45] font-semibold text-base tracking-tight"
        >
          {title}
        </Link>
        <div className="flex items-center gap-3 flex-shrink-0 mt-0.5">
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#57789a] hover:text-[#3d9bd4] transition-colors"
              title="View source on GitHub"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </a>
          )}
          <Link
            href={`/projects/${slug}`}
            className="text-[#57789a] hover:text-[#3d9bd4] transition-colors"
            title="View project details"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 12L12 4M12 4H6M12 4V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Case-study framing */}
      {problem ? (
        <div className="space-y-2 mb-5">
          <div className="grid grid-cols-[68px_1fr] gap-x-3 text-sm">
            <span className="text-xs font-mono text-[#57789a] pt-0.5 uppercase tracking-wider">Problem</span>
            <span className="text-[#57789a] leading-relaxed">{problem}</span>
          </div>
          {approach && (
            <div className="grid grid-cols-[68px_1fr] gap-x-3 text-sm">
              <span className="text-xs font-mono text-[#57789a] pt-0.5 uppercase tracking-wider">Approach</span>
              <span className="text-[#57789a] leading-relaxed">{approach}</span>
            </div>
          )}
          {result && (
            <div className="grid grid-cols-[68px_1fr] gap-x-3 text-sm">
              <span className="text-xs font-mono text-[#e8a3be] pt-0.5 uppercase tracking-wider">Result</span>
              <span className="text-[#1a2f45] leading-relaxed font-medium">{result}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[#57789a] text-sm leading-relaxed mb-5">
          {description}
        </p>
      )}

      {/* Architecture signals */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
        {architecture.map((tag) => (
          <span key={tag} className="text-xs font-mono text-[#57789a]">
            {tag}
          </span>
        ))}
      </div>

      {/* Tech tags */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 text-xs rounded-full font-mono bg-[#e4f2fc] text-[#3d9bd4] border border-[rgba(61,155,212,0.18)]"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-3 border-t border-[rgba(61,155,212,0.10)]">
        <Link
          href={`/projects/${slug}`}
          className="link-underline text-xs text-[#57789a] hover:text-[#1a2f45] transition-colors"
        >
          Case study
        </Link>
        {demoUrl && (
          <Link
            href={demoUrl}
            className="link-underline text-xs text-[#3d9bd4] hover:text-[#2880b5] transition-colors"
          >
            Live demo
          </Link>
        )}
        {githubUrl && (
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline text-xs text-[#57789a] hover:text-[#1a2f45] transition-colors"
          >
            Source
          </a>
        )}
      </div>
    </motion.div>
  );
}
