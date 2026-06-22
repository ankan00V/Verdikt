import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verdikt — AI Investment Research",
  description:
    "Enter a company name. Verdikt researches it across financial data, news, and competitive analysis, then delivers a traceable INVEST or PASS verdict.",
  openGraph: {
    title: "Verdikt — AI Investment Research",
    description:
      "AI-powered investment research with traceable reasoning. Real financials, real news, real analysis.",
    type: "website",
  },
  robots: {
    index: false, // Don't index during development / assignment
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <svg style={{ display: 'none' }}>
          <filter id="verdikt-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" />
            <feComposite in2="SourceGraphic" operator="in" result="noise" />
            <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
          </filter>
        </svg>
        {children}
      </body>
    </html>
  );
}
