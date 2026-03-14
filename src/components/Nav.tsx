"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[rgba(248,251,255,0.90)] backdrop-blur-md border-b border-[rgba(61,155,212,0.14)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="text-[#1a2f45] font-semibold text-sm tracking-tight link-underline hover:text-[#3d9bd4] transition-colors"
        >
          Ahmed Waregh
        </Link>
        <nav className="flex items-center gap-6">
          {[
            { label: "Work", href: "/projects" },
            { label: "Research", href: "/research" },
            { label: "About", href: "#about" },
            { label: "Contact", href: "#contact" },
          ].map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="link-underline text-[#57789a] hover:text-[#1a2f45] text-sm transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
