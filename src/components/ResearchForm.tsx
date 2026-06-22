"use client";

import { useState } from "react";
import { Search } from "lucide-react";

interface ResearchFormProps {
  onSubmit: (companyName: string) => void;
  isLoading: boolean;
}

export function ResearchForm({ onSubmit, isLoading }: ResearchFormProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSubmit(input.trim());
    }
  };

  const handleExample = (ticker: string) => {
    setInput(ticker);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-12">
      <form onSubmit={handleSubmit} className="relative flex items-center w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate" />
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          placeholder="Enter a company name or ticker (e.g., Apple, TSLA, Airbnb)"
          className="w-full bg-paper text-ink rounded-none border-b-2 border-slate focus:border-ink py-4 pl-12 pr-24 outline-none font-sans text-lg transition-colors placeholder:text-slate/60 disabled:opacity-70 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="absolute right-2 px-4 py-2 bg-ink text-paper font-sans text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-opacity uppercase font-semibold"
        >
          {isLoading ? "Running..." : "Research"}
        </button>
      </form>
      
    </div>
  );
}
