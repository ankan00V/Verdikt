"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";

export interface NodeEvent {
  node: string;
  data: any;
  status: "pending" | "running" | "completed" | "error";
}

interface AgentProgressProps {
  events: NodeEvent[];
}

const formatNodeName = (name: string) => {
  return name.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

export function AgentProgress({ events }: AgentProgressProps) {
  if (events.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto border-l border-slate/30 pl-6 space-y-6 my-12 font-sans">
      <h3 className="text-lg text-slate font-medium mb-6 uppercase tracking-widest text-xs">Research Pipeline</h3>
      {events.map((event, idx) => (
        <motion.div
          key={`${event.node}-${idx}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          {/* Timeline marker */}
          <div className="absolute -left-[33px] top-1 bg-ink">
            {event.status === "completed" && <CheckCircle2 className="w-4 h-4 text-brass" />}
            {event.status === "running" && <Loader2 className="w-4 h-4 text-slate animate-spin" />}
            {event.status === "error" && <AlertCircle className="w-4 h-4 text-pass" />}
            {event.status === "pending" && <Circle className="w-4 h-4 text-slate/40" />}
          </div>
          
          <div>
            <h4 className={`text-sm font-semibold uppercase tracking-wider ${event.status === 'completed' ? 'text-paper' : 'text-slate'}`}>
              {formatNodeName(event.node)}
            </h4>
            
            {/* Show snippet of findings if available and completed */}
            {event.status === "completed" && event.data && (
              <div className="mt-2 text-sm text-slate/80 bg-slate/10 p-3 rounded font-mono">
                {event.node === "resolve_ticker" && event.data.ticker && (
                  <p>Resolved to ticker: {event.data.ticker}</p>
                )}
                {event.node === "resolve_ticker" && !event.data.companyConfirmed && (
                  <p className="text-pass">Could not confirm public company ticker.</p>
                )}
                {event.node === "fetch_financials" && event.data.financialData && (
                  <p>Retrieved statements & metrics.</p>
                )}
                {event.node === "fetch_news" && event.data.newsData && (
                  <p>Retrieved recent news articles.</p>
                )}
                {event.node === "fetch_web_research" && event.data.webData && (
                  <p>Retrieved market landscape data.</p>
                )}
                {event.node === "analyze_fundamentals" && event.data.fundamentalsAnalysis && (
                  <p>Health: {event.data.fundamentalsAnalysis.overallHealth}</p>
                )}
                {event.node === "analyze_sentiment" && event.data.sentimentAnalysis && (
                  <p>Tone: {event.data.sentimentAnalysis.newsTone}</p>
                )}
                {event.node === "analyze_competitive_position" && event.data.competitiveAnalysis && (
                  <p>Moat: {event.data.competitiveAnalysis.economicMoat}</p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
