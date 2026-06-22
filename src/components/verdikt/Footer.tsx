"use client";

export default function VerdiktFooter() {
  return (
    <footer className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 lg:px-16 py-10 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-white tracking-tight">
          verdikt
        </p>
        <p className="text-xs text-white/40 mt-1 max-w-xs leading-[1.5]">
          AI investment research agent. Powered by LangGraph, NVIDIA NIM, and
          real financial data.
        </p>
      </div>

      <a
        href="https://github.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-white/50 hover:text-white transition-colors font-mono border border-white/10 px-3 py-1.5 rounded-lg hover:border-white/20"
      >
        View on GitHub →
      </a>
    </footer>
  );
}
