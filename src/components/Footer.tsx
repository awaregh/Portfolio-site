export default function Footer() {
  return (
    <footer className="border-t border-[rgba(61,155,212,0.14)] py-8 px-6 bg-[#f8fbff]">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-[#57789a] text-sm font-mono">Ahmed Waregh</span>
        <div className="flex items-center gap-6">
          <a
            href="mailto:ahmedwaregh@gmail.com"
            className="link-underline text-[#57789a] hover:text-[#1a2f45] text-sm transition-colors"
          >
            Email
          </a>
          <a
            href="https://github.com/awaregh"
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline text-[#57789a] hover:text-[#1a2f45] text-sm transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://linkedin.com/in/ahmedrswaregh"
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline text-[#57789a] hover:text-[#1a2f45] text-sm transition-colors"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}
