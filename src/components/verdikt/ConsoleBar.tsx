"use client";

import { useEffect, useState } from "react";

interface ConsoleBarProps {
  startedAt?: Date | null;
}

export default function ConsoleBar({ startedAt }: ConsoleBarProps) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!startedAt) {
      // Show live clock
      const update = () => {
        const now = new Date();
        setDisplay(
          now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })
        );
      };
      update();
      const id = setInterval(update, 1000);
      return () => clearInterval(id);
    } else {
      // Show elapsed time
      const update = () => {
        const elapsed = Math.floor(
          (Date.now() - startedAt.getTime()) / 1000
        );
        const m = Math.floor(elapsed / 60)
          .toString()
          .padStart(2, "0");
        const s = (elapsed % 60).toString().padStart(2, "0");
        setDisplay(`${m}:${s} elapsed`);
      };
      update();
      const id = setInterval(update, 1000);
      return () => clearInterval(id);
    }
  }, [startedAt]);

  return (
    <div className="h-10 bg-black/40 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4">
      {/* Left: neutral dots (NOT traffic-light — not a desktop app) */}
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
        <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
        <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
      </div>

      {/* Center label */}
      <span className="text-xs text-white/50 font-medium">
        Verdikt — Research Console
      </span>

      {/* Right: clock / elapsed */}
      <span className="font-mono text-[11px] text-white/40">{display}</span>
    </div>
  );
}
