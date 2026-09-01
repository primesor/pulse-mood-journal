import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePulseData, buildChart } from './usePulseData.js';
import { dateKey, timeKey, saveEntries } from '../storage.js';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function entry(overrides = {}) {
  const d = overrides.at || new Date();
  return {
    id: overrides.id || `${d.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
    date: dateKey(d),
    time: timeKey(d),
    mood: 4,
    note: '',
    tags: [],
    createdAt: d.getTime(),
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('buildChart', () => {
  it('returns empty shape for zero points', () => {
    const chart = buildChart([], []);
    expect(chart.pts).toEqual([]);
    expect(chart.linePath).toBe('');
    expect(chart.areaPath).toBe('');
  });

  it('places a single point at x=0 with no area path', () => {
    const chart = buildChart([3], [[0, 'Mon']]);
    expect(chart.pts).toHaveLength(1);
    expect(chart.pts[0].x).toBe(0);
    expect(chart.areaPath).toBe('');
  });

  it('maps mood 5 above mood 1 (lower y = higher on screen)', () => {
    const chart = buildChart([1, 5], [[0, 'a'], [1, 'b']]);
    expect(chart.pts[1].y).toBeLessThan(chart.pts[0].y);
    expect(chart.areaPath).toContain('Z');
  });
});

describe('usePulseData streak', () => {
  it('is 0 with no entries', () => {
    const { result } = renderHook(() => usePulseData());
    expect(result.current.streak).toBe(0);
  });

  it('counts today when today is logged', () => {
    saveEntries([entry({ at: new Date(), mood: 4 }), entry({ at: daysAgo(1), mood: 3 })]);
    const { result } = renderHook(() => usePulseData());
    expect(result.current.streak).toBe(2);
  });

  it('counts multiple same-day entries as a single streak day', () => {
    const now = new Date();
    saveEntries([entry({ at: now, mood: 4 }), entry({ at: now, mood: 2 }), entry({ at: daysAgo(1), mood: 3 })]);
    const { result } = renderHook(() => usePulseData());
    expect(result.current.streak).toBe(2);
  });

  it('stays alive counting from yesterday when today is not yet logged', () => {
    saveEntries([entry({ at: daysAgo(1), mood: 3 }), entry({ at: daysAgo(2), mood: 4 })]);
    const { result } = renderHook(() => usePulseData());
    expect(result.current.streak).toBe(2);
  });

  it('breaks on a gap', () => {
    saveEntries([entry({ at: new Date(), mood: 4 }), entry({ at: daysAgo(2), mood: 3 })]);
    const { result } = renderHook(() => usePulseData());
    expect(result.current.streak).toBe(1);
  });
});

describe('usePulseData todayEntries', () => {
  it('returns all of today\'s entries, most recent first', () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 3600000);
    saveEntries([entry({ at: earlier, mood: 3, id: 'a' }), entry({ at: now, mood: 5, id: 'b' })]);
    const { result } = renderHook(() => usePulseData());
    expect(result.current.todayEntries.map((e) => e.id)).toEqual(['b', 'a']);
  });
});

describe('usePulseData heatmapForRange', () => {
  it('excludes entries outside the requested range', () => {
    saveEntries([entry({ at: new Date(), mood: 4 }), entry({ at: daysAgo(20), mood: 1 })]);
    const { result } = renderHook(() => usePulseData());
    const within7d = result.current.heatmapForRange(7);
    const totalCounted = within7d.filter((d) => d.value != null).length;
    expect(totalCounted).toBe(1);
  });

  it('includes everything when rangeDays is null (All)', () => {
    saveEntries([entry({ at: new Date(), mood: 4 }), entry({ at: daysAgo(20), mood: 1 })]);
    const { result } = renderHook(() => usePulseData());
    const all = result.current.heatmapForRange(null);
    const totalCounted = all.filter((d) => d.value != null).length;
    expect(totalCounted).toBe(2);
  });
});

describe('usePulseData tagPeriodComparison', () => {
  it('has no rows with no entries', () => {
    const { result } = renderHook(() => usePulseData());
    expect(result.current.tagPeriodComparison(7).rows).toEqual([]);
  });

  it('compares the current window against the equal-length window before it', () => {
    saveEntries([
      entry({ at: daysAgo(1), mood: 5, tags: ['Exercise'] }), // current 7D window
      entry({ at: daysAgo(10), mood: 3, tags: ['Exercise'] }), // previous 7D window (7-14 days ago)
    ]);
    const { result } = renderHook(() => usePulseData());
    const { rows, currentLabel, previousLabel } = result.current.tagPeriodComparison(7);
    const row = rows.find((r) => r.name === 'Exercise');
    expect(row).toBeDefined();
    expect(row.currentAvg).toBeCloseTo(5);
    expect(row.previousAvg).toBeCloseTo(3);
    expect(currentLabel).toEqual(expect.any(String));
    expect(previousLabel).toEqual(expect.any(String));
  });

  it('omits a tag with no data in one of the two windows', () => {
    saveEntries([entry({ at: daysAgo(1), mood: 5, tags: ['Exercise'] })]);
    const { result } = renderHook(() => usePulseData());
    const { rows } = result.current.tagPeriodComparison(7);
    expect(rows.find((r) => r.name === 'Exercise')).toBeUndefined();
  });

  it('splits at the chronological midpoint for the All range', () => {
    saveEntries([
      entry({ at: daysAgo(1), mood: 5, tags: ['Exercise'] }),
      entry({ at: daysAgo(30), mood: 2, tags: ['Exercise'] }),
    ]);
    const { result } = renderHook(() => usePulseData());
    const { rows } = result.current.tagPeriodComparison(null);
    const row = rows.find((r) => r.name === 'Exercise');
    expect(row).toBeDefined();
    expect(row.currentAvg).toBeCloseTo(5);
    expect(row.previousAvg).toBeCloseTo(2);
  });
});

describe('usePulseData insightsReal', () => {
  it('suggests logging more with fewer than 5 distinct days logged', () => {
    saveEntries([entry({ at: new Date(), mood: 4 })]);
    const { result } = renderHook(() => usePulseData());
    expect(result.current.insightsReal.some((s) => s.includes('Keep logging'))).toBe(true);
  });

  it('surfaces a tag observation when the gap is large enough', () => {
    saveEntries([
      entry({ at: new Date(), mood: 5, tags: ['Exercise'] }),
      entry({ at: daysAgo(1), mood: 5, tags: ['Exercise'] }),
      entry({ at: daysAgo(2), mood: 5, tags: ['Exercise'] }),
      entry({ at: daysAgo(3), mood: 2, tags: [] }),
      entry({ at: daysAgo(4), mood: 2, tags: [] }),
      entry({ at: daysAgo(5), mood: 2, tags: [] }),
    ]);
    const { result } = renderHook(() => usePulseData());
    expect(result.current.insightsReal.some((s) => s.startsWith('Exercise seems to matter'))).toBe(true);
  });
});
