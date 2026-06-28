const fs = require('fs');

function replaceFile(path, replacements) {
  let content = fs.readFileSync(path, 'utf8');
  for (const {from, to} of replacements) {
    content = content.replace(from, to);
  }
  fs.writeFileSync(path, content);
}

// 1. fetch-news.ts
replaceFile('src/lib/agent/nodes/fetch-news.ts', [
  {
    from: `  if (!ticker) {\n    return { errors: ["News search skipped — no ticker resolved"] };\n  }\n\n  // Build a targeted query: use both company name and ticker for precision\n  const companyName = companyProfile?.name ?? state.companyName ?? ticker;\n  const query = \`\${companyName} \${ticker} stock news earnings 2025 2026\`;`,
    to: `  // Build a targeted query: use both company name and ticker for precision\n  const companyName = companyProfile?.name ?? state.companyName ?? state.company;\n  const query = ticker ? \`\${companyName} \${ticker} stock news earnings 2025 2026\` : \`\${companyName} company news 2025 2026\`;`
  },
  {
    from: `const searchTarget = ticker.toLowerCase();`,
    to: `const searchTarget = ticker ? ticker.toLowerCase() : companyFirstWord;`
  },
  {
    from: `console.warn(\`[fetch_news] Tavily failed for \${ticker}. Using LLM fallback via meta/llama-3.1-70b-instruct.\`);`,
    to: `console.warn(\`[fetch_news] Tavily failed for \${companyName}. Using LLM fallback via meta/llama-3.1-70b-instruct.\`);`
  },
  {
    from: `const prompt = \`Recall 3 major real-world news events, recent press releases, or major themes regarding \${ticker} from your training data. Do not make anything up.\nOutput strictly in this JSON format:\`;`,
    to: `const prompt = \`Recall 3 major real-world news events, recent press releases, or major themes regarding \${companyName} (\${ticker || "Private Company"}) from your training data. Do not make anything up.\nOutput strictly in this JSON format:\`;`
  }
]);

// 2. fetch-web-research.ts
replaceFile('src/lib/agent/nodes/fetch-web-research.ts', [
  {
    from: `  if (!ticker) {\n    return { errors: ["Web research skipped — no ticker resolved"] };\n  }\n\n  const companyName = state.companyProfile?.name ?? state.ticker ?? state.companyName;\n  const website = state.website;`,
    to: `  const companyName = state.companyProfile?.name ?? state.companyName ?? state.company;\n  const website = state.website;`
  },
  {
    from: `const query = \`What is the business model, competitive advantage, and market position of the company operating at \${website} (ticker: \${ticker}, name: "\${companyName}") in the \${sector} sector?\`;`,
    to: `const query = \`What is the business model, competitive advantage, and market position of the company operating at \${website} (name: "\${companyName}")\${ticker ? \` with ticker \${ticker}\` : ''} in the \${sector} sector?\`;`
  },
  {
    from: `const searchTarget = ticker.toLowerCase();`,
    to: `const searchTarget = ticker ? ticker.toLowerCase() : companyFirstWord;`
  },
  {
    from: `console.warn(\`[fetch_web_research] Tavily failed for \${ticker}. Using LLM fallback via meta/llama-3.1-70b-instruct.\`);`,
    to: `console.warn(\`[fetch_web_research] Tavily failed for \${companyName}. Using LLM fallback via meta/llama-3.1-70b-instruct.\`);`
  },
  {
    from: `const prompt = \`Recall actual real-world facts about the business model, competitive advantage, and market position of \${ticker} from your training data. Do not hallucinate.\nOutput strictly in this JSON format:\`;`,
    to: `const prompt = \`Recall actual real-world facts about the business model, competitive advantage, and market position of \${companyName} (\${ticker || "Private Company"}) from your training data. Do not hallucinate.\nOutput strictly in this JSON format:\`;`
  }
]);

// 3. analyze-fundamentals.ts
replaceFile('src/lib/agent/nodes/analyze-fundamentals.ts', [
  {
    from: `  if (!state.ticker) {\n    return { errors: ["Fundamentals analysis skipped — no ticker resolved"] };\n  }`,
    to: ``
  },
  {
    from: `Analyze the fundamentals and financial health of \${companyName} (\${state.ticker}).`,
    to: `Analyze the fundamentals and financial health of \${companyName} (\${state.ticker || "Private Company"}).`
  }
]);

// 4. analyze-sentiment.ts
replaceFile('src/lib/agent/nodes/analyze-sentiment.ts', [
  {
    from: `  if (!state.ticker) {\n    return { errors: ["Sentiment analysis skipped — no ticker resolved"] };\n  }`,
    to: ``
  },
  {
    from: `Analyze the sentiment and recent news momentum for \${companyName} (\${state.ticker}).`,
    to: `Analyze the sentiment and recent news momentum for \${companyName} (\${state.ticker || "Private Company"}).`
  },
  {
    from: `const companyName = companyProfile?.name ?? ticker ?? "the company";`,
    to: `const companyName = companyProfile?.name ?? state.companyName ?? state.company;`
  },
  {
    from: `No recent news articles were retrieved for \${companyName} (\${ticker}).`,
    to: `No recent news articles were retrieved for \${companyName}.`
  },
  {
    from: `const companyName = state.companyProfile?.name ?? state.ticker;`,
    to: `const companyName = state.companyProfile?.name ?? state.companyName ?? state.company;`
  }
]);

// 5. analyze-competitive.ts
replaceFile('src/lib/agent/nodes/analyze-competitive.ts', [
  {
    from: `  if (!state.ticker) {\n    return { errors: ["Competitive analysis skipped — no ticker resolved"] };\n  }`,
    to: ``
  },
  {
    from: `Analyze the competitive position of \${companyName} (\${state.ticker}).`,
    to: `Analyze the competitive position of \${companyName} (\${state.ticker || "Private Company"}).`
  },
  {
    from: `const companyName = companyProfile?.name ?? ticker ?? "the company";`,
    to: `const companyName = companyProfile?.name ?? state.companyName ?? state.company;`
  },
  {
    from: `No web research results were retrieved for \${companyName} (\${ticker}).`,
    to: `No web research results were retrieved for \${companyName}.`
  },
  {
    from: `const companyName = state.companyProfile?.name ?? state.ticker;`,
    to: `const companyName = state.companyProfile?.name ?? state.companyName ?? state.company;`
  }
]);

// 6. synthesize-decision.ts
replaceFile('src/lib/agent/nodes/synthesize-decision.ts', [
  {
    from: `  if (!state.ticker) {\n    return { errors: ["Decision synthesis skipped — no ticker resolved"] };\n  }`,
    to: ``
  },
  {
    from: `Synthesize a final investment verdict for \${companyName} (\${state.ticker}).`,
    to: `Synthesize a final investment verdict for \${companyName} (\${state.ticker || "Private Company"}).`
  },
  {
    from: `const companyName = state.companyProfile?.name ?? state.ticker;`,
    to: `const companyName = state.companyProfile?.name ?? state.companyName ?? state.company;`
  }
]);

console.log('Fixed private company handling.');
