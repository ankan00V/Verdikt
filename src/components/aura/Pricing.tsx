"use client";

import { useState } from "react";

interface Plan {
  tier: string;
  monthlyPrice: string;
  yearlyPrice: string;
  desc: string;
  features: string[];
  isPro?: boolean;
}

const PLANS: Plan[] = [
  {
    tier: "Free",
    monthlyPrice: "Free",
    yearlyPrice: "Free",
    desc: "For creators taking their first steps with Forma.",
    features: [
      "Up to 3 projects in the cloud",
      "Image export up to 1080p",
      "Basic editing tools",
      "Free templates and icons",
      "Access via web and mobile app",
    ],
  },
  {
    tier: "Standard",
    monthlyPrice: "$9,99/m",
    yearlyPrice: "$99,99/y",
    desc: "For freelancers and small teams who need more freedom and flexibility.",
    features: [
      "Up to 50 projects in the cloud",
      "Export up to 4K",
      "Advanced editing toolkit",
      "Team collaboration (up to 5 members)",
      "Access to premium template library",
    ],
  },
  {
    tier: "Pro",
    monthlyPrice: "$19,99/m",
    yearlyPrice: "$199,99/y",
    desc: "For studios, agencies, and professional creators working with brands.",
    features: [
      "Unlimited projects",
      "Export up to 8K + animations",
      "AI-powered content generation tools",
      "Unlimited team members",
      "Brand customization",
    ],
    isPro: true,
  },
];

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M2.5 7L5.5 10L11.5 4"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section className="c3-pricing-section">
      {/* Pricing-specific noise filter */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="c3-noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.5"
              numOctaves="2"
              stitchTiles="stitch"
            />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.075" />
            </feComponentTransfer>
            <feComposite in2="SourceGraphic" operator="in" result="noise" />
            <feBlend in="SourceGraphic" in2="noise" mode="overlay" />
          </filter>
        </defs>
      </svg>

      {/* Watermark */}
      <div className="c3-watermark-container">
        <div className="c3-watermark-main">
          <span className="c3-watermark-line-1">Your email.</span>
          <span className="c3-watermark-line-2">Revitalized</span>
        </div>
      </div>

      {/* Grid */}
      <div className="c3-grid">
        {PLANS.map((plan) => (
          <div
            key={plan.tier}
            className={`c3-card${plan.isPro ? " c3-card-pro" : ""}`}
          >
            <div className="c3-tier-small">{plan.tier}</div>
            <div className="c3-tier-large">
              {yearly ? plan.yearlyPrice : plan.monthlyPrice}
            </div>
            <div className="c3-desc">{plan.desc}</div>
            <ul className="c3-list">
              {plan.features.map((f) => (
                <li key={f}>
                  <span className="c3-check">
                    <CheckIcon />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <button className="c3-btn">Choose Plan</button>
          </div>
        ))}
      </div>

      {/* Toggle */}
      <div className="c3-toggle-wrap">
        <span
          style={{
            fontSize: "0.85rem",
            color: "rgba(255,255,255,0.6)",
            fontWeight: 500,
          }}
        >
          Yearly
        </span>
        <button
          className={`c3-toggle${yearly ? " active" : ""}`}
          onClick={() => setYearly((y) => !y)}
          aria-label="Toggle yearly pricing"
        >
          <div className="c3-toggle-knob" />
        </button>
      </div>
    </section>
  );
}
