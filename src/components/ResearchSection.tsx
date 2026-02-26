"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { researchPapers } from "@/lib/researchData";

export default function ResearchSection() {
  return (
    <section
      id="research"
      className="py-24 px-6 border-t border-[rgba(255,255,255,0.06)]"
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between mb-2">
          <h2 className="text-2xl font-semibold tracking-tight text-[#ededed]">
            Research &amp; Writing
          </h2>
        </div>
        <p className="text-[#888888] mb-12 text-sm">
          Technical papers and deep-dives on systems I&apos;ve built and
          problems I&apos;ve solved in production.
        </p>

        <div className="grid grid-cols-1 gap-4">
          {researchPapers.map((paper, index) => (
            <motion.div
              key={paper.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.4,
                delay: index * 0.07,
                ease: "easeOut",
              }}
              className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-6 hover:border-[rgba(255,255,255,0.14)] hover:bg-[#141414] transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="text-[#ededed] font-semibold text-base leading-snug">
                  {paper.title}
                </h3>
                <span className="text-xs text-[#888888] flex-shrink-0 mt-0.5 font-mono">
                  {paper.year}
                </span>
              </div>

              {paper.venue && (
                <p className="text-xs text-[#3b82f6] mb-3 font-medium">
                  {paper.venue}
                </p>
              )}

              <p className="text-[#888888] text-sm leading-relaxed mb-4">
                {paper.abstract}
              </p>

              <div className="flex flex-wrap gap-2">
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
                <div className="flex gap-4 mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
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
            </motion.div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/research"
            className="inline-flex items-center gap-2 text-[#888888] hover:text-[#ededed] text-sm transition-colors group"
          >
            View all papers
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className="transition-transform group-hover:translate-x-0.5"
            >
              <path
                d="M3 7H11M7 3L11 7L7 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
