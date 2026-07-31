import Hero from "@/components/Hero";
import RecruiterSummary from "@/components/RecruiterSummary";
import ProjectCard from "@/components/ProjectCard";
import FocusAreas from "@/components/FocusAreas";
import AboutSection from "@/components/AboutSection";
import TechStackSection from "@/components/TechStackSection";
import ContactSection from "@/components/ContactSection";
import ResearchSection from "@/components/ResearchSection";
import Link from "next/link";
import { projects } from "@/lib/projects";

export default function Home() {
  const selectedProjects = projects.slice(0, 3);

  return (
    <>
      <Hero />
      <RecruiterSummary />

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
              {selectedProjects.map((project) => (
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

      <FocusAreas limit={3} />
      <ResearchSection limit={2} />
      <AboutSection />
      <TechStackSection />
      <ContactSection />
    </>
  );
}
