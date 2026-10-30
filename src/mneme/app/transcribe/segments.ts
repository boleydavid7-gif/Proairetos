// What Whisper hears, kept as timed sentences, and the note text made from them.

export type Segment = { start: number; end: number; text: string };
export type WhisperChunk = { timestamp: [number, number | null]; text: string };

// One piece's chunks, placed at the piece's start in the recording.
export function placeChunks(chunks: WhisperChunk[], offset: number, length: number): Segment[] {
  return chunks
    .map((chunk) => {
      const start = offset + (Number.isFinite(chunk.timestamp[0]) ? chunk.timestamp[0] : 0);
      const end = offset + (chunk.timestamp[1] != null && Number.isFinite(chunk.timestamp[1]) ? chunk.timestamp[1] : length);
      return { start: round(start), end: round(Math.max(start, end)), text: unloop(clean(chunk.text)) };
    })
    .filter((segment) => segment.text && !NOISE.test(segment.text));
}

const round = (value: number) => Math.round(value * 100) / 100;
const clean = (text: string) => text.replace(/\s+/g, ' ').trim();
// Whisper's way of saying it heard nothing, or only sounds.
const NOISE = /^[[(*♪-]*\s*(blank_audio|music|silence|no speech|inaudible|applause|laughter|♪+)?\s*[\])*♪-]*$/i;

// Whisper sometimes falls into a loop on the last seconds of a recording and says one phrase over and over. A phrase
// said three or more times in a row is kept once (twice in a row is left alone: people do repeat themselves).
export function unloop(text: string): string {
  const words = text.split(' ');
  for (let size = 1; size <= Math.floor(words.length / 3); size += 1) {
    for (let at = 0; at + size * 3 <= words.length; at += 1) {
      const phrase = words.slice(at, at + size).join(' ').toLowerCase().replace(/[.,!?;:]/g, '');
      let times = 1;
      while (at + size * (times + 1) <= words.length) {
        const next = words.slice(at + size * times, at + size * (times + 1)).join(' ').toLowerCase().replace(/[.,!?;:]/g, '');
        if (next !== phrase) break;
        times += 1;
      }
      if (times >= 3) return unloop([...words.slice(0, at + size), ...words.slice(at + size * times)].join(' '));
    }
  }
  return text;
}

// Paragraphs: a new one after a pause of two seconds or more, or after about five sentences.
export function transcriptText(segments: Segment[]): string {
  const paragraphs: string[][] = [];
  let current: string[] = [];
  let sentences = 0;
  segments.forEach((segment, index) => {
    const gap = index > 0 ? segment.start - segments[index - 1].end : 0;
    if (current.length && (gap >= 2 || sentences >= 5)) {
      paragraphs.push(current);
      current = [];
      sentences = 0;
    }
    current.push(segment.text);
    sentences += (segment.text.match(/[.!?](\s|$)/g) ?? []).length;
  });
  if (current.length) paragraphs.push(current);
  return paragraphs.map((words) => words.join(' ')).join('\n\n');
}

// A title from the first sentence: up to eight words, without a full stop.
export function titleFrom(text: string): string {
  const first = text.trim().split(/(?<=[.!?])\s/)[0] ?? '';
  const words = first.replace(/[.!?,;:]+$/, '').split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const short = words.slice(0, 8).join(' ');
  return words.length > 8 ? `${short}…` : short;
}

// The segment playing at a moment in the recording.
export function segmentAt(segments: Segment[], seconds: number): number {
  for (let index = segments.length - 1; index >= 0; index -= 1) if (seconds >= segments[index].start - 0.05) return index;
  return -1;
}
