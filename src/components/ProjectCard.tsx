import Link from "next/link";

interface ProjectCardProps {
  title: string;
  description: string;
  tags: string[];
  slug: string;
  architecture: string[];
}

export default function ProjectCard({
  title,
  description,
  tags,
  slug,
  architecture,
}: ProjectCardProps) {
  return (
    <Link href={`/projects/${slug}`} className="group block">
      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-6 sm:p-7 hover:border-[rgba(255,255,255,0.14)] hover:bg-[#141414] transition-all duration-200">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-[#ededed] font-semibold text-lg tracking-tight group-hover:text-white transition-colors">
            {title}
          </h3>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-[#888888] group-hover:text-[#3b82f6] transition-colors flex-shrink-0 mt-1"
          >
            <path
              d="M4 12L12 4M12 4H6M12 4V10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-[#888888] text-sm leading-relaxed mb-5">
          {description}
        </p>

        {/* Architecture signals */}
        <div className="flex flex-wrap gap-2 mb-4">
          {architecture.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 text-xs rounded-md bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 font-medium"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Tech stack */}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 text-xs rounded-md bg-[#ffffff06] text-[#888888] border border-[rgba(255,255,255,0.06)] font-mono"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
