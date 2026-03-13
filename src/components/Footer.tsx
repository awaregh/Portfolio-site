export default function Footer() {
  return (
    <footer className="border-t border-[rgba(147,197,253,0.2)] py-8 px-6 bg-white/30 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-[#6b7ea3] text-sm">Ahmed Waregh</span>
        <div className="flex items-center gap-6">
          <a
            href="mailto:ahmedwaregh@gmail.com"
            className="text-[#6b7ea3] hover:text-[#1a2e4a] text-sm transition-colors"
          >
            Email
          </a>
          <a
            href="https://github.com/awaregh"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6b7ea3] hover:text-[#1a2e4a] text-sm transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://linkedin.com/in/ahmedrswaregh"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6b7ea3] hover:text-[#1a2e4a] text-sm transition-colors"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}
