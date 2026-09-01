import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsScreen from './SettingsScreen.jsx';
import { PALETTES } from '../palettes.js';

const theme = PALETTES.cream;

describe('SettingsScreen', () => {
  it('saves the typed key', async () => {
    const onSaveApiKey = vi.fn();
    render(<SettingsScreen theme={theme} apiKey="" onSaveApiKey={onSaveApiKey} onClearApiKey={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Gemini API key'), 'AIzaSyTestKey123');
    await userEvent.click(screen.getByText('Save'));
    expect(onSaveApiKey).toHaveBeenCalledWith('AIzaSyTestKey123');
  });

  it('masks the key by default and reveals it on toggle', async () => {
    render(<SettingsScreen theme={theme} apiKey="AIzaSyTestKey123" onSaveApiKey={vi.fn()} onClearApiKey={vi.fn()} />);
    const input = screen.getByLabelText('Gemini API key');
    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByText('Show'));
    expect(input).toHaveAttribute('type', 'text');
  });

  it('clears the key', async () => {
    const onClearApiKey = vi.fn();
    render(<SettingsScreen theme={theme} apiKey="AIzaSyTestKey123" onSaveApiKey={vi.fn()} onClearApiKey={onClearApiKey} />);
    await userEvent.click(screen.getByText('Clear'));
    expect(onClearApiKey).toHaveBeenCalled();
    expect(screen.getByLabelText('Gemini API key')).toHaveValue('');
  });
});
