"use client";

import Link from "next/link";
import AnimatedHeading from "./AnimatedHeading";
import FadeIn from "./FadeIn";
import { ChevronRight } from "lucide-react";

/** Gold shiny gradient style for the "verdict" word in the heading */
const verdiktGradientStyle: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, #1a1505 0%, #4a3a0d 12.5%, #F0D584 32.5%, #C9A227 50%, #4a3a0d 67.5%, #1a1505 87.5%, #1a1505 100%)",
  backgroundSize: "200% auto",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
  filter: "url(#verdikt-noise)",
};

export default function VerdiktHero() {
  return (
    <section className="relative z-10 flex-1 flex flex-col justify-end pb-12 lg:pb-16 px-6 md:px-12 lg:px-16 pt-16 max-w-6xl mx-auto w-full">
      {/* Hidden noise filter for gold gradient */}
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden>
        <defs>
          <filter id="verdikt-noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              stitchTiles="stitch"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0"
            />
            <feComposite in2="SourceGraphic" operator="in" result="noise" />
            <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
          </filter>
        </defs>
      </svg>

      <div className="grid lg:grid-cols-2 gap-12 items-end">
        {/* Left column */}
        <div>
          <AnimatedHeading
            text={"Every company\nhas a verdict."}
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-normal text-white leading-[1.05]"
            style={{ letterSpacing: "-0.04em" }}
            initialDelay={200}
          />

          <FadeIn delay={800} duration={700} className="mt-6">
            <p className="text-base md:text-lg text-gray-300 max-w-lg leading-[1.6]">
              Give it a name. Verdikt researches the fundamentals, the
              sentiment, and the competitive position — then tells you, plainly,
              whether it&apos;s worth your conviction.
            </p>
          </FadeIn>

          <FadeIn delay={1200} duration={700} className="mt-8 flex gap-4 flex-wrap">
            <Link
              href="/research"
              className="inline-flex items-center gap-2 rounded-full bg-white text-black font-medium text-sm px-6 py-3 hover:bg-white/90 transition-all"
            >
              Start Research
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            <a
              href="#how-it-works"
              className="liquid-glass inline-flex items-center gap-2 rounded-full border border-white/20 text-white text-sm font-medium px-6 py-3 hover:bg-white/5 transition-all"
            >
              See how it works
            </a>
          </FadeIn>
        </div>

        {/* Right column — live node sequence tag */}
        <FadeIn
          delay={1400}
          duration={700}
          className="flex lg:justify-end lg:items-end"
        >
          <div className="liquid-glass rounded-2xl px-5 py-4 max-w-xs">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2 font-medium">
              Pipeline preview
            </p>
            <p
              className="font-mono text-sm leading-[1.8] tracking-tight"
              style={{ color: "#C9A227" }}
            >
              resolve{" "}
              <span className="text-white/30">→</span>{" "}
              <span className="text-white/70">research</span>{" "}
              <span className="text-white/30">→</span>{" "}
              <span className="text-white/50">analyze</span>{" "}
              <span className="text-white/30">→</span>{" "}
              <span
                className="animate-shiny"
                style={verdiktGradientStyle}
              >
                verdict
              </span>
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
