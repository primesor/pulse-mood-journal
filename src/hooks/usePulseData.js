import { useCallback, useMemo, useState } from 'react';
import {
  dateKey,
  timeKey,
  loadApiKey,
  loadCustomTags,
  loadEntries,
  saveApiKey,
  saveCustomTags,
  saveEntries,
  clearApiKey,
} from '../storage.js';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatTime12h(time) {
  if (!time) return '';
  const [hh, mm] = time.split(':').map(Number);
  const period = hh >= 12 ? 'PM' : 'AM';
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, '0')} ${period}`;
}

function shortDateTimeLabel(entry) {
  const datePart = parseDateKey(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timePart = formatTime12h(entry.time);
  return timePart ? `${datePart}, ${timePart}` : datePart;
}

export function buildChart(values, ticksRaw) {
  const w = 326, h = 110, padTop = 8, padBottom = 8;
  const n = values.length;
  if (n === 0) return { pts: [], linePath: '', areaPath: '', ticks: [] };
  const stepX = n > 1 ? w / (n - 1) : 0;
  const pts = values.map((v, i) => ({
    x: i * stepX,
    y: padTop + (1 - (v - 1) / 4) * (h - padTop - padBottom),
  }));
  const linePath = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
  const areaPath = n > 1 ? linePath + ` L ${pts[pts.length - 1].x.toFixed(1)},${h} L 0,${h} Z` : '';
  const ticks = ticksRaw.map(([idx, label]) => ({ label, leftPct: ((idx * stepX) / w) * 100 + '%' }));
  return { pts, linePath, areaPath, ticks };
}

export function usePulseData() {
  const [entries, setEntries] = useState(() => loadEntries());
  const [customTags, setCustomTags] = useState(() => loadCustomTags());
  const [apiKey, setApiKeyState] = useState(() => loadApiKey());

  const setApiKey = useCallback((key) => {
    setApiKeyState(key);
    if (key) saveApiKey(key);
    else clearApiKey();
  }, []);

  const addCustomTag = useCallback((label) => {
    setCustomTags((prev) => {
      if (prev.includes(label)) return prev;
      const next = [...prev, label];
      saveCustomTags(next);
      return next;
    });
  }, []);

  const addEntry = useCallback((patch) => {
    const now = new Date();
    const record = {
      id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      date: dateKey(now),
      time: timeKey(now),
      mood: patch.mood,
      note: patch.note || '',
      tags: patch.tags || [],
      createdAt: now.getTime(),
    };
    setEntries((prev) => {
      const next = [...prev, record];
      saveEntries(next);
      return next;
    });
  }, []);

  const deleteEntry = useCallback((id) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveEntries(next);
      return next;
    });
  }, []);

  const todayKey = dateKey();

  const todayEntries = useMemo(
    () => entries.filter((e) => e.date === todayKey).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [entries, todayKey]
  );

  const loggedDateSet = useMemo(() => new Set(entries.map((e) => e.date)), [entries]);

  const streak = useMemo(() => {
    const hasToday = loggedDateSet.has(todayKey);
    let cursor = new Date();
    if (!hasToday) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (loggedDateSet.has(dateKey(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [loggedDateSet, todayKey]);

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)),
    [entries]
  );

  const rangeSeries = useCallback(
    (rangeDays) => {
      const cutoff = rangeDays ? Date.now() - rangeDays * 86400000 : -Infinity;
      const inRange = sortedEntries.filter((e) => (e.createdAt || 0) >= cutoff);
      const values = inRange.map((e) => e.mood);
      const n = inRange.length;
      const tickIdx = n <= 1 ? [0] : [0, Math.floor((n - 1) / 3), Math.floor(((n - 1) * 2) / 3), n - 1];
      const uniqueIdx = [...new Set(tickIdx)].filter((i) => i >= 0 && i < n);
      const ticks = uniqueIdx.map((i) => [i, shortDateTimeLabel(inRange[i])]);
      return { entries: inRange, values, ticks };
    },
    [sortedEntries]
  );

  // Range-scoped "by day of week" — only counts entries within the selected window,
  // so it agrees with the chart and AI insights about what "7D"/"30D"/"All" means.
  const heatmapForRange = useCallback(
    (rangeDays) => {
      const cutoff = rangeDays ? Date.now() - rangeDays * 86400000 : -Infinity;
      const sums = new Array(7).fill(0);
      const counts = new Array(7).fill(0);
      for (const e of entries) {
        if ((e.createdAt || 0) < cutoff) continue;
        const dow = parseDateKey(e.date).getDay();
        sums[dow] += e.mood;
        counts[dow] += 1;
      }
      return MONDAY_FIRST.map((dow) => ({
        label: WEEKDAY_LABELS[dow],
        value: counts[dow] ? sums[dow] / counts[dow] : null,
      }));
    },
    [entries]
  );

  // Period-over-period tag trend: for the selected range, compare each tag's average
  // mood in the current window against the equal-length window immediately before it
  // (e.g. 7D: this week vs the 7 days before that). For "All" (no fixed window), split
  // the full history at its chronological midpoint instead.
  const tagPeriodComparison = useCallback(
    (rangeDays) => {
      const allTags = new Set([...['Sleep', 'Work', 'Social', 'Exercise', 'Family'], ...customTags]);
      const fmtDate = (ms) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      let currentEntries, previousEntries, currentLabel, previousLabel;

      if (rangeDays) {
        const now = Date.now();
        const rangeMs = rangeDays * 86400000;
        currentEntries = entries.filter((e) => now - (e.createdAt || 0) <= rangeMs);
        previousEntries = entries.filter((e) => {
          const age = now - (e.createdAt || 0);
          return age > rangeMs && age <= rangeMs * 2;
        });
        currentLabel = `${fmtDate(now - rangeMs)}–${fmtDate(now)}`;
        previousLabel = `${fmtDate(now - rangeMs * 2)}–${fmtDate(now - rangeMs)}`;
      } else if (entries.length > 0) {
        const sorted = [...entries].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        const oldest = sorted[0].createdAt || 0;
        const newest = sorted[sorted.length - 1].createdAt || 0;
        const midpoint = (oldest + newest) / 2;
        currentEntries = sorted.filter((e) => (e.createdAt || 0) >= midpoint);
        previousEntries = sorted.filter((e) => (e.createdAt || 0) < midpoint);
        currentLabel = 'Recent half';
        previousLabel = 'Earlier half';
      } else {
        currentEntries = [];
        previousEntries = [];
        currentLabel = 'Recent';
        previousLabel = 'Earlier';
      }

      const rows = [];
      for (const tag of allTags) {
        const curTagged = currentEntries.filter((e) => e.tags?.includes(tag));
        const prevTagged = previousEntries.filter((e) => e.tags?.includes(tag));
        if (curTagged.length > 0 && prevTagged.length > 0) {
          rows.push({
            name: tag,
            currentAvg: curTagged.reduce((s, e) => s + e.mood, 0) / curTagged.length,
            previousAvg: prevTagged.reduce((s, e) => s + e.mood, 0) / prevTagged.length,
          });
        }
      }
      rows.sort((a, b) => Math.abs(b.currentAvg - b.previousAvg) - Math.abs(a.currentAvg - a.previousAvg));

      return { rows, currentLabel, previousLabel };
    },
    [entries, customTags]
  );

  // All-time with/without-tag and weekday/weekend comparisons, kept only to drive the
  // free rule-based insight text (not shown as raw numbers anywhere in the UI).
  const allTimeHeatmap = useMemo(() => heatmapForRange(null), [heatmapForRange]);

  const allTimeCorrelations = useMemo(() => {
    const allTags = new Set([...['Sleep', 'Work', 'Social', 'Exercise', 'Family'], ...customTags]);
    const rows = [];
    for (const tag of allTags) {
      let withSum = 0, withCount = 0, withoutSum = 0, withoutCount = 0;
      for (const e of entries) {
        if (e.tags?.includes(tag)) { withSum += e.mood; withCount += 1; }
        else { withoutSum += e.mood; withoutCount += 1; }
      }
      if (withCount > 0 && withoutCount > 0) {
        rows.push({ name: tag, withAvg: withSum / withCount, withoutAvg: withoutSum / withoutCount });
      }
    }
    return rows.sort((a, b) => (b.withAvg - b.withoutAvg) - (a.withAvg - a.withoutAvg));
  }, [entries, customTags]);

  const insightsReal = useMemo(() => {
    const out = [];
    if (allTimeCorrelations.length > 0) {
      const top = allTimeCorrelations[0];
      if (top.withAvg - top.withoutAvg >= 0.3) {
        out.push(
          `${top.name} seems to matter — days with it logged average ${top.withAvg.toFixed(1)}, versus ${top.withoutAvg.toFixed(1)} without.`
        );
      }
    }
    const weekday = allTimeHeatmap.slice(0, 5).filter((d) => d.value != null);
    const weekend = allTimeHeatmap.slice(5).filter((d) => d.value != null);
    if (weekday.length && weekend.length) {
      const wdAvg = weekday.reduce((s, d) => s + d.value, 0) / weekday.length;
      const weAvg = weekend.reduce((s, d) => s + d.value, 0) / weekend.length;
      if (Math.abs(wdAvg - weAvg) >= 0.2) {
        out.push(
          weAvg > wdAvg
            ? 'Weekends read calmer than weekdays so far, based on what you’ve logged.'
            : 'Weekdays have been trending a touch higher than weekends recently.'
        );
      }
    }
    if (loggedDateSet.size < 5) {
      out.push('Keep logging — patterns get clearer after about a week of entries.');
    }
    return out;
  }, [allTimeCorrelations, allTimeHeatmap, loggedDateSet]);

  const hasEnoughRealData = entries.length > 0;

  return {
    entries,
    todayKey,
    todayEntries,
    addEntry,
    deleteEntry,
    streak,
    customTags,
    addCustomTag,
    apiKey,
    setApiKey,
    hasEnoughRealData,
    rangeSeries,
    heatmapForRange,
    tagPeriodComparison,
    insightsReal,
  };
}
