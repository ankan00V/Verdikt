/**
 * agent/schemas.ts
 *
 * Zod schemas for all LLM structured-output nodes.
 * These are passed to .withStructuredOutput(schema, { method: "json_schema" })
 * on the ChatOpenAI instance pointed at NVIDIA NIM.
 *
 * Design principle: each schema is self-documenting via .describe() so the LLM
 * understands exactly what each field means — no separate system-prompt workarounds.
 *
 * Zod v3 is used (not v4) for maximum compatibility with @langchain/core.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// FundamentalsSchema — output of analyze_fundamentals node
// ---------------------------------------------------------------------------

export const FundamentalsSchema = z.object({
  revenueGrowthAssessment: z
    .string()
    .describe(
      "Assessment of revenue growth trajectory over the past 1-3 years. " +
        "Include specific year-over-year percentages if data is available. " +
        "If data is unavailable, state that explicitly."
    ),
  marginQuality: z
    .string()
    .describe(
      "Assessment of gross, operating, and net profit margins. " +
        "Comment on trend direction (expanding/compressing) and absolute level vs. industry norms. " +
        "Include specific margin percentages."
    ),
  balanceSheetHealth: z
    .string()
    .describe(
      "Assessment of balance sheet strength: debt-to-equity ratio, current ratio, " +
        "free cash flow generation. Flag leverage concerns if present."
    ),
  valuationComment: z
    .string()
    .describe(
      "Comment on valuation multiples (P/E, EV/EBITDA, P/B) relative to growth profile. " +
        "State if data is insufficient for a reliable valuation call."
    ),
  overallScore: z
    .enum(["strong", "adequate", "weak", "unavailable"])
    .describe(
      "Overall fundamental quality score. Use 'unavailable' if financial data was not accessible."
    ),
  keyNumbers: z
    .array(z.string())
    .max(6)
    .describe(
      "Up to 6 key financial figures as formatted strings, e.g. 'Revenue FY2024: $394B', " +
        "'Net margin: 26.4%', 'P/E ratio: 28x'. Always use the ticker's currency."
    ),
  dataLimitationNote: z
    .string()
    .optional()
    .describe(
      "If financial data was unavailable or incomplete, describe specifically what is missing " +
        "and how it limits this analysis. Omit if data was fully available."
    ),
});

export type FundamentalsOutput = z.infer<typeof FundamentalsSchema>;

// ---------------------------------------------------------------------------
// SentimentSchema — output of analyze_sentiment node
// ---------------------------------------------------------------------------

export const SentimentSchema = z.object({
  overallTone: z
    .enum(["positive", "neutral", "negative", "mixed"])
    .describe(
      "The dominant tone of recent news coverage. " +
        "'mixed' = roughly equal positive and negative signals."
    ),
  momentumSignal: z
    .string()
    .describe(
      "Whether recent news suggests business momentum is building, stable, or deteriorating. " +
        "Be specific about what is driving the signal."
    ),
  controversies: z
    .array(z.string())
    .max(4)
    .describe(
      "Active controversies, legal issues, regulatory problems, or reputational risks " +
        "surfaced in recent news. Empty array if none found."
    ),
  recentDevelopments: z
    .array(z.string())
    .max(6)
    .describe(
      "The 3-6 most newsworthy recent developments relevant to investment thesis: " +
        "earnings, product launches, partnerships, leadership changes, macro tailwinds."
    ),
  sentimentScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "Numerical sentiment score 0-100. " +
        "0 = extremely negative coverage, 50 = neutral, 100 = extremely positive. " +
        "Base this on the balance and severity of news found."
    ),
});

export type SentimentOutput = z.infer<typeof SentimentSchema>;

// ---------------------------------------------------------------------------
// CompetitiveSchema — output of analyze_competitive_position node
// ---------------------------------------------------------------------------

export const CompetitiveSchema = z.object({
  moatAssessment: z
    .string()
    .describe(
      "Qualitative assessment of the company's economic moat: " +
        "what structural advantages protect its profits from competition? " +
        "Reference specific evidence (patents, network effects, switching costs, brand, cost advantage)."
    ),
  marketPosition: z
    .string()
    .describe(
      "Description of the company's position in its market: market share, " +
        "whether it leads, follows, or is a niche player, and trajectory."
    ),
  keyCompetitors: z
    .array(z.string())
    .max(5)
    .describe("The 2-5 most significant direct competitors by name."),
  competitiveRisks: z
    .array(z.string())
    .max(5)
    .describe(
      "The most material competitive threats: disruption risks, market share erosion, " +
        "regulatory headwinds, pricing pressure. Be specific."
    ),
  differentiators: z
    .array(z.string())
    .max(5)
    .describe(
      "The company's genuine differentiators that make it hard to displace. " +
        "Avoid marketing language — focus on structural advantages."
    ),
  moatScore: z
    .enum(["wide", "narrow", "none", "unclear"])
    .describe(
      "Rating of moat width. 'wide' = durable advantages likely to persist 10+ years, " +
        "'narrow' = some advantages but vulnerable to disruption, " +
        "'none' = commodity business with no clear defensibility, " +
        "'unclear' = insufficient information to assess."
    ),
});

export type CompetitiveOutput = z.infer<typeof CompetitiveSchema>;

// ---------------------------------------------------------------------------
// DecisionSchema — output of synthesize_decision node
// This schema is the most critical: the prompt explicitly requires citing
// findings from the prior three analysis nodes.
// ---------------------------------------------------------------------------

export const DecisionSchema = z.object({
  verdict: z
    .enum(["INVEST", "PASS"])
    .describe(
      "The investment verdict. INVEST = the evidence supports considering a long position. " +
        "PASS = the risk/reward does not support investment at this time."
    ),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "Confidence in the verdict on a 0-100 scale. " +
        "100 = near-certain based on overwhelming evidence. " +
        "50 = coin-flip, data is genuinely ambiguous. " +
        "Low confidence should reflect data gaps, not just analytical uncertainty."
    ),
  oneLineRationale: z
    .string()
    .max(200)
    .describe(
      "A single sentence stating the primary driver of the verdict. " +
        "Must be specific — e.g. 'Strong revenue growth and wide moat offset rich valuation' " +
        "not 'This company has good fundamentals'."
    ),
  fundamentalsSummary: z
    .string()
    .describe(
      "How the fundamentals analysis contributed to this verdict. " +
        "MUST reference specific numbers or scores from the fundamentals node output."
    ),
  sentimentSummary: z
    .string()
    .describe(
      "How the sentiment analysis contributed to this verdict. " +
        "MUST reference specific findings from the sentiment node output."
    ),
  competitiveSummary: z
    .string()
    .describe(
      "How the competitive analysis contributed to this verdict. " +
        "MUST reference the moat score and specific competitive findings."
    ),
  keyRisks: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe(
      "The 2-5 most material risks to this investment thesis. " +
        "Synthesized from all prior analysis nodes — no new information."
    ),
  keyStrengths: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe(
      "The 2-5 strongest factors supporting the investment case. " +
        "Synthesized from all prior analysis nodes — no new information."
    ),
  dataQualityNote: z
    .string()
    .optional()
    .describe(
      "If any critical data was unavailable (e.g. no FMP financials for this company), " +
        "note how that affects confidence in this verdict. Omit if data was complete."
    ),
});

export type DecisionOutput = z.infer<typeof DecisionSchema>;
