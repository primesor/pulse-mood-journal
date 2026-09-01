#!/usr/bin/env node
// Standalone real-API smoke test for src/ai.js's generateAIInsights().
// Run with your own key, kept local to your terminal:
//   GEMINI_API_KEY=your-key node scripts/smoke-test-gemini.mjs

import { generateAIInsights } from '../src/ai.js';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Set GEMINI_API_KEY first, e.g.:\n  GEMINI_API_KEY=your-key node scripts/smoke-test-gemini.mjs');
  process.exit(1);
}

const sampleEntries = {
  '2026-08-13': { mood: 4, tags: ['Exercise'], note: 'Good run this morning' },
  '2026-08-14': { mood: 3, tags: ['Work'], note: 'Long day' },
  '2026-08-15': { mood: 5, tags: ['Exercise', 'Social'], note: 'Great time with friends' },
  '2026-08-16': { mood: 2, tags: ['Work'], note: '' },
  '2026-08-17': { mood: 4, tags: ['Family'], note: 'Relaxed weekend' },
};

console.log('Calling Gemini via src/ai.js generateAIInsights() with 5 sample entries...\n');

try {
  const insights = await generateAIInsights(apiKey, sampleEntries);
  console.log(`SUCCESS — received ${insights.length} paragraph(s):\n`);
  insights.forEach((p, i) => console.log(`${i + 1}. ${p}\n`));
} catch (err) {
  console.error('FAILED:', err.message);
  process.exit(1);
}
