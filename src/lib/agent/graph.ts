import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentState, AgentStateType } from "./state";
import { resolveTicker } from "./nodes/resolveTicker";
import { fetchFinancials } from "./nodes/fetchFinancials";
import { fetchNews } from "./nodes/fetchNews";
import { fetchWebResearch } from "./nodes/fetchWebResearch";
import { analyzeFundamentals } from "./nodes/analyzeFundamentals";
import { analyzeSentiment } from "./nodes/analyzeSentiment";
import { analyzeCompetitivePosition } from "./nodes/analyzeCompetitivePosition";
import { synthesizeDecision } from "./nodes/synthesizeDecision";

// Define the graph structure
const workflow = new StateGraph(AgentState)
  .addNode("resolve_ticker", resolveTicker)
  .addNode("fetch_financials", fetchFinancials)
  .addNode("fetch_news", fetchNews)
  .addNode("fetch_web_research", fetchWebResearch)
  .addNode("analyze_fundamentals", analyzeFundamentals)
  .addNode("analyze_sentiment", analyzeSentiment)
  .addNode("analyze_competitive_position", analyzeCompetitivePosition)
  .addNode("synthesize_decision", synthesizeDecision)
  
  // Start node
  .addEdge(START, "resolve_ticker")
  
  // Branch out to fetching nodes if confirmed, else skip to end
  .addConditionalEdges("resolve_ticker", (state: AgentStateType) => {
    if (state.companyConfirmed) {
      return ["fetch_financials", "fetch_news", "fetch_web_research"];
    }
    return ["synthesize_decision"];
  })
  
  // From fetching to analysis
  .addEdge("fetch_financials", "analyze_fundamentals")
  .addEdge("fetch_news", "analyze_sentiment")
  .addEdge("fetch_web_research", "analyze_competitive_position")
  
  // From analysis to synthesis
  .addEdge(["analyze_fundamentals", "analyze_sentiment", "analyze_competitive_position"], "synthesize_decision")
  
  // End
  .addEdge("synthesize_decision", END);

// Compile the graph
export const investmentAgentGraph = workflow.compile();
