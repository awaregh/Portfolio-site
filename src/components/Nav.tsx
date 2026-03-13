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
          ? "bg-[rgba(15,17,21,0.92)] backdrop-blur-md border-b border-[rgba(232,230,227,0.1)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="text-[#e8e6e3] font-semibold text-sm tracking-tight link-underline hover:text-white transition-colors"
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
              className="link-underline text-[#b6b1a8] hover:text-[#e8e6e3] text-sm transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

