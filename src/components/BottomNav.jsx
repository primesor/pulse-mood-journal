export default function BottomNav({ theme, screen, onChange }) {
  const items = [
    { key: 'today', label: 'Today' },
    { key: 'trends', label: 'Trends' },
    { key: 'settings', label: 'Settings' },
  ];
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        background: theme.surface2,
        border: `1px solid ${theme.border}`,
        borderRadius: 999,
        padding: 6,
      }}
    >
      {items.map((item) => {
        const active = screen === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            style={{
              padding: '10px 20px',
              borderRadius: 999,
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              color: active ? theme.onAccentText : theme.textFaint,
              background: active ? theme.accentPrimary : 'transparent',
              transition: 'all .15s',
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
