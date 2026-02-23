"use client";

import { motion } from "framer-motion";
import { projects } from "@/lib/projectsData";

const GITHUB_USER = "awaregh";

export default function PinnedRepos() {
  return (
    <section className="pb-6 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-[#ededed]">Pinned</span>
          <a
            href={`https://github.com/${GITHUB_USER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#888888] hover:text-[#3b82f6] transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            github.com/{GITHUB_USER}
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.filter((repo) => repo.githubUrl).map((repo, index) => (
            <motion.a
              key={repo.slug}
              href={repo.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.3 + index * 0.07, ease: "easeOut" }}
              className="flex flex-col rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4 hover:border-[rgba(255,255,255,0.14)] hover:bg-[#141414] transition-all duration-200"
            >
              <div className="flex items-center gap-2 mb-2">
                {/* Repo book icon */}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="#888888"
                  className="flex-shrink-0"
                >
                  <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
                </svg>
                <span className="text-sm font-semibold text-[#3b82f6] truncate">
                  {repo.slug}
                </span>
              </div>

              <p className="text-xs text-[#888888] leading-relaxed mb-4 flex-1 line-clamp-2">
                {repo.description}
              </p>

              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: repo.languageColor }}
                />
                <span className="text-xs text-[#888888]">{repo.language}</span>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
