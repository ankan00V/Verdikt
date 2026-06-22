"use client";

import { motion } from "motion/react";
import { Menu } from "lucide-react";
import { AppleButton, LogoMark } from "./Primitives";

const NAV_LINKS = ["Solutions", "Pricing", "Blog", "Documentation", "Careers"];

export default function AuraNavbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative z-50 w-full"
    >
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        {/* Left – logo only */}
        <LogoMark className="w-8 h-8" />

        {/* Center – nav links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link, i) => (
            <motion.a
              key={link}
              href="#"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
              className="text-white/70 text-sm font-medium hover:text-white transition-colors"
            >
              {link}
            </motion.a>
          ))}
        </div>

        {/* Right */}
        <div className="hidden md:flex">
          <AppleButton label="Download Aura" />
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
          <Menu className="w-4 h-4 text-white/70" />
        </button>
      </div>
    </motion.nav>
  );
}
