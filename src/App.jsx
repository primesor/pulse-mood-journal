import { useEffect, useState } from 'react';
import PaletteSwitcher from './components/PaletteSwitcher.jsx';
import BottomNav from './components/BottomNav.jsx';
import TodayScreen from './components/TodayScreen.jsx';
import TrendsScreen from './components/TrendsScreen.jsx';
import SettingsScreen from './components/SettingsScreen.jsx';
import { PALETTES } from './palettes.js';
import { usePulseData } from './hooks/usePulseData.js';

export default function App() {
  const [screen, setScreen] = useState('today');
  const {
    todayEntries,
    addEntry,
    deleteEntry,
    streak,
    palette,
    setPalette,
    customTags,
    addCustomTag,
    apiKey,
    setApiKey,
    hasEnoughRealData,
    rangeSeries,
    heatmapForRange,
    tagPeriodComparison,
    insightsReal,
  } = usePulseData();

  const theme = PALETTES[palette];

  useEffect(() => {
    document.body.style.background = theme.page;
  }, [theme]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        padding: '32px 16px 48px',
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      <PaletteSwitcher theme={theme} palette={palette} onSelect={setPalette} />

      <div
        style={{
          width: '100%',
          maxWidth: 430,
          minHeight: 700,
          borderRadius: 32,
          background: theme.bg,
          boxShadow: `0 30px 60px rgba(0,0,0,0.35), 0 0 0 1px ${theme.border}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {screen === 'today' && (
          <TodayScreen
            theme={theme}
            todayEntries={todayEntries}
            streak={streak}
            customTags={customTags}
            onAddCustomTag={addCustomTag}
            onSave={addEntry}
            onDeleteEntry={deleteEntry}
          />
        )}
        {screen === 'trends' && (
          <TrendsScreen
            theme={theme}
            palette={palette}
            hasEnoughRealData={hasEnoughRealData}
            rangeSeries={rangeSeries}
            heatmapForRange={heatmapForRange}
            tagPeriodComparison={tagPeriodComparison}
            insightsReal={insightsReal}
            apiKey={apiKey}
            onSaveApiKey={setApiKey}
            onOpenSettings={() => setScreen('settings')}
          />
        )}
        {screen === 'settings' && (
          <SettingsScreen theme={theme} apiKey={apiKey} onSaveApiKey={setApiKey} onClearApiKey={() => setApiKey('')} />
        )}
      </div>

      <BottomNav theme={theme} screen={screen} onChange={setScreen} />
    </div>
  );
}
