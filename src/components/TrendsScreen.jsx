import { useEffect, useMemo, useState } from 'react';
import { buildChart } from '../hooks/usePulseData.js';
import { generateAIInsights, hashEntries } from '../ai.js';
import { loadAIInsightsCache, saveAIInsightsCache } from '../storage.js';

const RANGE_DAYS = { '7D': 7, '30D': 30, All: null };
const RANGE_LABEL = { '7D': 'last 7 days', '30D': 'last 30 days', All: 'all your entries' };

export default function TrendsScreen({
  theme,
  hasEnoughRealData,
  rangeSeries,
  heatmapForRange,
  tagPeriodComparison,
  insightsReal,
  apiKey,
  onSaveApiKey,
  onOpenSettings,
}) {
  const [range, setRange] = useState('7D');
  const [showInsight, setShowInsight] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [keyDraft, setKeyDraft] = useState('');

  const showEmptyState = !hasEnoughRealData;
  const showData = !showEmptyState;

  const rangeResult = useMemo(() => rangeSeries(RANGE_DAYS[range]), [range, rangeSeries]);
  const chart = useMemo(() => buildChart(rangeResult.values, rangeResult.ticks), [rangeResult]);
  const rangeEntries = rangeResult.entries;

  const heatmap = useMemo(() => heatmapForRange(RANGE_DAYS[range]), [range, heatmapForRange]);
  const tagComparison = useMemo(() => tagPeriodComparison(RANGE_DAYS[range]), [range, tagPeriodComparison]);
  const insights = aiInsights || insightsReal;
  const maxV = 5;

  async function runAI(force, keyOverride) {
    const key = keyOverride || apiKey;
    if (!key) return;
    const currentHash = hashEntries(rangeEntries);
    if (!force) {
      const cached = loadAIInsightsCache();
      if (cached && cached.hash === currentHash && cached.insights?.length) {
        setAiInsights(cached.insights);
        setAiError(null);
        return;
      }
    }
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await generateAIInsights(key, rangeEntries);
      setAiInsights(result);
      saveAIInsightsCache({ hash: currentHash, insights: result, generatedAt: Date.now() });
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  }

  function handleToggleInsight() {
    const opening = !showInsight;
    setShowInsight(opening);
    if (opening && apiKey && aiInsights === null && !aiLoading) {
      runAI(false);
    }
  }

  // Selected range changed — the currently shown AI text (if any) was generated
  // for the old range's entries, so drop it and refresh if the card is open.
  useEffect(() => {
    setAiInsights(null);
    setAiError(null);
    if (showInsight && apiKey) {
      runAI(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  function handleInlineSaveKey() {
    const key = keyDraft.trim();
    if (!key) return;
    onSaveApiKey(key);
    setKeyDraft('');
    runAI(true, key);
  }

  const heatHue = theme.heatHue;

  return (
    <div className="pulse-scroll" style={{ flex: 1, overflowY: 'auto', padding: '32px 24px 40px' }}>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: 22, color: theme.text }}>Trends</div>
      </div>

      {showEmptyState && (
        <div style={{ marginTop: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 12px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: theme.emptyOrb, marginBottom: 22 }} />
          <div style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 600, fontSize: 17, color: theme.text, marginBottom: 10 }}>
            Not much here yet
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: theme.textDim, maxWidth: 260 }}>
            Log a few days on the Today screen and your patterns will start to take shape here — a week is usually enough to see the first signals.
          </div>
        </div>
      )}

      {showData && (
        <div>
          <div style={{ display: 'flex', background: theme.surface2, borderRadius: 12, padding: 4, marginBottom: 24 }}>
            {Object.keys(RANGE_DAYS).map((r) => (
              <div
                key={r}
                onClick={() => setRange(r)}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '8px 0',
                  borderRadius: 9,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: range === r ? theme.border : 'transparent',
                  color: range === r ? theme.text : theme.textFaint,
                }}
              >
                {r}
              </div>
            ))}
          </div>

          <div style={{ background: theme.surface, borderRadius: 20, padding: '18px 16px 12px', marginBottom: 18 }}>
            <div style={{ fontSize: 12.5, color: theme.textDim, fontWeight: 600, marginBottom: 10 }}>Mood over time</div>
            {chart.pts.length > 0 ? (
              <>
                <svg viewBox="0 0 326 130" width="100%" height="120" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="chartFade" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.accentPrimary} stopOpacity="0.35" />
                      <stop offset="100%" stopColor={theme.accentPrimary} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="16" x2="326" y2="16" stroke={theme.border} strokeWidth="1" strokeDasharray="2 4" />
                  <line x1="0" y1="61" x2="326" y2="61" stroke={theme.border} strokeWidth="1" strokeDasharray="2 4" />
                  <line x1="0" y1="106" x2="326" y2="106" stroke={theme.border} strokeWidth="1" strokeDasharray="2 4" />
                  {chart.areaPath && <path d={chart.areaPath} fill="url(#chartFade)" />}
                  <path d={chart.linePath} fill="none" stroke={theme.accentPrimary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {chart.pts.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill={theme.text} />
                  ))}
                </svg>
                <div style={{ position: 'relative', height: 16, marginTop: 2 }}>
                  {chart.ticks.map((tk, i) => (
                    <span key={i} style={{ position: 'absolute', transform: 'translateX(-50%)', left: tk.leftPct, fontSize: 11, color: theme.textFaint }}>
                      {tk.label}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: theme.textFaint, padding: '20px 0' }}>Not enough entries in this range yet.</div>
            )}
          </div>

          <div style={{ background: theme.surface, borderRadius: 20, padding: '18px 16px', marginBottom: 18 }}>
            <div style={{ fontSize: 12.5, color: theme.textDim, fontWeight: 600, marginBottom: 14 }}>By day of week</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {heatmap.map((h, i) => {
                const hasVal = h.value != null;
                const norm = hasVal ? (h.value - 1) / 4 : 0;
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: hasVal
                          ? `oklch(${(28 + norm * 44).toFixed(0)}% ${(0.03 + norm * 0.1).toFixed(3)} ${heatHue})`
                          : theme.surface2,
                      }}
                    />
                    <span style={{ fontSize: 11, color: theme.textFaint }}>{h.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: theme.surface, borderRadius: 20, padding: '18px 16px', marginBottom: 18 }}>
            <div style={{ fontSize: 12.5, color: theme.textDim, fontWeight: 600, marginBottom: 2 }}>Tags &amp; mood</div>
            <div style={{ fontSize: 11, color: theme.textFaint, marginBottom: 14 }}>
              {tagComparison.currentLabel} vs {tagComparison.previousLabel}
            </div>
            {tagComparison.rows.length > 0 ? (
              tagComparison.rows.map((c) => (
                <div key={c.name} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: theme.textDim, marginBottom: 6 }}>
                    <span>{c.name}</span>
                    <span style={{ color: theme.textFaint, fontSize: 12 }}>{c.currentAvg.toFixed(1)} vs {c.previousAvg.toFixed(1)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ height: 6, borderRadius: 3, background: theme.border, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(c.currentAvg / maxV) * 100}%`, background: theme.accentPrimary, borderRadius: 3 }} />
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: theme.border, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(c.previousAvg / maxV) * 100}%`, background: theme.textFaint, borderRadius: 3 }} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 13, color: theme.textFaint }}>
                Not enough history yet to compare — tag a few entries in both this period and the one before it.
              </div>
            )}
          </div>

          <div style={{ borderRadius: 22, padding: 20, background: theme.insightBg, boxShadow: theme.insightShadow }}>
            <div onClick={handleToggleInsight} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: theme.insightOrb, flexShrink: 0 }} />
              <div style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 600, fontSize: 15.5, color: theme.insightText }}>Ask about my patterns</div>
            </div>
            {showInsight ? (
              <div style={{ fontSize: 13.5, lineHeight: 1.65, color: theme.insightBody }}>
                {aiLoading && <p style={{ margin: '0 0 10px' }}>Thinking about your {RANGE_LABEL[range]}…</p>}
                {!aiLoading && aiError && (
                  <p style={{ margin: '0 0 10px' }}>
                    {aiError}{' '}
                    <span onClick={() => runAI(true)} style={{ textDecoration: 'underline', cursor: 'pointer' }}>
                      Try again
                    </span>
                  </p>
                )}
                {!aiLoading &&
                  insights.map((p, i) => (
                    <p key={i} style={{ margin: '0 0 10px' }}>
                      {p}
                    </p>
                  ))}
                {!aiLoading && apiKey && aiInsights && !aiError && (
                  <span onClick={() => runAI(true)} style={{ fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}>
                    Regenerate
                  </span>
                )}
                {!aiLoading && !apiKey && (
                  <div style={{ marginTop: 4, paddingTop: 14, borderTop: `1px solid ${theme.border}` }}>
                    <p style={{ margin: '0 0 10px', opacity: 0.85 }}>
                      Add a free Gemini API key for deeper, AI-generated insights. Your logged moods, tags, and any notes
                      you've written get sent to Google's Gemini API to generate them — nothing else, and only when you
                      open this card.
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input
                        type="password"
                        value={keyDraft}
                        onChange={(e) => setKeyDraft(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleInlineSaveKey()}
                        placeholder="AIza..."
                        aria-label="Gemini API key"
                        style={{
                          flex: 1,
                          background: theme.surface,
                          border: `1px solid ${theme.border}`,
                          borderRadius: 10,
                          padding: '9px 12px',
                          color: theme.text,
                          fontSize: 13.5,
                          outline: 'none',
                          minWidth: 0,
                        }}
                      />
                      <button
                        onClick={handleInlineSaveKey}
                        style={{
                          padding: '9px 16px',
                          borderRadius: 10,
                          background: theme.accentPrimary,
                          color: theme.onAccentText,
                          fontFamily: "'Quicksand', sans-serif",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        Save
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>
                      Free at aistudio.google.com/apikey, or{' '}
                      <span onClick={onOpenSettings} style={{ textDecoration: 'underline', cursor: 'pointer' }}>
                        manage it in Settings
                      </span>
                      .
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div onClick={handleToggleInsight} style={{ fontSize: 13.5, color: theme.insightBody, lineHeight: 1.5, cursor: 'pointer' }}>
                Tap to see what Pulse has gently noticed in your recent entries.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
