import { PALETTES } from '../palettes.js';

export default function PaletteSwitcher({ theme, palette, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 10, background: theme.surface2, borderRadius: 14, padding: 6 }}>
      {Object.keys(PALETTES).map((key) => {
        const p = PALETTES[key];
        const active = palette === key;
        return (
          <div
            key={key}
            onClick={() => onSelect(key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: active ? theme.text : theme.textFaint,
              background: active ? theme.bg : 'transparent',
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: p.swatch }} />
            {p.label}
          </div>
        );
      })}
    </div>
  );
}
