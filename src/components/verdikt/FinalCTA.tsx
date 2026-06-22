"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";

export default function VerdiktFinalCTA() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 lg:px-16 py-20 md:py-28">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="liquid-glass rounded-3xl px-8 py-16 md:py-24 text-center relative overflow-hidden"
      >
        {/* Radial glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px circle at 50% 0%, rgba(255,255,255,0.12), transparent 70%)",
            opacity: 0.3,
          }}
        />

        <h2 className="relative text-4xl md:text-6xl font-semibold tracking-tight leading-[1.02] text-white">
          Stop guessing.
          <br />
          Start researching.
        </h2>
        <p className="relative mt-6 text-white/60 max-w-md mx-auto text-sm leading-[1.6]">
          Type a name. Get a verdict you can actually trace back to the
          evidence.
        </p>

        <div className="relative mt-10">
          <Link
            href="/research"
            className="inline-flex items-center gap-2 rounded-full bg-white text-black font-medium text-sm px-8 py-3.5 hover:bg-white/90 transition-all"
          >
            Start Research
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
