const LEGACY_ENTRIES_KEY = 'pulse.entries.v1'; // old one-entry-per-day dict, migrated from
const ENTRIES_KEY = 'pulse.entries.v2'; // array of {id, date, time, mood, note, tags}
const PALETTE_KEY = 'pulse.palette.v1';
const CUSTOM_TAGS_KEY = 'pulse.customTags.v1';
const API_KEY_KEY = 'pulse.geminiApiKey.v1';
const AI_INSIGHTS_CACHE_KEY = 'pulse.aiInsightsCache.v1';

export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function timeKey(d = new Date()) {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function migrateLegacyEntries() {
  try {
    const raw = localStorage.getItem(LEGACY_ENTRIES_KEY);
    if (!raw) return [];
    const dict = JSON.parse(raw);
    const records = [];
    for (const [date, e] of Object.entries(dict)) {
      if (!e || e.mood == null) continue;
      records.push({
        id: `legacy-${date}`,
        date,
        time: null,
        mood: e.mood,
        note: e.note || '',
        tags: e.tags || [],
        createdAt: new Date(`${date}T12:00:00`).getTime(),
      });
    }
    return records;
  } catch {
    return [];
  }
}

export function loadEntries() {
  const raw = localStorage.getItem(ENTRIES_KEY);
  if (raw !== null) {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  const migrated = migrateLegacyEntries();
  saveEntries(migrated);
  return migrated;
}

export function saveEntries(entries) {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function loadPalette() {
  return localStorage.getItem(PALETTE_KEY) || 'dusk';
}

export function savePalette(key) {
  localStorage.setItem(PALETTE_KEY, key);
}

export function loadCustomTags() {
  try {
    const raw = localStorage.getItem(CUSTOM_TAGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomTags(tags) {
  localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(tags));
}

export function loadApiKey() {
  return localStorage.getItem(API_KEY_KEY) || '';
}

export function saveApiKey(key) {
  localStorage.setItem(API_KEY_KEY, key);
}

export function clearApiKey() {
  localStorage.removeItem(API_KEY_KEY);
}

export function loadAIInsightsCache() {
  try {
    const raw = localStorage.getItem(AI_INSIGHTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAIInsightsCache(cache) {
  localStorage.setItem(AI_INSIGHTS_CACHE_KEY, JSON.stringify(cache));
}
