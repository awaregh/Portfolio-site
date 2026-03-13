export default function Footer() {
  return (
    <footer className="border-t border-[rgba(232,230,227,0.1)] py-8 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-[#b6b1a8] text-sm font-mono">Ahmed Waregh</span>
        <div className="flex items-center gap-6">
          <a
            href="mailto:ahmedwaregh@gmail.com"
            className="link-underline text-[#b6b1a8] hover:text-[#e8e6e3] text-sm transition-colors"
          >
            Email
          </a>
          <a
            href="https://github.com/awaregh"
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline text-[#b6b1a8] hover:text-[#e8e6e3] text-sm transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://linkedin.com/in/ahmedrswaregh"
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline text-[#b6b1a8] hover:text-[#e8e6e3] text-sm transition-colors"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}

