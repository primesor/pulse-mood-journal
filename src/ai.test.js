import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGenerateContent, MockGoogleGenAI } = vi.hoisted(() => {
  const mockGenerateContent = vi.fn();
  class MockGoogleGenAI {
    constructor(opts) {
      MockGoogleGenAI.lastOpts = opts;
      this.models = { generateContent: mockGenerateContent };
    }
  }
  return { mockGenerateContent, MockGoogleGenAI };
});

vi.mock('@google/genai', () => ({ GoogleGenAI: MockGoogleGenAI }));

const { generateAIInsights, hashEntries, buildEntriesSummary } = await import('./ai.js');

beforeEach(() => {
  mockGenerateContent.mockReset();
  MockGoogleGenAI.lastOpts = undefined;
});

describe('buildEntriesSummary / hashEntries', () => {
  it('builds an empty summary for no entries', () => {
    expect(buildEntriesSummary([])).toBe('');
  });

  it('produces a stable hash for the same entries', () => {
    const entries = [{ date: '2026-01-01', time: '09:00', mood: 3, tags: [], note: '', createdAt: 1 }];
    expect(hashEntries(entries)).toBe(hashEntries(entries));
  });

  it('changes hash when entries change', () => {
    const h1 = hashEntries([{ date: '2026-01-01', time: '09:00', mood: 3, tags: [], note: '', createdAt: 1 }]);
    const h2 = hashEntries([{ date: '2026-01-01', time: '09:00', mood: 4, tags: [], note: '', createdAt: 1 }]);
    expect(h1).not.toBe(h2);
  });

  it('includes multiple same-day entries with their own times', () => {
    const summary = buildEntriesSummary([
      { date: '2026-01-01', time: '09:00', mood: 3, tags: [], note: '', createdAt: 1 },
      { date: '2026-01-01', time: '21:00', mood: 5, tags: [], note: '', createdAt: 2 },
    ]);
    expect(summary).toContain('2026-01-01 09:00');
    expect(summary).toContain('2026-01-01 21:00');
  });
});

describe('generateAIInsights', () => {
  const entries = [{ date: '2026-01-01', time: '10:00', mood: 4, tags: ['Exercise'], note: 'ran 5k', createdAt: 1 }];

  it('throws without calling the API when there are no logged entries', async () => {
    await expect(generateAIInsights('AIzaSyTestKey', [])).rejects.toThrow('Not enough entries');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('sends the expected request shape and parses paragraphs', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: 'Paragraph one.\n\nParagraph two.' });
    const result = await generateAIInsights('AIzaSyTestKey', entries);

    expect(MockGoogleGenAI.lastOpts).toEqual({ apiKey: 'AIzaSyTestKey' });
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3.5-flash-lite',
        contents: expect.stringContaining('Exercise'),
      })
    );
    expect(result).toEqual(['Paragraph one.', 'Paragraph two.']);
  });

  it('maps a 401 status to a friendly "key rejected" message', async () => {
    mockGenerateContent.mockRejectedValueOnce(Object.assign(new Error('unauthorized'), { status: 401 }));
    await expect(generateAIInsights('AIzaSyBadKey', entries)).rejects.toThrow('rejected');
  });

  it('maps a 429 status to a friendly rate-limit message', async () => {
    mockGenerateContent.mockRejectedValueOnce(Object.assign(new Error('slow down'), { status: 429 }));
    await expect(generateAIInsights('AIzaSyTestKey', entries)).rejects.toThrow('rate-limited');
  });

  it('maps a generic failure to a friendly connection message', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('fetch failed'));
    await expect(generateAIInsights('AIzaSyTestKey', entries)).rejects.toThrow('Could not reach Gemini');
  });
});
