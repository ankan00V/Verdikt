"use client";

import { motion } from "motion/react";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Aura gave our leadership team four hours of their week back. It reads like email from the future.",
    name: "Parker Wilf",
    role: "Group Product Manager",
    company: "Mercury",
  },
  {
    quote:
      "The command palette alone has changed how I process messages. I can't imagine going back to a traditional client.",
    name: "Andrew von Rosenbach",
    role: "Senior Engineering Program Manager",
    company: "Cohere",
  },
  {
    quote:
      "Triage that actually understands context. Our team stopped dreading Monday morning inboxes.",
    name: "Mathies Christensen",
    role: "Engineering Manager",
    company: "Lunar",
  },
];

export default function Testimonials() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-28 border-t border-white/10">
      <div className="grid md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t, i) => (
          <motion.figure
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.6 }}
            className="liquid-glass-aura rounded-2xl p-6"
          >
            <blockquote className="text-sm text-white/80 leading-[1.6]">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-6 pt-5 border-t border-white/10">
              <p className="text-sm font-semibold text-white">{t.name}</p>
              <p className="text-xs text-white/50 mt-0.5">{t.role}</p>
              <p className="text-xs text-white font-semibold tracking-wide uppercase mt-1">
                {t.company}
              </p>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}
