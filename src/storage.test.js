import { beforeEach, describe, expect, it } from 'vitest';
import {
  dateKey,
  loadEntries,
  saveEntries,
  loadCustomTags,
  saveCustomTags,
  loadApiKey,
  saveApiKey,
  clearApiKey,
  loadAIInsightsCache,
  saveAIInsightsCache,
} from './storage.js';

beforeEach(() => {
  localStorage.clear();
});

describe('dateKey', () => {
  it('formats a date as YYYY-MM-DD, zero-padded', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dateKey(new Date(2026, 10, 22))).toBe('2026-11-22');
  });
});

describe('entries', () => {
  it('returns [] when nothing stored', () => {
    expect(loadEntries()).toEqual([]);
  });

  it('round-trips saved entries', () => {
    const entries = [{ id: '1', date: '2026-01-01', time: '09:00', mood: 4, note: 'good day', tags: ['Work'] }];
    saveEntries(entries);
    expect(loadEntries()).toEqual(entries);
  });

  it('recovers gracefully from corrupt JSON', () => {
    localStorage.setItem('pulse.entries.v2', '{not json');
    expect(loadEntries()).toEqual([]);
  });

  it('migrates legacy one-entry-per-day data on first load', () => {
    localStorage.setItem(
      'pulse.entries.v1',
      JSON.stringify({ '2026-01-01': { mood: 3, note: 'old note', tags: ['Sleep'] } })
    );
    const migrated = loadEntries();
    expect(migrated).toHaveLength(1);
    expect(migrated[0]).toMatchObject({ date: '2026-01-01', mood: 3, note: 'old note', tags: ['Sleep'] });
    // second load should not re-migrate or duplicate
    expect(loadEntries()).toHaveLength(1);
  });
});

describe('custom tags', () => {
  it('defaults to empty array', () => {
    expect(loadCustomTags()).toEqual([]);
  });

  it('round-trips saved tags', () => {
    saveCustomTags(['Reading', 'Travel']);
    expect(loadCustomTags()).toEqual(['Reading', 'Travel']);
  });
});

describe('api key', () => {
  it('defaults to empty string', () => {
    expect(loadApiKey()).toBe('');
  });

  it('round-trips a saved key', () => {
    saveApiKey('sk-ant-test123');
    expect(loadApiKey()).toBe('sk-ant-test123');
  });

  it('clears the stored key', () => {
    saveApiKey('sk-ant-test123');
    clearApiKey();
    expect(loadApiKey()).toBe('');
  });
});

describe('AI insights cache', () => {
  it('defaults to null', () => {
    expect(loadAIInsightsCache()).toBeNull();
  });

  it('round-trips a cache entry', () => {
    const cache = { hash: 'abc123', insights: ['a', 'b'], generatedAt: 123 };
    saveAIInsightsCache(cache);
    expect(loadAIInsightsCache()).toEqual(cache);
  });
});
