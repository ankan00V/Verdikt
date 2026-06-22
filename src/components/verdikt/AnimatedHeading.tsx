"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedHeadingProps {
  text: string; // lines separated by \n
  className?: string;
  style?: React.CSSProperties;
  initialDelay?: number; // ms
}

export default function AnimatedHeading({
  text,
  className = "",
  style,
  initialDelay = 200,
}: AnimatedHeadingProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const lines = text.split("\n");

  return (
    <h1 ref={ref} className={className} style={style} aria-label={text}>
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.split("").map((char, ci) => {
            const delay =
              initialDelay + li * line.length * 30 + ci * 30;
            return (
              <span
                key={ci}
                aria-hidden
                className="inline-block"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateX(0)" : "translateX(-18px)",
                  transition: `opacity 500ms ease ${delay}ms, transform 500ms ease ${delay}ms`,
                }}
              >
                {char === " " ? "\u00A0" : char}
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}
