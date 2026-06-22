"use client";

import { motion } from "motion/react";

interface AnimatedHeadingProps {
  text: string;
  className?: string;
  shinyLineIndex?: number;
  shinyClassName?: string;
  shinyStyle?: React.CSSProperties;
}

export function AnimatedHeading({ 
  text, 
  className = "", 
  shinyLineIndex,
  shinyClassName = "",
  shinyStyle = {}
}: AnimatedHeadingProps) {
  const lines = text.split("\n");

  return (
    <h1 className={className}>
      {lines.map((line, lineIndex) => (
        <span 
          key={lineIndex} 
          className={`block overflow-hidden ${lineIndex === shinyLineIndex ? shinyClassName : ""}`}
          style={lineIndex === shinyLineIndex ? shinyStyle : undefined}
        >
          {line.split("").map((char, charIndex) => (
            <motion.span
              key={`${lineIndex}-${charIndex}`}
              className="inline-block"
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.2 + (lineIndex * line.length * 0.03) + (charIndex * 0.03),
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </span>
      ))}
    </h1>
  );
}
