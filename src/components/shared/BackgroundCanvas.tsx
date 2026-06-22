"use client";

import { useEffect, useRef } from "react";

export function BackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener("resize", resize);
    resize();

    // Line objects
    const lines = Array.from({ length: 40 }).map(() => ({
      y: Math.random() * height,
      speed: (Math.random() * 0.5 + 0.1) * (Math.random() > 0.5 ? 1 : -1),
      opacity: Math.random() * 0.15 + 0.05,
      spikeTime: Math.random() * 200,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      
      lines.forEach((line) => {
        line.y += line.speed;
        if (line.y > height) line.y = 0;
        if (line.y < 0) line.y = height;

        line.spikeTime -= 1;
        let lineWidth = 1;
        let lineOpacity = line.opacity;

        if (line.spikeTime < 0) {
          line.spikeTime = Math.random() * 200 + 100;
        } else if (line.spikeTime < 20) {
          lineWidth = 2;
          lineOpacity = line.opacity * 2;
        }

        ctx.beginPath();
        ctx.moveTo(0, line.y);
        ctx.lineTo(width, line.y);
        ctx.strokeStyle = `rgba(255, 255, 255, ${lineOpacity})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ opacity: 0.8 }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-ink pointer-events-none" />
    </div>
  );
}
