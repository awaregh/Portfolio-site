import Link from "next/link";
import type { Metadata } from "next";
import { researchPapers } from "@/lib/researchData";

export const metadata: Metadata = {
  title: "Writing — Ahmed Waregh",
  description:
    "Technical papers and deep-dives on systems I've built and problems I've solved in production.",
};

export default function ResearchPage() {
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
            Writing
          </h1>
          <p className="text-[#57789a] text-base leading-relaxed max-w-2xl">
            Technical papers and deep-dives on systems I&apos;ve built and
            problems I&apos;ve solved in production — distributed systems, AI
            infrastructure, and platform engineering.
          </p>
        </div>

        {/* Paper list */}
        <div className="grid grid-cols-1 gap-4">
          {researchPapers.map((paper) => (
            <div
              key={paper.title}
              className="rounded-2xl border border-[rgba(61,155,212,0.16)] bg-white p-6 sm:p-7 hover:border-[rgba(61,155,212,0.22)] transition-colors duration-200"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <h2 className="text-[#1a2f45] font-medium text-base leading-snug">
                  {paper.title}
                </h2>
                <span className="text-xs font-mono text-[#57789a] flex-shrink-0 mt-1">
                  {paper.year}
                </span>
              </div>

              {paper.venue && (
                <p className="text-xs font-mono text-[#3d9bd4] mb-3">
                  {paper.venue}
                </p>
              )}

              <p className="text-[#57789a] text-sm leading-relaxed mb-4">
                {paper.abstract}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {paper.topics.map((topic) => (
                  <span
                    key={topic}
                    className="px-2 py-0.5 text-xs rounded font-mono bg-[rgba(61,155,212,0.08)] text-[#57789a] border border-[rgba(61,155,212,0.14)]"
                  >
                    {topic}
                  </span>
                ))}
              </div>

              {(paper.url || paper.pdfUrl) && (
                <div className="flex gap-4 pt-3 border-t border-[rgba(61,155,212,0.10)]">
                  {paper.pdfUrl && (
                    <a
                      href={paper.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-underline text-xs text-[#57789a] hover:text-[#1a2f45] transition-colors"
                    >
                      Read PDF
                    </a>
                  )}
                  {paper.url && (
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-underline text-xs text-[#57789a] hover:text-[#1a2f45] transition-colors"
                    >
                      Read Online
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

