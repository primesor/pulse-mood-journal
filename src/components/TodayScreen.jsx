import { useEffect, useRef, useState } from 'react';
import { MOODS, TAGS, orbGradient } from '../palettes.js';

function formatTime(time) {
  if (!time) return '';
  const [hh, mm] = time.split(':').map(Number);
  const period = hh >= 12 ? 'PM' : 'AM';
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, '0')} ${period}`;
}

export default function TodayScreen({ theme, todayEntries, onSave, onDeleteEntry, streak, customTags, onAddCustomTag }) {
  const [mood, setMood] = useState(null);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState(() => new Set());
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [newTagText, setNewTagText] = useState('');
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef(null);
  const savedTimer = useRef(null);

  useEffect(() => {
    if (noteExpanded && textareaRef.current) textareaRef.current.focus();
  }, [noteExpanded]);

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const allTags = [...TAGS, ...customTags];

  function toggleTag(label) {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function commitNewTag() {
    const label = newTagText.trim();
    if (label) {
      onAddCustomTag(label);
      setTags((prev) => new Set(prev).add(label));
    }
    setNewTagText('');
    setAddingTag(false);
  }

  function handleSave() {
    if (mood == null) return;
    onSave({ mood, note, tags: [...tags] });
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1400);
    setMood(null);
    setNote('');
    setTags(new Set());
    setNoteExpanded(false);
  }

  const noteDisplay = note ? note : 'Add a note (optional)';
  const noteTextColor = note ? theme.text : theme.textFaint;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div className="pulse-scroll" style={{ flex: 1, overflowY: 'auto', padding: '32px 24px 140px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: 22, color: theme.text, letterSpacing: '-0.01em' }}>
            Pulse
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: theme.surface2, borderRadius: 999, padding: '6px 12px 6px 10px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: theme.accentPrimary }} />
            <span style={{ fontSize: 12, color: theme.textDim, fontWeight: 600 }}>{streak} day streak</span>
          </div>
        </div>
        <div style={{ fontSize: 14, color: theme.textFaint, marginBottom: 32 }}>{dateStr}</div>

        <div style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 600, fontSize: 19, color: theme.text, marginBottom: 22 }}>
          How are you feeling?
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 36 }}>
          {MOODS.map((m) => {
            const selected = mood === m.v;
            const dim = mood !== null && !selected;
            return (
              <div
                key={m.v}
                onClick={() => setMood(m.v)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  opacity: dim ? 0.45 : 1,
                  transition: 'opacity .2s',
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: orbGradient(m.hue, m.chroma, m.l),
                    transform: `scale(${selected ? 1.14 : 1})`,
                    boxShadow: selected ? `0 0 0 4px oklch(${m.l}% ${m.chroma} ${m.hue} / 0.25)` : 'none',
                    transition: 'transform .18s, box-shadow .18s',
                  }}
                />
                <div style={{ fontSize: 12, color: selected ? theme.text : theme.textFaint, fontWeight: selected ? 700 : 500 }}>
                  {m.label}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginBottom: 24 }}>
          {noteExpanded ? (
            <textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => setNoteExpanded(false)}
              placeholder="What's on your mind? (optional)"
              style={{
                width: '100%',
                minHeight: 90,
                resize: 'none',
                background: theme.surface2,
                border: `1px solid ${theme.border}`,
                borderRadius: 18,
                padding: '14px 16px',
                color: theme.text,
                fontSize: 14.5,
                lineHeight: 1.5,
                outline: 'none',
              }}
            />
          ) : (
            <div
              onClick={() => setNoteExpanded(true)}
              style={{
                cursor: 'pointer',
                background: theme.surface2,
                border: `1px solid ${theme.border}`,
                borderRadius: 18,
                padding: '14px 16px',
                fontSize: 14.5,
                color: noteTextColor,
                whiteSpace: 'pre-wrap',
              }}
            >
              {noteDisplay}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
          {allTags.map((label) => {
            const selected = tags.has(label);
            return (
              <div
                key={label}
                onClick={() => toggleTag(label)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  border: `1px solid ${selected ? theme.accentPrimary : theme.border}`,
                  background: selected ? theme.surface2 : 'transparent',
                  color: selected ? theme.text : theme.textDim,
                  transition: 'all .15s',
                }}
              >
                {label}
              </div>
            );
          })}
          {addingTag ? (
            <input
              autoFocus
              value={newTagText}
              onChange={(e) => setNewTagText(e.target.value)}
              onBlur={commitNewTag}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitNewTag();
                if (e.key === 'Escape') { setNewTagText(''); setAddingTag(false); }
              }}
              placeholder="Tag name"
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                fontSize: 13.5,
                border: `1px dashed ${theme.border}`,
                background: 'transparent',
                color: theme.text,
                outline: 'none',
                width: 110,
              }}
            />
          ) : (
            <div
              onClick={() => setAddingTag(true)}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                fontSize: 13.5,
                cursor: 'pointer',
                border: `1px dashed ${theme.border}`,
                background: 'transparent',
                color: theme.textDim,
              }}
            >
              + Custom
            </div>
          )}
        </div>

        {todayEntries.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 12.5,
                color: theme.textFaint,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Today's entries
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayEntries.map((e) => {
                const m = MOODS.find((mm) => mm.v === e.mood);
                const detail = [e.note, e.tags?.length ? e.tags.join(', ') : null].filter(Boolean).join(' · ');
                return (
                  <div
                    key={e.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: theme.surface2,
                      borderRadius: 14,
                      padding: '10px 12px',
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: m ? orbGradient(m.hue, m.chroma, m.l) : theme.border,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{m?.label}</span>
                        <span style={{ fontSize: 11.5, color: theme.textFaint }}>{formatTime(e.time)}</span>
                      </div>
                      {detail && (
                        <div
                          style={{
                            fontSize: 12,
                            color: theme.textDim,
                            marginTop: 2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {detail}
                        </div>
                      )}
                    </div>
                    <div
                      onClick={() => onDeleteEntry(e.id)}
                      aria-label="Delete entry"
                      style={{ cursor: 'pointer', color: theme.textFaint, fontSize: 18, lineHeight: 1, padding: 4, flexShrink: 0 }}
                    >
                      ×
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 24px 30px', background: theme.saveFade }}>
        <div
          onClick={handleSave}
          style={{
            height: 52,
            borderRadius: 26,
            background: theme.accentPrimary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: mood == null ? 'default' : 'pointer',
            opacity: mood == null ? 0.5 : 1,
            transition: 'background 0.2s, opacity .2s',
          }}
        >
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: 16, color: theme.onAccentText }}>
            {saved ? 'Saved' : 'Save'}
          </span>
        </div>
      </div>
    </div>
  );
}
