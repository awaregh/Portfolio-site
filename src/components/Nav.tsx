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
          ? "bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[rgba(255,255,255,0.06)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="text-[#ededed] font-semibold text-sm tracking-tight hover:text-white transition-colors"
        >
          Ahmed Waregh
        </Link>
        <nav className="flex items-center gap-6">
          {[
            { label: "Work", href: "#projects" },
            { label: "About", href: "#about" },
            { label: "Contact", href: "#contact" },
          ].map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="text-[#888888] hover:text-[#ededed] text-sm transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </motion.header>
  );
}
