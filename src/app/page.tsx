import Hero from "@/components/Hero";
import RecruiterSummary from "@/components/RecruiterSummary";
import PinnedRepos from "@/components/PinnedRepos";
import ProjectCard from "@/components/ProjectCard";
import FocusAreas from "@/components/FocusAreas";
import AboutSection from "@/components/AboutSection";
import TechStackSection from "@/components/TechStackSection";
import ContactSection from "@/components/ContactSection";
import ResearchSection from "@/components/ResearchSection";
import Link from "next/link";
import { projects } from "@/lib/projects";

export default function Home() {
  return (
    <>
      <Hero />
      <RecruiterSummary />
      <PinnedRepos />

      {/* How I work strip */}
      <section className="py-16 px-6 border-t border-[rgba(61,155,212,0.14)]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[160px_1fr] gap-12">
          <div>
            <h2 className="text-sm font-mono text-[#57789a] uppercase tracking-widest">
              How I work
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <p className="text-[#1a2f45] text-sm font-medium mb-2">Prototype in code, not mockups</p>
              <p className="text-[#57789a] text-sm leading-relaxed">
                I reach for a coded prototype before a finished design. It surfaces real constraints earlier.
              </p>
            </div>
            <div>
              <p className="text-[#1a2f45] text-sm font-medium mb-2">Latency is a feature</p>
              <p className="text-[#57789a] text-sm leading-relaxed">
                I track render budgets and hydration cost. Perf profiling is part of the design review, not a post-launch task.
              </p>
            </div>
            <div>
              <p className="text-[#1a2f45] text-sm font-medium mb-2">Write for the next engineer</p>
              <p className="text-[#57789a] text-sm leading-relaxed">
                Readable code, documented trade-offs, decision logs. Systems outlive their authors.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Selected Projects */}
      <section id="projects" className="py-16 px-6 border-t border-[rgba(61,155,212,0.14)]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[160px_1fr] gap-12">
          <div>
            <h2 className="text-sm font-mono text-[#57789a] uppercase tracking-widest">
              Projects
            </h2>
          </div>
          <div>
            <div className="grid grid-cols-1 gap-4">
              {projects.map((project) => (
                <ProjectCard key={project.slug} {...project} />
              ))}
            </div>
            <div className="mt-8">
              <Link
                href="/projects"
                className="link-underline inline-flex items-center gap-2 text-[#57789a] hover:text-[#1a2f45] text-sm transition-colors"
              >
                View all projects
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

      <FocusAreas />
      <ResearchSection />
      <AboutSection />
      <TechStackSection />
      <ContactSection />
    </>
  );
}

