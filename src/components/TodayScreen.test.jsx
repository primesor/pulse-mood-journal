import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TodayScreen from './TodayScreen.jsx';
import { PALETTES } from '../palettes.js';

const theme = PALETTES.dusk;

function setup(props = {}) {
  const onSave = vi.fn();
  const onAddCustomTag = vi.fn();
  const onDeleteEntry = vi.fn();
  render(
    <TodayScreen
      theme={theme}
      todayEntries={[]}
      streak={3}
      customTags={[]}
      onAddCustomTag={onAddCustomTag}
      onSave={onSave}
      onDeleteEntry={onDeleteEntry}
      {...props}
    />
  );
  return { onSave, onAddCustomTag, onDeleteEntry };
}

describe('TodayScreen', () => {
  it('does nothing when Save is clicked with no mood selected', async () => {
    const { onSave } = setup();
    await userEvent.click(screen.getByText('Save'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('selecting a mood then saving calls onSave with mood/note/tags', async () => {
    const { onSave } = setup();
    await userEvent.click(screen.getByText('Great'));
    await userEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith({ mood: 5, note: '', tags: [] });
  });

  it('shows Saved briefly after a successful save', async () => {
    setup();
    await userEvent.click(screen.getByText('Okay'));
    await userEvent.click(screen.getByText('Save'));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('resets mood/note/tags after saving so a new entry can be logged', async () => {
    const { onSave } = setup();
    await userEvent.click(screen.getByText('Add a note (optional)'));
    const textarea = screen.getByPlaceholderText("What's on your mind? (optional)");
    await userEvent.type(textarea, 'Slept well');
    await userEvent.click(screen.getByText('Good'));
    await userEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith({ mood: 4, note: 'Slept well', tags: [] });
    expect(screen.getByText('Add a note (optional)')).toBeInTheDocument();
    // mood was reset to null -> clicking Save again (without picking a mood) is a no-op
    await userEvent.click(screen.getByText(/Saved|Save/));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('toggles a built-in tag on and off', async () => {
    const { onSave } = setup();
    await userEvent.click(screen.getByText('Sleep'));
    await userEvent.click(screen.getByText('Low'));
    await userEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith({ mood: 1, note: '', tags: ['Sleep'] });
  });

  it('adds a custom tag via the inline input on Enter', async () => {
    const { onAddCustomTag } = setup();
    await userEvent.click(screen.getByText('+ Custom'));
    const input = screen.getByPlaceholderText('Tag name');
    await userEvent.type(input, 'Meditation{Enter}');
    expect(onAddCustomTag).toHaveBeenCalledWith('Meditation');
  });

  it('allows saving a second entry the same day (multi-entry support)', async () => {
    const { onSave } = setup();
    await userEvent.click(screen.getByText('Great'));
    await userEvent.click(screen.getByText(/^Save$/));
    await userEvent.click(screen.getByText('Low'));
    await userEvent.click(screen.getByText(/^Save(d)?$/));
    expect(onSave).toHaveBeenNthCalledWith(1, { mood: 5, note: '', tags: [] });
    expect(onSave).toHaveBeenNthCalledWith(2, { mood: 1, note: '', tags: [] });
  });

  it("lists today's logged entries with time and lets you delete one", async () => {
    const { onDeleteEntry } = setup({
      todayEntries: [
        { id: 'e1', date: '2026-08-20', time: '09:15', mood: 4, note: 'Morning walk', tags: ['Exercise'] },
        { id: 'e2', date: '2026-08-20', time: '18:30', mood: 2, note: '', tags: [] },
      ],
    });
    expect(screen.getByText("Today's entries")).toBeInTheDocument();
    expect(screen.getByText('Morning walk · Exercise')).toBeInTheDocument();
    expect(screen.getByText('9:15 AM')).toBeInTheDocument();
    expect(screen.getByText('6:30 PM')).toBeInTheDocument();
    const deleteButtons = screen.getAllByLabelText('Delete entry');
    await userEvent.click(deleteButtons[0]);
    expect(onDeleteEntry).toHaveBeenCalledWith('e1');
  });
});
