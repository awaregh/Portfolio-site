import { ReactNode } from "react";

interface SectionLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function SectionLayout({
  children,
  className = "",
}: SectionLayoutProps) {
  return (
    <section
      className={`py-24 px-6 border-t border-[rgba(255,255,255,0.06)] ${className}`}
    >
      <div className="max-w-5xl mx-auto">{children}</div>
    </section>
  );
}
