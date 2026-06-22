"use client";

import { motion } from "motion/react";
import {
  Sparkles,
  Inbox,
  Star,
  Send,
  FileText,
  Archive,
  Trash2,
  Search,
  Reply,
  Forward,
  MoreHorizontal,
  Paperclip,
} from "lucide-react";

/* ─── Sidebar data ─────────────────────────────────────────── */
const NAV_ITEMS = [
  { icon: Inbox, label: "Inbox", count: 12, active: true },
  { icon: Star, label: "Starred", count: 3 },
  { icon: Send, label: "Sent" },
  { icon: FileText, label: "Drafts", count: 2 },
  { icon: Archive, label: "Archive" },
  { icon: Trash2, label: "Trash" },
];

const LABELS = [
  { name: "Work", color: "#00d2ff" },
  { name: "Personal", color: "#A4F4FD" },
  { name: "Travel", color: "#f59e0b" },
  { name: "Finance", color: "#10b981" },
];

/* ─── Message list data ────────────────────────────────────── */
const MESSAGES = [
  {
    id: 1,
    from: "Linear",
    subject: "Weekly product digest",
    preview: "Your team shipped 23 issues this week...",
    time: "9:41 AM",
    unread: true,
    active: true,
  },
  {
    id: 2,
    from: "Sophia Chen",
    subject: "Re: Q3 roadmap review",
    preview: "Thanks for sending the deck over. I had a few thoughts...",
    time: "8:12 AM",
    unread: true,
  },
  {
    id: 3,
    from: "Figma",
    subject: "Marcus commented on your file",
    preview: "Love the new direction on the landing hero.",
    time: "Yesterday",
  },
  {
    id: 4,
    from: "Stripe",
    subject: "Payout of $12,480.00 sent",
    preview: "Your payout is on its way to your bank...",
    time: "Yesterday",
  },
  {
    id: 5,
    from: "Vercel",
    subject: "Deployment ready for aura-web",
    preview: "Preview is live at aura-web-g3f.vercel.app",
    time: "Mon",
  },
  {
    id: 6,
    from: "GitHub",
    subject: "[aura/core] PR #482 approved",
    preview: "david-lim approved your pull request.",
    time: "Mon",
  },
];

/* ─── Component ────────────────────────────────────────────── */
export default function InboxMockup() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0e1014]/90 backdrop-blur-2xl"
      >
        {/* Title bar */}
        <div className="h-10 flex items-center justify-between px-4 border-b border-white/[0.06] bg-black/30">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-xs text-white/50">Aura — Inbox</span>
          <div className="w-16" />
        </div>

        {/* Body */}
        <div className="grid grid-cols-12 h-[520px]">
          {/* ─ Sidebar ─ */}
          <aside className="col-span-3 border-r border-white/[0.06] bg-black/30 p-4 flex flex-col gap-4 overflow-hidden">
            {/* Compose */}
            <button className="flex items-center gap-2 rounded-lg bg-white text-black text-xs font-semibold px-3 py-2 w-full">
              <Sparkles className="w-3.5 h-3.5" />
              Compose with Aura
            </button>

            {/* Nav */}
            <nav className="flex flex-col gap-0.5">
              {NAV_ITEMS.map(({ icon: Icon, label, count, active }) => (
                <button
                  key={label}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors w-full text-left ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {count && (
                    <span className="text-[10px] text-white/40">{count}</span>
                  )}
                </button>
              ))}
            </nav>

            {/* Labels */}
            <div className="mt-auto">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-white/30 px-2.5 mb-2">
                Labels
              </p>
              <div className="flex flex-col gap-1">
                {LABELS.map(({ name, color }) => (
                  <div
                    key={name}
                    className="flex items-center gap-2.5 px-2.5 py-1 text-xs text-white/60"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: color }}
                    />
                    {name}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* ─ Message list ─ */}
          <div className="col-span-4 border-r border-white/[0.06] flex flex-col overflow-hidden">
            {/* Search */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
              <span className="text-xs text-white/30">Search mail</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto slim-scroll divide-y divide-white/[0.04]">
              {MESSAGES.map((msg) => (
                <div
                  key={msg.id}
                  className={`px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors ${
                    msg.active ? "bg-white/[0.05]" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-xs font-semibold truncate ${
                        msg.unread ? "text-white" : "text-white/60"
                      }`}
                    >
                      {msg.from}
                    </span>
                    <span className="text-[10px] text-white/40 flex-shrink-0 ml-2">
                      {msg.time}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] truncate ${
                      msg.unread ? "text-white/80" : "text-white/50"
                    }`}
                  >
                    {msg.subject}
                  </p>
                  <p className="text-[10px] text-white/40 truncate mt-0.5">
                    {msg.preview}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ─ Reader ─ */}
          <div className="col-span-5 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-1">
                {[Reply, Forward, Archive, Trash2].map((Icon, i) => (
                  <button
                    key={i}
                    className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/5 transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5 text-white/50" />
                  </button>
                ))}
              </div>
              <button className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/5 transition-colors">
                <MoreHorizontal className="w-3.5 h-3.5 text-white/50" />
              </button>
            </div>

            {/* Email header */}
            <div className="px-5 py-4 border-b border-white/[0.04]">
              <h2 className="text-sm font-semibold text-white leading-tight">
                Weekly product digest
              </h2>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00d2ff] to-[#0B2551] flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                    L
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-white">Linear</p>
                    <p className="text-[10px] text-white/40">to me · 9:41 AM</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-white/50">
                  Work
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto slim-scroll px-5 py-4 flex flex-col gap-4">
              {/* Aura summary card */}
              <div className="liquid-glass-aura rounded-xl p-3 flex gap-2.5">
                <Sparkles
                  className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                  style={{ color: "#A4F4FD" }}
                />
                <div>
                  <p className="text-[10px] font-semibold text-white/50 mb-1">
                    Summary by Aura
                  </p>
                  <p className="text-[11px] text-white/80 leading-[1.5]">
                    Your team closed 23 issues, merged 14 PRs, and shipped 2
                    features. Top contributor: Marcus. No action needed.
                  </p>
                </div>
              </div>

              {/* Email body text */}
              <div className="flex flex-col gap-3 text-[12px] text-white/70 leading-[1.6]">
                <p>Hi team,</p>
                <p>
                  Here is your weekly digest of everything happening across your
                  projects. This was a strong week with significant progress on
                  the Q3 roadmap.
                </p>
                <p>
                  Twenty-three issues were closed, fourteen pull requests were
                  merged, and two customer-facing features went out. The
                  velocity trend continues to climb.
                </p>
                <p>
                  Let me know if you would like a deeper breakdown by project or
                  contributor.
                </p>
                <p className="text-white/50">— The Linear team</p>
              </div>

              {/* Attachment */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] w-fit">
                <Paperclip className="w-3 h-3 text-white/40" />
                <span className="text-[11px] text-white/60">
                  digest-may-6.pdf
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
