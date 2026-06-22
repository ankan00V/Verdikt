"use client";

import { motion } from "motion/react";
import { AppleLogo } from "./Primitives";
import { Search } from "lucide-react";

const MENU_ITEMS = ["File", "Edit", "View", "Go", "Window", "Help"];

export default function MacOSMenuBar() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9, duration: 0.5 }}
      className="relative z-20 w-full h-10 bg-black/40 backdrop-blur-md border-t border-b border-white/10"
    >
      <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between text-xs">
        {/* Left */}
        <div className="flex items-center gap-4">
          <AppleLogo className="w-3.5 h-3.5" />
          <span className="font-bold text-white">Aura</span>
          {MENU_ITEMS.map((item, i) => (
            <span
              key={item}
              className={`text-white/70 cursor-default hover:text-white transition-colors${
                i > 2 ? " hidden sm:inline" : ""
              }${i > 3 ? " hidden md:inline" : ""}`}
            >
              {item}
            </span>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 text-white/60">
          <Search className="w-3.5 h-3.5" />
          <span>Wed May 6 1:09 PM</span>
        </div>
      </div>
    </motion.div>
  );
}
