import Hero from "@/components/Hero";
import RecruiterSummary from "@/components/RecruiterSummary";
import ProjectCard from "@/components/ProjectCard";
import FocusAreas from "@/components/FocusAreas";
import AboutSection from "@/components/AboutSection";
import TechStackSection from "@/components/TechStackSection";
import ContactSection from "@/components/ContactSection";
import { projects } from "@/lib/projects";

export default function Home() {
  return (
    <>
      <Hero />
      <RecruiterSummary />
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
      </section>
      <FocusAreas />
      <AboutSection />
      <TechStackSection />
      <ContactSection />
    </>
  );
}
