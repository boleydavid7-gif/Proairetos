import { describe, expect, it } from 'vitest';
import { feedbackLink } from '../../app/family/feedback';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

describe('the feedback email', () => {
  it('names the app, its build and the kind of device, and nothing else', () => {
    const link = feedbackLink('Askesis', '2026-11-02T10:00:00.000Z', IPHONE);
    const url = new URL(link);
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('proairetosapp@gmail.com');
    expect(url.searchParams.get('subject')).toBe('Askesis feedback');
    expect(url.searchParams.get('body')).toBe('\n\n—\nApp: Askesis\nBuild: 2026-11-02\nDevice: iPhone');
  });

  it('leaves the build out when there is none', () => {
    const body = new URL(feedbackLink('Soma', '', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).searchParams.get('body');
    expect(body).toBe('\n\n—\nApp: Soma\nDevice: Windows computer');
  });
});
