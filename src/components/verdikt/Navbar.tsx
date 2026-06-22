"use client";

import Link from "next/link";

export default function VerdiktNavbar() {
  return (
    <nav className="relative z-50 px-6 md:px-12 lg:px-16 pt-6">
      <div className="liquid-glass rounded-xl px-4 py-2 flex items-center justify-between max-w-6xl mx-auto">
        {/* Wordmark */}
        <span className="text-2xl font-semibold tracking-tight text-white select-none">
          verdikt
        </span>

        {/* Center nav */}
        <div className="hidden md:flex gap-8 text-sm text-white/70">
          <a
            href="#how-it-works"
            className="hover:text-white transition-colors"
          >
            How it works
          </a>
          <a href="#architecture" className="hover:text-white transition-colors">
            Architecture
          </a>
          <a href="#example-runs" className="hover:text-white transition-colors">
            Example runs
          </a>
        </div>

        {/* CTA */}
        <Link
          href="/research"
          className="bg-white text-black px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          Start Research
        </Link>
      </div>
    </nav>
  );
}
