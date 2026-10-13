/**
 * Small pieces for a person's own wind-down. The words and sources stay
 * visible, and the person chooses which pieces belong in tonight's routine.
 */
export type WindDownPieceId = 'breathing' | 'muscles' | 'body-scan' | 'park-tomorrow';

export type WindDownPiece = {
  id: WindDownPieceId;
  title: string;
  minutes: number;
  line: string;
  source: string;
};

export const WIND_DOWN_PIECES: readonly WindDownPiece[] = [
  {
    id: 'breathing',
    title: 'Slow breathing',
    minutes: 3,
    line: 'About six breaths a minute, with a longer out-breath.',
    source: 'Lehrer PM et al. Heart rate variability biofeedback. Appl Psychophysiol Biofeedback 2020;45:1–20.',
  },
  {
    id: 'muscles',
    title: 'Progressive muscle relaxation',
    minutes: 4,
    line: 'Notice each group, tense briefly, then let it soften.',
    source: 'Bernstein DA, Borkovec TD. Progressive Relaxation Training. 1973.',
  },
  {
    id: 'body-scan',
    title: 'Body scan',
    minutes: 5,
    line: 'Move attention from your feet to your face, without fixing anything.',
    source: 'Kabat-Zinn J. Full Catastrophe Living. 1990.',
  },
  {
    id: 'park-tomorrow',
    title: 'Park tomorrow',
    minutes: 3,
    line: 'Write tomorrow’s to-do list, then leave it for the morning.',
    source: 'Scullin MK et al. The effects of bedtime writing on sleep onset latency. J Exp Psychol Gen 2018;147(4):545–552.',
  },
];

export const defaultWindDown: readonly WindDownPieceId[] = ['breathing', 'body-scan', 'park-tomorrow'];

export function windDownPiece(id: WindDownPieceId): WindDownPiece {
  return WIND_DOWN_PIECES.find((piece) => piece.id === id) ?? WIND_DOWN_PIECES[0];
}

export function windDownMinutes(ids: readonly WindDownPieceId[]): number {
  return ids.reduce((total, id) => total + windDownPiece(id).minutes, 0);
}

export function windDownBounds(ids: readonly WindDownPieceId[]): readonly { id: WindDownPieceId; start: number; end: number }[] {
  let start = 0;
  return ids.map((id) => {
    const end = start + windDownPiece(id).minutes * 60;
    const bound = { id, start, end };
    start = end;
    return bound;
  });
}

export function windDownAt(seconds: number, ids: readonly WindDownPieceId[]): { id: WindDownPieceId; left: number; index: number } | undefined {
  const bounds = windDownBounds(ids);
  const index = bounds.findIndex((bound) => seconds < bound.end);
  if (index < 0) return undefined;
  return { id: bounds[index].id, left: bounds[index].end - seconds, index };
}
