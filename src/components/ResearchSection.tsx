"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { researchPapers } from "@/lib/researchData";

export default function ResearchSection() {
  return (
    <section
      id="research"
      className="py-24 px-6 border-t border-[rgba(61,155,212,0.14)]"
    >
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[160px_1fr] gap-12">
        <div>
          <h2 className="text-sm font-mono text-[#57789a] uppercase tracking-widest">
            Writing
          </h2>
        </div>
        <div>
          <p className="text-[#57789a] mb-10 text-sm">
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
                className="rounded-2xl border border-[rgba(61,155,212,0.16)] bg-white p-5 hover:border-[rgba(61,155,212,0.22)] transition-colors duration-200"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="text-[#1a2f45] font-medium text-sm leading-snug">
                    {paper.title}
                  </h3>
                  <span className="text-xs font-mono text-[#57789a] flex-shrink-0 mt-0.5">
                    {paper.year}
                  </span>
                </div>

                {paper.venue && (
                  <p className="text-xs font-mono text-[#3d9bd4] mb-2">
                    {paper.venue}
                  </p>
                )}

                <p className="text-[#57789a] text-sm leading-relaxed mb-3">
                  {paper.abstract}
                </p>

                <div className="flex flex-wrap gap-1.5">
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
                  <div className="flex gap-4 mt-3 pt-3 border-t border-[rgba(61,155,212,0.10)]">
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
              </motion.div>
            ))}
          </div>

          <div className="mt-8">
            <Link
              href="/research"
              className="link-underline inline-flex items-center gap-2 text-[#57789a] hover:text-[#1a2f45] text-sm transition-colors"
            >
              View all papers
              <svg
                width="13"
                height="13"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
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
      </div>
    </section>
  );
}

