import Link from "next/link";
import type { Metadata } from "next";
import { researchPapers } from "@/lib/researchData";

export const metadata: Metadata = {
  title: "Research & Writing — Ahmed Waregh",
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
            Research &amp; Writing
          </h1>
          <p className="text-[#888888] text-base leading-relaxed max-w-2xl">
            Technical papers and deep-dives on systems I&apos;ve built and
            problems I&apos;ve solved in production — covering distributed
            systems, AI infrastructure, and backend platform engineering.
          </p>
        </div>

        {/* Paper list */}
        <div className="grid grid-cols-1 gap-5">
          {researchPapers.map((paper) => (
            <div
              key={paper.title}
              className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-6 sm:p-7 hover:border-[rgba(255,255,255,0.14)] hover:bg-[#141414] transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <h2 className="text-[#ededed] font-semibold text-lg leading-snug">
                  {paper.title}
                </h2>
                <span className="text-xs text-[#888888] flex-shrink-0 mt-1 font-mono">
                  {paper.year}
                </span>
              </div>

              {paper.venue && (
                <p className="text-xs text-[#3b82f6] mb-4 font-medium">
                  {paper.venue}
                </p>
              )}

              <p className="text-[#888888] text-sm leading-relaxed mb-5">
                {paper.abstract}
              </p>

              <div className="flex flex-wrap gap-2 mb-5">
                {paper.topics.map((topic) => (
                  <span
                    key={topic}
                    className="px-2.5 py-1 text-xs rounded-md bg-[#ffffff06] text-[#888888] border border-[rgba(255,255,255,0.06)] font-mono"
                  >
                    {topic}
                  </span>
                ))}
              </div>

              {(paper.url || paper.pdfUrl) && (
                <div className="flex gap-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                  {paper.pdfUrl && (
                    <a
                      href={paper.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-[#ededed] transition-colors"
                    >
                      <svg
                        width="14"
                        height="14"
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
                      Read PDF
                    </a>
                  )}
                  {paper.url && (
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-[#ededed] transition-colors"
                    >
                      <svg
                        width="14"
                        height="14"
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
