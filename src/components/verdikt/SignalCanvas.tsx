"use client";

import { useEffect, useRef } from "react";

/**
 * Animated canvas background — thin horizontal lines that drift and
 * occasionally spike, evoking a ticker/signal feed resolving out of noise.
 * Respects prefers-reduced-motion by falling back to a static gradient.
 * Opacity kept at 0.12 via CSS.
 */
export default function SignalCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    if (reduced) {
      // Static gradient fallback
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, "rgba(201,162,39,0.06)");
      grad.addColorStop(1, "rgba(255,255,255,0.02)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return () => window.removeEventListener("resize", resize);
    }

    // Each line: y position, base y offset, drift speed, spike state
    type Line = {
      y: number;
      baseY: number;
      speed: number;
      amplitude: number;
      phase: number;
      spikeTimer: number;
      spikeInterval: number;
      spikeMag: number;
    };

    const LINE_COUNT = 28;
    const lines: Line[] = Array.from({ length: LINE_COUNT }, (_, i) => ({
      y: (i / LINE_COUNT) * window.innerHeight,
      baseY: (i / LINE_COUNT) * window.innerHeight,
      speed: 0.15 + Math.random() * 0.2,
      amplitude: 6 + Math.random() * 10,
      phase: Math.random() * Math.PI * 2,
      spikeTimer: Math.random() * 180,
      spikeInterval: 120 + Math.floor(Math.random() * 240),
      spikeMag: 0,
    }));

    let t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const line of lines) {
        line.spikeTimer++;
        if (line.spikeTimer >= line.spikeInterval) {
          line.spikeTimer = 0;
          line.spikeInterval = 120 + Math.floor(Math.random() * 240);
          line.spikeMag = 18 + Math.random() * 32;
        }
        // Decay spike
        line.spikeMag *= 0.92;

        const sineY =
          line.baseY +
          Math.sin(t * line.speed + line.phase) * line.amplitude +
          line.spikeMag * Math.sin(t * 0.8 + line.phase);

        line.y = sineY;

        // Draw the horizontal line with a subtle wave shape
        ctx.beginPath();
        ctx.moveTo(0, line.y);
        for (let x = 0; x <= canvas.width; x += 4) {
          const wave =
            Math.sin(x * 0.008 + t * line.speed + line.phase) *
            (line.amplitude * 0.4 + line.spikeMag * 0.15);
          ctx.lineTo(x, line.y + wave);
        }

        const brightness = 0.3 + (line.spikeMag / 50) * 0.7;
        ctx.strokeStyle = `rgba(201,162,39,${brightness * 0.55})`;
        ctx.lineWidth = 0.6 + (line.spikeMag / 50) * 0.8;
        ctx.stroke();
      }

      t += 0.015;
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="verdikt-canvas"
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.15 }}
    />
  );
}
