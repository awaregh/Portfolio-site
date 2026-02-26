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
      <section id="projects" className="py-24 px-6 max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold tracking-tight text-[#ededed] mb-2">
          Selected Projects
        </h2>
        <p className="text-[#888888] mb-12 text-sm">
          Production systems I&apos;ve designed and built end-to-end.
        </p>
        <div className="grid grid-cols-1 gap-5">
          {projects.map((project) => (
            <ProjectCard key={project.slug} {...project} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-[#888888] hover:text-[#ededed] text-sm transition-colors group"
          >
            View all projects
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
      </section>
      <FocusAreas />
      <ResearchSection />
      <AboutSection />
      <TechStackSection />
      <ContactSection />
    </>
  );
}
