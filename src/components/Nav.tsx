"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-md border-b border-[rgba(147,197,253,0.25)] shadow-[0_1px_12px_rgba(147,197,253,0.15)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="text-[#1a2e4a] font-semibold text-sm tracking-tight hover:text-[#5b9bd5] transition-colors"
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
              className="text-[#6b7ea3] hover:text-[#1a2e4a] text-sm transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </motion.header>
  );
}
