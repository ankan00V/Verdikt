"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function ExampleRuns() {
  return (
    <section
      id="examples"
      className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 lg:px-16 py-20 md:py-28 text-center"
    >
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-white/40 font-medium">
          See it reason
        </p>
        <h2 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight text-white">
          Real output from the pipeline
        </h2>
        <p className="mt-4 text-white/60 text-sm max-w-lg mx-auto leading-relaxed">
          See the Example Runs section in the README for real agent output across three companies. 
          We use real live data, not hardcoded mockups.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex justify-center"
      >
        <a 
          href="https://github.com/ankanghosh/insideIIM#example-runs"
          target="_blank" 
          rel="noreferrer"
          className="bg-white/10 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/10"
        >
          View README on GitHub
          <ArrowRight className="w-4 h-4" />
        </a>
      </motion.div>
    </section>
  );
}
