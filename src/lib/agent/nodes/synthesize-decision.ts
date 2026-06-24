/**
 * nodes/synthesize-decision.ts
 *
 * LLM node: synthesizes all prior analysis into a final INVEST/PASS verdict.
 *
 * This is the most architecturally important node. Its system prompt explicitly:
 *   1. Injects the FULL structured outputs of fundamentalsAnalysis,
 *      sentimentAnalysis, and competitiveAnalysis as JSON
 *   2. Instructs the model that its verdict MUST reference specific findings
 *      from those prior outputs — it is synthesizing, not generating fresh opinion
 *   3. Prohibits introducing new information not present in the prior analysis
 *
 * The DecisionSchema's .describe() fields reinforce these constraints at the
 * field level — fundamentalsSummary "MUST reference specific numbers or scores
 * from the fundamentals node output", etc.
 *
 * This design makes the reasoning chain traceable: a reviewer can compare the
 * decision output to the analysis outputs and verify the logic holds.
 */

import { invokeStructuredLLM } from "../llm";
import { AgentStateType } from "../state";
import { DecisionSchema } from "../schemas";

// ---------------------------------------------------------------------------
// Helper: compress findings to prevent context length timeouts on Vercel
// ---------------------------------------------------------------------------

function compressFindingsForSynthesis(state: AgentStateType) {
  const f = state.fundamentalsAnalysis;
  const s = state.sentimentAnalysis;
  const c = state.competitiveAnalysis;

  return {
    fundamentals: f ? {
      growth: f.revenueGrowthAssessment,
      margins: f.marginQuality,
      balanceSheet: f.balanceSheetHealth,
      score: f.overallScore
    } : null,
    sentiment: s ? {
      tone: s.overallTone,
      momentum: s.momentumSignal,
      topSignals: s.recentDevelopments?.slice(0, 2)
    } : null,
    competitive: c ? {
      moatScore: c.moatScore,
      position: c.marketPosition,
      topRisks: c.competitiveRisks?.slice(0, 2)
    } : null
  };
}

// ---------------------------------------------------------------------------
// Main node function
// ---------------------------------------------------------------------------

export async function synthesizeDecisionNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {


  const companyName = state.companyProfile?.name ?? state.companyName;

  // Inject all prior analysis as structured JSON so the model synthesizes
  // rather than re-derives conclusions
  const priorAnalysis = JSON.stringify(
    {
      company: { name: companyName, ticker: state.ticker },
      compressedFindings: compressFindingsForSynthesis(state),
      dataFlags: {
        financialsAvailable: state.financialsAvailable,
        newsCount: state.newsResults.length,
        webResearchCount: state.webResearchResults.length,
        nonFatalErrors: state.errors,
      },
    },
    null,
    2
  );

  const systemPrompt =
    `You are the lead analyst on an investment research team. ` +
    `Your colleagues have completed three independent analyses of ${companyName} (${state.ticker}): ` +
    `fundamental analysis, sentiment analysis, and competitive analysis. ` +
    `Your task is to synthesize their findings into a final INVEST or PASS verdict.\n\n` +
    `CRITICAL RULES:\n` +
    `1. Your verdict MUST be based on the findings provided below — do not introduce new information.\n` +
    `2. Your fundamentalsSummary MUST cite specific numbers from the fundamentals analysis (e.g. actual scores, margins mentioned).\n` +
    `3. Your sentimentSummary MUST cite specific developments or controversies from the sentiment analysis.\n` +
    `4. Your competitiveSummary MUST cite the moat score and specific findings from the competitive analysis.\n` +
    `5. If data was unavailable, lower your confidence score accordingly and note it in dataQualityNote.\n` +
    `6. keyRisks and keyStrengths must be synthesized from the prior analyses — not invented.\n` +
    `7. Confidence 70+ means clear evidence. 50-69 means mixed signals. Below 50 means data is insufficient for a conviction call.\n` +
    `8. If financialData.available is false (or dataFlags.financialsAvailable is false), you MUST set confidence to 55 or below. You cannot make a high-confidence investment decision without verified financial data. State this explicitly in your reasoning.`;

  const userPrompt =
    `Based on the following research findings, deliver your final investment verdict for ${companyName} (${state.ticker}).\n\n` +
    `RESEARCH FINDINGS:\n\`\`\`json\n${priorAnalysis}\n\`\`\`\n\n` +
    `Synthesize all three analyses into a final INVEST or PASS decision. ` +
    `Your reasoning must explicitly connect to what each prior analysis found.`;

  try {
    const prompt = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
    const result = await invokeStructuredLLM(prompt, DecisionSchema, { temperature: 0 });

    return { decision: result };
  } catch (err) {
    console.error("[synthesize_decision] Error:", err);
    return {
      errors: [`Decision synthesis failed: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}
