import { useState } from 'react';

export default function SettingsScreen({ theme, apiKey, onSaveApiKey, onClearApiKey }) {
  const [draft, setDraft] = useState(apiKey || '');
  const [reveal, setReveal] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  function handleSave() {
    onSaveApiKey(draft.trim());
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1400);
  }

  function handleClear() {
    setDraft('');
    onClearApiKey();
  }

  return (
    <div className="pulse-scroll" style={{ flex: 1, overflowY: 'auto', padding: '32px 24px 40px' }}>
      <div style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: 22, color: theme.text, marginBottom: 6 }}>
        Settings
      </div>
      <div style={{ fontSize: 14, color: theme.textFaint, marginBottom: 28 }}>
        Connect a free Google Gemini API key for real, personalized AI insights on the Trends screen.
      </div>

      <div style={{ background: theme.surface, borderRadius: 20, padding: '18px 16px', marginBottom: 16 }}>
        <div style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 600, fontSize: 15.5, color: theme.text, marginBottom: 12 }}>
          Gemini API key
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type={reveal ? 'text' : 'password'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="AIza..."
            aria-label="Gemini API key"
            style={{
              flex: 1,
              background: theme.surface2,
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              padding: '10px 12px',
              color: theme.text,
              fontSize: 14,
              outline: 'none',
              minWidth: 0,
            }}
          />
          <button
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? 'Hide key' : 'Show key'}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: `1px solid ${theme.border}`,
              background: theme.surface2,
              color: theme.textDim,
              fontSize: 13,
            }}
          >
            {reveal ? 'Hide' : 'Show'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 12,
              background: theme.accentPrimary,
              color: theme.onAccentText,
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {savedFlash ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={handleClear}
            style={{
              padding: '12px 18px',
              borderRadius: 12,
              border: `1px solid ${theme.border}`,
              background: 'transparent',
              color: theme.textDim,
              fontSize: 14,
            }}
          >
            Clear
          </button>
        </div>

        <div style={{ fontSize: 12.5, color: theme.textFaint, marginTop: 14, lineHeight: 1.5 }}>
          Get a free key at aistudio.google.com/apikey — sign in with your Google account, no card
          required. Your key is stored only in this browser's local storage. When you tap "Ask about
          my patterns" on Trends, your logged moods, tags, and any notes you've written are sent
          directly to Google's Gemini API to generate that insight — never to any other server, and
          only at that moment.
        </div>
      </div>
    </div>
  );
}
