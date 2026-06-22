"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimatedHeading } from "@/components/shared/AnimatedHeading";
import { FadeIn } from "@/components/shared/FadeIn";
import SignalCanvas from "@/components/verdikt/SignalCanvas";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0B0E11] text-white flex flex-col font-sans">
      {/* Background Video */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[#0B0E11]">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          preload="auto"
          ref={(el) => { if (el) el.play().catch(() => {}); }}
          className="w-full h-full object-cover pointer-events-none"
          src="/bg-video.mp4#t=0.001" 
        />
        <div className="absolute inset-0 bg-[#0B0E11]/60" /> {/* Dark overlay to ensure text readability */}
      </div>

      {/* Navbar */}
      <nav className="relative z-10 px-6 md:px-12 lg:px-16 pt-8 pb-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto relative">
          {/* Logo */}
          <div className="flex items-center z-10 -ml-4">
            <img src="/logo.png" alt="Verdikt Logo" className="h-16 md:h-20 w-auto object-contain" />
          </div>
          
          {/* Links */}
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
            <a href="#how-it-works" className="text-[13px] font-semibold tracking-wide text-white/50 hover:text-white transition-colors">How it works</a>
            <a href="#how-it-works" className="text-[13px] font-semibold tracking-wide text-white/50 hover:text-white transition-colors">Architecture</a>
            <a href="#examples" className="text-[13px] font-semibold tracking-wide text-white/50 hover:text-white transition-colors">Example runs</a>
          </div>

          {/* CTA */}
          <Link href="/research" className="bg-white text-black px-4 py-2 rounded-full text-[13px] font-semibold hover:bg-gray-100 transition-colors flex items-center gap-1.5 z-10">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            Start Research
            <svg className="w-3.5 h-3.5 text-black/50 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex-1 flex flex-col justify-center py-16 lg:py-24 px-6 md:px-12 lg:px-16 max-w-7xl mx-auto w-full min-h-[70vh]">
        <div className="grid lg:grid-cols-2 gap-12 items-stretch w-full">
          {/* Left Column */}
          <div className="flex flex-col justify-between h-full w-full">
            <div className="flex flex-col gap-6 lg:gap-8 pt-8">
              <AnimatedHeading 
                text={"Every company\nhas a verdict."}
                className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-normal tracking-tight text-white whitespace-pre-line"
                shinyLineIndex={1}
                shinyClassName="bg-clip-text text-transparent animate-shiny w-fit"
                shinyStyle={{
                  backgroundImage: 'linear-gradient(to right, #091020 0%, #0B2551 12.5%, #A4F4FD 32.5%, #00d2ff 50%, #0B2551 67.5%, #091020 87.5%, #091020 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                }}
              />
              
              <FadeIn delay={800}>
                <p className="text-base md:text-lg text-gray-300 max-w-xl leading-relaxed">
                  Give it a name. Verdikt researches the fundamentals, the sentiment, and the competitive position — then tells you, plainly, whether it&apos;s worth your conviction.
                </p>
              </FadeIn>
            </div>

            <FadeIn delay={1200} className="flex items-center gap-4 mt-12 lg:mt-auto pb-8">
              <Link href="/research" className="bg-white text-black px-6 py-3 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors">
                Start Research
              </Link>
              <a href="#how-it-works" className="liquid-glass border border-white/20 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-white/5 transition-colors">
                See how it works
              </a>
            </FadeIn>
          </div>

          {/* Right Column */}
          <FadeIn delay={1400} className="hidden lg:flex flex-col items-end justify-between h-full w-full">
            <div className="flex flex-col items-center justify-between h-full w-fit -mr-8 lg:-mr-16">
              {/* 
                AI-generated images have large intrinsic padding.
                We use negative margins to align the *visual* icon with the layout edges.
              */}
              <div className="pt-8 -mt-12 lg:-mt-20">
                <div className="relative w-[320px] h-[320px] xl:w-[420px] xl:h-[420px] flex items-center justify-center">
                  <div className="absolute inset-0 bg-[#00d2ff]/10 rounded-full blur-[80px] -z-10 mix-blend-screen" />
                  <img 
                    src="/logo.png" 
                    alt="Verdikt Brand Logo" 
                    className="w-full h-full object-contain scale-[1.35] drop-shadow-[0_0_15px_rgba(0,210,255,0.3)] animate-float"
                  />
                </div>
              </div>
              
              <div className="pb-8">
                <div className="inline-block liquid-glass border border-white/10 rounded-lg px-4 py-3 font-mono text-xs text-white/70 tracking-tight">
                  resolve → research → analyze → verdict
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* How It Works (Pipeline) */}
      <section id="how-it-works" className="relative z-10 px-6 md:px-12 lg:px-16 py-24 md:py-32 max-w-7xl mx-auto w-full border-t border-white/10">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left: Text */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/50 tracking-wide uppercase">Pipeline</span>
              <span className="px-2 py-0.5 rounded-full border border-white/10 text-xs text-white/50 bg-white/5">LangGraph</span>
            </div>
            
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white leading-[1.1]">
              Research, not a guess.<br/>
              <span className="bg-clip-text text-transparent animate-shiny" style={{
                backgroundImage: 'linear-gradient(to right, #1a1505 0%, #4a3a0d 12.5%, #F0D584 32.5%, #C9A227 50%, #4a3a0d 67.5%, #1a1505 87.5%, #1a1505 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
              }}>
                Four stages, every time.
              </span>
            </h2>
            
            <p className="text-base text-white/60 leading-[1.6] max-w-md">
              Verdikt runs a real multi-step graph — fetching financials, reading news, and reasoning independently through each dimension before synthesizing a final stance. Not a single prompt pretending to be analysis.
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              {['resolve_ticker', 'fetch_financials', 'fetch_news', 'analyze_fundamentals', 'synthesize_decision'].map(node => (
                <span key={node} className="font-mono text-xs text-white/70 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03]">
                  {node}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Visual */}
          <div className="liquid-glass rounded-2xl p-6 border border-white/10 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <span className="text-xs text-white/50 font-medium">Node Execution</span>
            </div>
            <div className="flex flex-col gap-3 font-mono text-xs">
              <div className="flex justify-between items-center text-emerald-400">
                <span className="flex items-center gap-2"><span className="w-4">✓</span> resolve_ticker</span>
                <span className="opacity-50">0.8s</span>
              </div>
              <div className="flex justify-between items-center text-emerald-400">
                <span className="flex items-center gap-2"><span className="w-4">✓</span> fetch_financials</span>
                <span className="opacity-50">1.2s</span>
              </div>
              <div className="flex justify-between items-center text-white/70">
                <span className="flex items-center gap-2">
                  <span className="w-4 animate-pulse">●</span> analyze_fundamentals
                </span>
                <span className="opacity-50 text-amber-400">Running...</span>
              </div>
              <div className="flex justify-between items-center text-white/30">
                <span className="flex items-center gap-2"><span className="w-4"></span> synthesize_decision</span>
                <span className="opacity-50">Pending</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Example Runs */}
      <section id="examples" className="relative z-10 px-6 md:px-12 lg:px-16 py-24 md:py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-widest text-white/40 font-semibold">See it reason</span>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Example 1 */}
            <div className="liquid-glass rounded-2xl p-6 border border-white/10 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-white">Apple Inc.</h3>
                  <p className="text-xs font-mono text-white/40">AAPL</p>
                </div>
                <div className="verdict-stamp invest text-xs px-2 py-1 border-[2px]">INVEST</div>
              </div>
              <blockquote className="text-sm text-white/80 leading-relaxed italic">
                &quot;Strong moat in hardware-software integration paired with accelerating services revenue, offsetting recent hardware cycle stagnation.&quot;
              </blockquote>
            </div>

            {/* Example 2 */}
            <div className="liquid-glass rounded-2xl p-6 border border-white/10 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-white">Palantir</h3>
                  <p className="text-xs font-mono text-white/40">PLTR</p>
                </div>
                <div className="verdict-stamp invest text-xs px-2 py-1 border-[2px]">INVEST</div>
              </div>
              <blockquote className="text-sm text-white/80 leading-relaxed italic">
                &quot;Unprecedented AIP adoption timeline and sustained GAAP profitability indicate the commercial pivot has reached escape velocity.&quot;
              </blockquote>
            </div>

            {/* Example 3 */}
            <div className="liquid-glass rounded-2xl p-6 border border-white/10 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-white">Peloton</h3>
                  <p className="text-xs font-mono text-white/40">PTON</p>
                </div>
                <div className="verdict-stamp pass text-xs px-2 py-1 border-[2px]">PASS</div>
              </div>
              <blockquote className="text-sm text-white/80 leading-relaxed italic">
                &quot;Continued cash burn and failure to re-accelerate hardware sales indicate a permanently impaired growth thesis despite cost cutting.&quot;
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-6 md:px-12 lg:px-16 py-20 md:py-32 max-w-5xl mx-auto w-full">
        <div className="liquid-glass relative overflow-hidden rounded-3xl px-8 py-16 md:py-24 text-center border border-white/10">
          <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(600px circle at 50% 0%, rgba(201,162,39,0.15), transparent 70%)' }}></div>
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-white leading-[1.05]">
              Stop guessing.<br/>Start researching.
            </h2>
            <p className="mt-6 text-white/60 max-w-md mx-auto text-sm leading-[1.6]">
              Type a name. Get a verdict you can actually trace back to the evidence.
            </p>
            <div className="mt-10 flex justify-center">
              <Link href="/research" className="bg-white text-black px-8 py-3 rounded-full text-sm font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2">
                Start Research
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="text-lg font-semibold tracking-tight text-white">verdikt</span>
            <span className="text-sm text-white/40 hidden md:inline">AI-powered investment research.</span>
          </div>
          <a href="https://github.com/ankan00V/Verdikt" target="_blank" rel="noreferrer" className="text-sm text-white/40 hover:text-white transition-colors">
            GitHub Repository
          </a>
        </div>
      </footer>
    </div>
  );
}
