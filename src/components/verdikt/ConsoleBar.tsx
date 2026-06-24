"use client";

import { useEffect, useState } from "react";

import { X, Minus, Maximize2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ConsoleBarProps {
  startedAt?: Date | null;
}

export default function ConsoleBar({ startedAt }: ConsoleBarProps) {
  const [display, setDisplay] = useState("");
  const router = useRouter();

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

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
      {/* Left: macOS traffic lights */}
      <div className="flex items-center gap-2 group">
        <button 
          onClick={() => router.push("/")}
          className="w-3 h-3 rounded-full bg-[#FF5F56] flex items-center justify-center transition-all"
        >
          <X className="w-2 h-2 text-black/60 opacity-0 group-hover:opacity-100" strokeWidth={3} />
        </button>
        <button 
          className="w-3 h-3 rounded-full bg-[#FFBD2E] flex items-center justify-center transition-all cursor-default"
        >
          <Minus className="w-2 h-2 text-black/60 opacity-0 group-hover:opacity-100" strokeWidth={3} />
        </button>
        <button 
          onClick={handleFullscreen}
          className="w-3 h-3 rounded-full bg-[#27C93F] flex items-center justify-center transition-all"
        >
          <Maximize2 className="w-2 h-2 text-black/60 opacity-0 group-hover:opacity-100" strokeWidth={3} />
        </button>
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
