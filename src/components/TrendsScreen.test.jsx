import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrendsScreen from './TrendsScreen.jsx';
import { PALETTES } from '../palettes.js';

vi.mock('../ai.js', () => ({
  generateAIInsights: vi.fn(),
  hashEntries: vi.fn(() => 'hash1'),
}));

import { generateAIInsights } from '../ai.js';

const theme = PALETTES.cream;

function baseProps(overrides = {}) {
  return {
    theme,
    hasEnoughRealData: false,
    rangeSeries: vi.fn(() => ({ values: [], ticks: [], entries: [] })),
    heatmapForRange: vi.fn(() => Array.from({ length: 7 }, (_, i) => ({ label: 'MTWTFSS'[i], value: null }))),
    tagPeriodComparison: vi.fn(() => ({ rows: [], currentLabel: 'Aug 14–20', previousLabel: 'Aug 7–13' })),
    insightsReal: ['Keep logging — patterns get clearer after about a week of entries.'],
    apiKey: '',
    onSaveApiKey: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TrendsScreen empty/data state', () => {
  it('shows the empty state when there is no real data', () => {
    render(<TrendsScreen {...baseProps({ hasEnoughRealData: false })} />);
    expect(screen.getByText('Not much here yet')).toBeInTheDocument();
  });

  it('shows the data view when real data exists', () => {
    render(<TrendsScreen {...baseProps({ hasEnoughRealData: true })} />);
    expect(screen.getByText('Mood over time')).toBeInTheDocument();
  });

  it('has no sample-data toggle', () => {
    render(<TrendsScreen {...baseProps({ hasEnoughRealData: true })} />);
    expect(screen.queryByText('Sample data')).not.toBeInTheDocument();
  });
});

describe('TrendsScreen range selector', () => {
  it('calls rangeSeries with the right day count when a range is clicked', async () => {
    const rangeSeries = vi.fn(() => ({ values: [3, 4], ticks: [], entries: [] }));
    render(<TrendsScreen {...baseProps({ hasEnoughRealData: true, rangeSeries })} />);
    await userEvent.click(screen.getByText('30D'));
    expect(rangeSeries).toHaveBeenCalledWith(30);
  });

  it('calls heatmapForRange and tagPeriodComparison with the same day count as the chart', async () => {
    const heatmapForRange = vi.fn(() => []);
    const tagPeriodComparison = vi.fn(() => ({ rows: [], currentLabel: 'a', previousLabel: 'b' }));
    render(<TrendsScreen {...baseProps({ hasEnoughRealData: true, heatmapForRange, tagPeriodComparison })} />);
    await userEvent.click(screen.getByText('30D'));
    expect(heatmapForRange).toHaveBeenCalledWith(30);
    expect(tagPeriodComparison).toHaveBeenCalledWith(30);
  });

  it('shows the period labels and current-vs-previous averages for tags', () => {
    const tagPeriodComparison = vi.fn(() => ({
      rows: [{ name: 'Sleep', currentAvg: 5, previousAvg: 2.6 }],
      currentLabel: 'Aug 14–20',
      previousLabel: 'Aug 7–13',
    }));
    render(<TrendsScreen {...baseProps({ hasEnoughRealData: true, tagPeriodComparison })} />);
    expect(screen.getByText('Aug 14–20 vs Aug 7–13')).toBeInTheDocument();
    expect(screen.getByText('5.0 vs 2.6')).toBeInTheDocument();
  });
});

describe('TrendsScreen insight card', () => {
  it('is collapsed by default', () => {
    render(<TrendsScreen {...baseProps({ hasEnoughRealData: true })} />);
    expect(screen.getByText(/Tap to see what Pulse/)).toBeInTheDocument();
  });

  it('falls back to rule-based insights and shows an inline key form when no API key is set', async () => {
    render(<TrendsScreen {...baseProps({ hasEnoughRealData: true, apiKey: '' })} />);
    await userEvent.click(screen.getByText('Ask about my patterns'));
    expect(screen.getByText(/Keep logging/)).toBeInTheDocument();
    expect(screen.getByLabelText('Gemini API key')).toBeInTheDocument();
    expect(generateAIInsights).not.toHaveBeenCalled();
  });

  it('saving the inline key persists it and immediately generates insights', async () => {
    const onSaveApiKey = vi.fn();
    generateAIInsights.mockResolvedValueOnce(['A genuinely personalized observation.']);
    render(<TrendsScreen {...baseProps({ hasEnoughRealData: true, apiKey: '', onSaveApiKey })} />);
    await userEvent.click(screen.getByText('Ask about my patterns'));
    await userEvent.type(screen.getByLabelText('Gemini API key'), 'AIzaSyNewKey');
    await userEvent.click(screen.getByText('Save'));
    expect(onSaveApiKey).toHaveBeenCalledWith('AIzaSyNewKey');
    expect(await screen.findByText('A genuinely personalized observation.')).toBeInTheDocument();
  });

  it('clicking "manage it in Settings" calls onOpenSettings', async () => {
    const onOpenSettings = vi.fn();
    render(<TrendsScreen {...baseProps({ hasEnoughRealData: true, apiKey: '', onOpenSettings })} />);
    await userEvent.click(screen.getByText('Ask about my patterns'));
    await userEvent.click(screen.getByText('manage it in Settings'));
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it('calls the AI and renders its result when an API key is present', async () => {
    generateAIInsights.mockResolvedValueOnce(['A genuinely personalized observation.']);
    render(
      <TrendsScreen
        {...baseProps({ hasEnoughRealData: true, apiKey: 'AIzaSyTestKey' })}
      />
    );
    await userEvent.click(screen.getByText('Ask about my patterns'));
    expect(await screen.findByText('A genuinely personalized observation.')).toBeInTheDocument();
    expect(generateAIInsights).toHaveBeenCalledTimes(1);
  });

  it('shows an error with a retry link when the AI call fails', async () => {
    generateAIInsights.mockRejectedValueOnce(new Error('That API key was rejected. Double-check it in Settings.'));
    render(<TrendsScreen {...baseProps({ hasEnoughRealData: true, apiKey: 'AIzaSyBadKey' })} />);
    await userEvent.click(screen.getByText('Ask about my patterns'));
    expect(await screen.findByText(/That API key was rejected/)).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('regenerate forces a fresh AI call', async () => {
    generateAIInsights.mockResolvedValue(['First result.']);
    render(
      <TrendsScreen
        {...baseProps({ hasEnoughRealData: true, apiKey: 'AIzaSyTestKey' })}
      />
    );
    await userEvent.click(screen.getByText('Ask about my patterns'));
    await screen.findByText('First result.');
    await userEvent.click(screen.getByText('Regenerate'));
    expect(generateAIInsights).toHaveBeenCalledTimes(2);
  });
});
