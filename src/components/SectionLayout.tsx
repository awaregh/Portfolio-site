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
      className={`py-24 px-6 border-t border-[rgba(147,197,253,0.2)] ${className}`}
    >
      <div className="max-w-5xl mx-auto">{children}</div>
    </section>
  );
}
