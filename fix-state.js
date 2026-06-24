const fs = require('fs');

function replaceFile(path, replacements) {
  let content = fs.readFileSync(path, 'utf8');
  for (const {from, to} of replacements) {
    content = content.replace(from, to);
  }
  fs.writeFileSync(path, content);
}

const files = [
  'src/lib/agent/nodes/fetch-news.ts',
  'src/lib/agent/nodes/fetch-web-research.ts',
  'src/lib/agent/nodes/analyze-sentiment.ts',
  'src/lib/agent/nodes/analyze-competitive.ts',
  'src/lib/agent/nodes/synthesize-decision.ts'
];

for (const f of files) {
  replaceFile(f, [
    { from: 'state.companyName ?? state.company', to: 'state.companyName' }
  ]);
}
console.log('Fixed TypeScript errors');
