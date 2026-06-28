/**
 * nodes/analyze-competitive.ts
 *
 * LLM node: analyzes competitive position, moat, and market dynamics.
 *
 * Uses web research results from fetch_web_research plus company profile sector/industry
 * to assess structural competitive advantages, market position, and key risks.
 *
 * The CompetitiveSchema explicitly requests moatScore (wide/narrow/none/unclear)
 * to force the model into a concrete, defensible position rather than hedged prose.
 */

import { invokeStructuredLLM } from "../llm";
import { AgentStateType } from "../state";
import { CompetitiveSchema } from "../schemas";

// ---------------------------------------------------------------------------
// Format web research results for the prompt
// ---------------------------------------------------------------------------

function formatWebResearchContext(state: AgentStateType): string {
  const { webResearchResults, companyProfile, ticker } = state;
  const companyName = companyProfile?.name ?? state.companyName;

  if (!webResearchResults || webResearchResults.length === 0) {
    return (
      `No web research results were retrieved for ${companyName}. ` +
      "Competitive analysis will rely on company profile data only."
    );
  }

  const articles = webResearchResults
    .slice(0, 8)
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}\nSource: ${r.url}\n${r.content.slice(0, 700)}`
    )
    .join("\n\n---\n\n");

  return `WEB RESEARCH RESULTS (${webResearchResults.length} sources):\n\n${articles}`;
}

// ---------------------------------------------------------------------------
// Main node function
// ---------------------------------------------------------------------------

export async function analyzeCompetitiveNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {


  // Stagger request slightly to avoid simultaneous NIM hits (retry logic in llm.ts handles 429s)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const webContext = formatWebResearchContext(state);
  const companyName = state.companyProfile?.name ?? state.companyName;
  const profile = state.companyProfile;

  const systemPrompt =
    `You are a competitive strategy analyst specializing in equity research. ` +
    `Assess a company's competitive position, economic moat, and market dynamics. ` +
    `Be specific and evidence-based. Avoid generic statements. ` +
    `A 'wide' moat rating should only be given when there is clear evidence of durable structural advantages. ` +
    `Base your analysis primarily on the provided research — supplement with general industry knowledge where needed, ` +
    `but clearly distinguish between what the sources say and what you're inferring.`;

  const userPrompt =
    `Analyze the competitive position of ${companyName} (${state.ticker || "Private Company"}).\n\n` +
    (profile
      ? `Company Profile:\nSector: ${profile.sector}\nIndustry: ${profile.industry}\nCountry: ${profile.country}\n\n`
      : "") +
    `${webContext}\n\n` +
    `Identify the economic moat (if any), market position, key competitors, risks, and differentiators. ` +
    `Rate the moat as wide, narrow, none, or unclear with specific justification.`;

  try {
    const prompt = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
    const result = await invokeStructuredLLM(prompt, CompetitiveSchema, { temperature: 0 });

    return { competitiveAnalysis: result };
  } catch (err) {
    console.error("[analyze_competitive] Error:", err);
    return {
      competitiveAnalysis: {
        moatAssessment: "Analysis failed due to a technical error.",
        marketPosition: "Unavailable.",
        keyCompetitors: [],
        competitiveRisks: [],
        differentiators: [],
        moatScore: "unclear",
      },
      errors: [`Competitive analysis error: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}
