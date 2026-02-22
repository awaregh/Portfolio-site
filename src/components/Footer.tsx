export default function Footer() {
  return (
    <footer className="border-t border-[rgba(255,255,255,0.06)] py-8 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-[#888888] text-sm">Ahmed Waregh</span>
        <div className="flex items-center gap-6">
          <a
            href="mailto:ahmedwaregh@gmail.com"
            className="text-[#888888] hover:text-[#ededed] text-sm transition-colors"
          >
            Email
          </a>
          <a
            href="https://github.com/awaregh"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#888888] hover:text-[#ededed] text-sm transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://linkedin.com/in/ahmedrswaregh"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#888888] hover:text-[#ededed] text-sm transition-colors"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}
