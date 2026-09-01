import { GoogleGenAI } from '@google/genai';
import { MOODS } from './palettes.js';

const MODEL = 'gemini-3.5-flash-lite';

function moodLabel(v) {
  return MOODS.find((m) => m.v === v)?.label ?? String(v);
}

export function buildEntriesSummary(entries) {
  const sorted = entries
    .filter((e) => e?.mood)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    .slice(-40);
  return sorted
    .map((e) => {
      const when = e.time ? `${e.date} ${e.time}` : e.date;
      const parts = [`${when}: mood ${e.mood}/5 (${moodLabel(e.mood)})`];
      if (e.tags?.length) parts.push(`tags: ${e.tags.join(', ')}`);
      if (e.note) parts.push(`note: "${e.note}"`);
      return parts.join(' | ');
    })
    .join('\n');
}

// Small stable hash (djb2) so we can detect when the underlying entries
// changed without storing the whole summary as the cache key.
export function hashEntries(entries) {
  const summary = buildEntriesSummary(entries);
  let hash = 5381;
  for (let i = 0; i < summary.length; i++) {
    hash = (hash * 33) ^ summary.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export async function generateAIInsights(apiKey, entries) {
  const summary = buildEntriesSummary(entries);
  if (!summary) {
    throw new Error('Not enough entries yet to generate insights.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt =
    'You are a gentle, observational assistant inside a personal mood journal app called Pulse. ' +
    "You'll be given a user's mood log (1-5 scale) with timestamps, tags, and optional private notes — " +
    'some days may have more than one entry, logged at different times. ' +
    'Write 2-4 short paragraphs of genuinely personalized observations about patterns in their data. ' +
    'Be warm, specific, and non-clinical — never diagnose, never give medical advice, and use phrasing like ' +
    '"worth noticing, no pressure to act on it" when it fits. Reference their actual tags/notes/dates/times where relevant. ' +
    'Separate each paragraph with a single blank line. Do not use headers, bullet points, or a preamble — just the paragraphs.\n\n' +
    `Here is my mood log for my last ${summary.split('\n').length} logged entries:\n\n${summary}`;

  let response;
  try {
    response = await ai.models.generateContent({ model: MODEL, contents: prompt });
  } catch (err) {
    const status = err?.status;
    if (status === 400 || status === 401 || status === 403) {
      throw new Error('That API key was rejected. Double-check it in Settings.');
    }
    if (status === 429) {
      throw new Error("You're being rate-limited — try again in a bit.");
    }
    throw new Error('Could not reach Gemini — check your connection and try again.');
  }

  const text = (response.text || '').trim();
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return paragraphs.length ? paragraphs : [text];
}
