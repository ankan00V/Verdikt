import { Annotation } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
  companyName: Annotation<string>(),
  ticker: Annotation<string | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  companyConfirmed: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),
  resolutionError: Annotation<string | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  // Raw data from sources
  financialData: Annotation<any>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  newsData: Annotation<any>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  webData: Annotation<any>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  dataFetchErrors: Annotation<Record<string, string>>({
    reducer: (state, update) => ({ ...state, ...update }),
    default: () => ({}),
  }),

  // Structured Analysis Outputs
  fundamentalsAnalysis: Annotation<any>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  sentimentAnalysis: Annotation<any>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  competitiveAnalysis: Annotation<any>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  // Final Decision
  finalDecision: Annotation<any>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
});

export type AgentStateType = typeof AgentState.State;
