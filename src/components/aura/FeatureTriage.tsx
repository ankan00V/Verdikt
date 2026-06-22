"use client";

import { motion } from "motion/react";
import { SectionEyebrow } from "./Primitives";

const CHIPS = [
  "Auto-categorize",
  "Snooze for later",
  "Silent newsletters",
  "One-tap unsubscribe",
];

interface TriageGroup {
  label: string;
  count: number;
  color: string;
  items: string[];
}

const TRIAGE_GROUPS: TriageGroup[] = [
  {
    label: "Priority",
    count: 4,
    color: "#ffffff",
    items: ["Sophia Chen — Q3 review", "David Lim — contract signoff"],
  },
  {
    label: "Follow-up",
    count: 7,
    color: "#e5e5e5",
    items: ["Marcus — design review", "Figma — comment thread"],
  },
  {
    label: "Updates",
    count: 18,
    color: "#a3a3a3",
    items: ["Vercel — deploy ready", "GitHub — PR #482 merged"],
  },
  {
    label: "Archived",
    count: 13,
    color: "#525252",
    items: ["Stripe payout · Newsletter · Receipts"],
  },
];

export default function FeatureTriage() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-28">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
        {/* Left */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <SectionEyebrow label="Triage" tag="AI-native" />
          <h2 className="mt-5 text-3xl md:text-5xl font-semibold tracking-tight leading-[1.02]">
            Clear your inbox
            <br />
            in a single pass.
          </h2>
          <p className="mt-6 text-white/60 text-base leading-[1.6] max-w-md">
            Aura reads every message, understands intent, and routes the noise
            away from the signal. Focus on what moves your day forward — the
            rest handles itself.
          </p>

          {/* Chips */}
          <div className="mt-8 flex flex-wrap gap-2">
            {CHIPS.map((chip) => (
              <span
                key={chip}
                className="text-xs text-white/70 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03]"
              >
                {chip}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Right */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="liquid-glass-aura rounded-2xl p-5"
        >
          <p className="text-xs text-white/40 mb-4">
            Today · 42 messages triaged
          </p>
          <div className="flex flex-col gap-3">
            {TRIAGE_GROUPS.map(({ label, count, color, items }) => (
              <div key={label} className="liquid-glass-aura rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-xs font-semibold text-white/80">
                    {label}
                  </span>
                  <span className="text-xs text-white/40 ml-auto">{count}</span>
                </div>
                <div className="flex flex-col gap-1">
                  {items.map((item) => (
                    <p key={item} className="text-[11px] text-white/50">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
