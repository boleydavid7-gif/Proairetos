/*
 * Line figures for each exercise, seen from the side, facing right: a body given by its joints (ankle, knee, hip,
 * shoulder, elbow, hand; the far leg and arm when they differ), with what it holds or uses. Each exercise has a
 * start and an end pose; the figure moves between them. The floor is at y = 94 in a 100 x 100 box.
 */

export type Point = [number, number];
export type Prop =
  | { kind: 'dumbbell'; at: 'w' | 'w2' }
  | { kind: 'barbell' }
  | { kind: 'bar' }
  | { kind: 'bench'; x1: number; x2: number; y: number }
  | { kind: 'box'; x: number; y: number; w: number; h: number }
  | { kind: 'band'; to: Point }
  | { kind: 'wall'; x: number };

export type Pose = {
  a: Point; k: Point; h: Point; s: Point; e: Point; w: Point;
  k2?: Point; a2?: Point; e2?: Point; w2?: Point;
  /** Which way the toes point: forward (default), back, up or down. */
  toe?: 'f' | 'b' | 'u' | 'd';
  props?: Prop[];
};

export type Geometry = {
  lines: [Point, Point][];
  far: [Point, Point][];
  head: { c: Point; r: number };
  props: { kind: string; points: Point[] }[];
};

const TOE: Record<string, Point> = { f: [6, 0], b: [-6, 0], u: [0, -6], d: [0, 6] };
const plus = (p: Point, q: Point): Point => [p[0] + q[0], p[1] + q[1]];

export function geometry(pose: Pose): Geometry {
  const dx = pose.s[0] - pose.h[0];
  const dy = pose.s[1] - pose.h[1];
  const length = Math.hypot(dx, dy) || 1;
  const head: Point = [pose.s[0] + (dx / length) * 8.5, pose.s[1] + (dy / length) * 8.5];
  const toe = TOE[pose.toe ?? 'f'];
  const lines: [Point, Point][] = [[pose.a, pose.k], [pose.k, pose.h], [pose.h, pose.s], [pose.s, pose.e], [pose.e, pose.w], [pose.a, plus(pose.a, toe)]];
  const far: [Point, Point][] = [];
  if (pose.k2 && pose.a2) far.push([pose.h, pose.k2], [pose.k2, pose.a2], [pose.a2, plus(pose.a2, toe)]);
  if (pose.e2 && pose.w2) far.push([pose.s, pose.e2], [pose.e2, pose.w2]);
  const props = (pose.props ?? []).map((prop) => {
    switch (prop.kind) {
      case 'dumbbell':
        return { kind: 'dumbbell', points: [prop.at === 'w2' && pose.w2 ? pose.w2 : pose.w] };
      case 'barbell':
        return { kind: 'barbell', points: [pose.s] };
      case 'bar':
        return { kind: 'bar', points: [pose.w] };
      case 'bench':
        return { kind: 'bench', points: [[prop.x1, prop.y], [prop.x2, prop.y]] as Point[] };
      case 'box':
        return { kind: 'box', points: [[prop.x, prop.y], [prop.x + prop.w, prop.y + prop.h]] as Point[] };
      case 'band':
        return { kind: 'band', points: [pose.w, prop.to] };
      case 'wall':
        return { kind: 'wall', points: [[prop.x, 16], [prop.x, 94]] as Point[] };
    }
  });
  return { lines, far, head: { c: head, r: 5.5 }, props };
}

const mix = (p: Point, q: Point, t: number): Point => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
const mixOptional = (p: Point | undefined, q: Point | undefined, t: number) => (p && q ? mix(p, q, t) : p);

/** A pose part way between two (0 = start, 1 = end). */
export function between(a: Pose, b: Pose, t: number): Pose {
  return {
    a: mix(a.a, b.a, t), k: mix(a.k, b.k, t), h: mix(a.h, b.h, t), s: mix(a.s, b.s, t), e: mix(a.e, b.e, t), w: mix(a.w, b.w, t),
    k2: mixOptional(a.k2, b.k2, t), a2: mixOptional(a.a2, b.a2, t), e2: mixOptional(a.e2, b.e2, t), w2: mixOptional(a.w2, b.w2, t),
    toe: a.toe,
    props: a.props,
  };
}

// ---------- The poses ----------

const legsUp = { a: [50, 94] as Point, k: [50, 75] as Point, h: [50, 56] as Point, s: [50, 32] as Point };
const legsDown = { a: [50, 94] as Point, k: [61, 79] as Point, h: [42, 74] as Point, s: [49, 51] as Point };
const weight: Prop[] = [{ kind: 'dumbbell', at: 'w' }];
const pair = (a: Pose, b: Pose): [Pose, Pose] => [a, { ...b, props: b.props ?? a.props }];

export const FIGURES: Record<string, [Pose, Pose]> = {
  'goblet-squat': pair({ ...legsUp, e: [55, 44], w: [57, 33], props: weight }, { ...legsDown, e: [56, 62], w: [58, 51] }),
  'back-squat': pair({ ...legsUp, e: [43, 40], w: [45, 30], props: [{ kind: 'barbell' }] }, { ...legsDown, e: [43, 59], w: [45, 49] }),
  'leg-press': pair(
    { a: [65, 52], k: [47, 58], h: [34, 72], s: [18, 55], e: [26, 66], w: [34, 74], toe: 'u', props: [{ kind: 'bench', x1: 16, x2: 44, y: 78 }, { kind: 'box', x: 66, y: 36, w: 4, h: 30 }] },
    { a: [71, 62], k: [52, 67], h: [34, 72], s: [18, 55], e: [26, 66], w: [34, 74], props: [{ kind: 'bench', x1: 16, x2: 44, y: 78 }, { kind: 'box', x: 72, y: 46, w: 4, h: 30 }] },
  ),
  'romanian-deadlift': pair({ ...legsUp, e: [51, 44], w: [52, 56], props: weight }, { a: [50, 94], k: [53, 76], h: [44, 58], s: [67, 49], e: [68, 61], w: [68, 73] }),
  'bench-press': pair(
    { a: [77, 93], k: [74, 66], h: [60, 70], s: [36, 70], e: [37, 57], w: [37, 45], props: [{ kind: 'bench', x1: 22, x2: 64, y: 75 }, { kind: 'dumbbell', at: 'w' }] },
    { a: [77, 93], k: [74, 66], h: [60, 70], s: [36, 70], e: [30, 78], w: [35, 65] },
  ),
  'floor-press': pair(
    { a: [84, 93], k: [76, 74], h: [62, 88], s: [38, 88], e: [38, 75], w: [38, 63], props: weight },
    { a: [84, 93], k: [76, 74], h: [62, 88], s: [38, 88], e: [32, 93], w: [37, 81] },
  ),
  'cable-row': pair(
    { a: [70, 90], k: [54, 80], h: [36, 86], s: [47, 64], e: [57, 72], w: [67, 74], toe: 'u', props: [{ kind: 'band', to: [95, 76] }] },
    { a: [70, 90], k: [54, 80], h: [36, 86], s: [37, 62], e: [29, 74], w: [42, 76] },
  ),
  'dumbbell-row': pair(
    { a: [36, 94], k: [37, 75], h: [36, 56], s: [60, 51], e: [58, 63], w: [58, 75], e2: [67, 60], w2: [70, 70], props: [{ kind: 'bench', x1: 62, x2: 92, y: 71 }, { kind: 'dumbbell', at: 'w' }] },
    { a: [36, 94], k: [37, 75], h: [36, 56], s: [60, 51], e: [49, 44], w: [52, 56], e2: [67, 60], w2: [70, 70] },
  ),
  'shoulder-press': pair({ ...legsUp, e: [58, 40], w: [56, 29], props: weight }, { ...legsUp, e: [53, 20], w: [53, 8] }),
  'lat-pulldown': pair(
    { a: [66, 93], k: [64, 70], h: [46, 70], s: [47, 46], e: [52, 34], w: [54, 22], props: [{ kind: 'bar' }, { kind: 'band', to: [54, 2] }, { kind: 'bench', x1: 34, x2: 58, y: 75 }] },
    { a: [66, 93], k: [64, 70], h: [46, 70], s: [46, 46], e: [44, 60], w: [55, 47] },
  ),
  'band-pulldown': pair(
    { a: [28, 93], k: [46, 92], h: [46, 72], s: [47, 48], e: [50, 36], w: [54, 24], toe: 'b', props: [{ kind: 'band', to: [56, 2] }] },
    { a: [28, 93], k: [46, 92], h: [46, 72], s: [47, 48], e: [43, 60], w: [50, 50] },
  ),
  'split-squat': pair(
    { a: [64, 94], k: [61, 76], h: [52, 58], s: [52, 34], e: [52, 46], w: [52, 57], k2: [44, 75], a2: [34, 92], props: weight },
    { a: [64, 94], k: [70, 78], h: [52, 72], s: [52, 48], e: [52, 60], w: [52, 71], k2: [42, 90], a2: [30, 92] },
  ),
  'step-up': pair(
    { a: [62, 80], k: [68, 62], h: [50, 58], s: [52, 34], e: [52, 46], w: [52, 57], k2: [49, 76], a2: [48, 94], props: [{ kind: 'box', x: 56, y: 80, w: 28, h: 14 }] },
    { a: [62, 80], k: [63, 61], h: [62, 42], s: [62, 18], e: [62, 30], w: [62, 41], k2: [57, 60], a2: [50, 76] },
  ),
  'plank': pair(
    { a: [90, 90], k: [74, 85], h: [56, 80], s: [32, 76], e: [32, 89], w: [20, 90], toe: 'd' },
    { a: [90, 90], k: [74, 84], h: [56, 78], s: [32, 76], e: [32, 89], w: [20, 90] },
  ),
  'dead-bug': pair(
    { a: [72, 70], k: [58, 70], h: [58, 88], s: [34, 88], e: [34, 76], w: [34, 64], k2: [58, 70], a2: [72, 70], e2: [34, 76], w2: [34, 64], toe: 'u' },
    { a: [90, 86], k: [74, 84], h: [58, 88], s: [34, 88], e: [24, 84], w: [12, 84], k2: [58, 70], a2: [72, 70], e2: [34, 76], w2: [34, 64] },
  ),
  'farmer-carry': pair(
    { a: [57, 94], k: [55, 75], h: [50, 56], s: [50, 32], e: [50, 45], w: [50, 57], k2: [45, 75], a2: [41, 93], props: weight },
    { a: [43, 93], k: [46, 75], h: [50, 56], s: [50, 32], e: [50, 45], w: [50, 57], k2: [55, 75], a2: [58, 94] },
  ),
};

const squatArmsForward = pair({ ...legsUp, e: [60, 34], w: [72, 34] }, { ...legsDown, e: [58, 52], w: [70, 52] });

const LADDER_FIGURES: Record<string, [Pose, Pose][]> = {
  'bw-squat': [
    pair(
      { a: [58, 93], k: [58, 70], h: [40, 70], s: [43, 46], e: [53, 52], w: [65, 52], props: [{ kind: 'bench', x1: 24, x2: 46, y: 73 }] },
      { a: [56, 94], k: [56, 75], h: [56, 56], s: [56, 32], e: [66, 36], w: [78, 36] },
    ),
    squatArmsForward,
    squatArmsForward,
    pair(
      { a: [62, 94], k: [61, 75], h: [52, 58], s: [52, 34], e: [52, 46], w: [52, 57], k2: [40, 70], a2: [30, 74], props: [{ kind: 'box', x: 12, y: 74, w: 20, h: 20 }] },
      { a: [62, 94], k: [70, 78], h: [52, 70], s: [53, 46], e: [53, 58], w: [53, 69], k2: [42, 86], a2: [30, 76] },
    ),
  ],
  'bw-hinge': [
    pair({ a: [80, 93], k: [70, 76], h: [56, 90], s: [30, 90], e: [42, 92], w: [54, 92], toe: 'f' }, { a: [80, 93], k: [72, 72], h: [56, 78], s: [30, 90], e: [42, 92], w: [54, 92] }),
    pair(
      { a: [80, 93], k: [70, 76], h: [56, 90], s: [30, 90], e: [42, 92], w: [54, 92], k2: [70, 80], a2: [86, 74] },
      { a: [80, 93], k: [72, 72], h: [56, 78], s: [30, 90], e: [42, 92], w: [54, 92], k2: [72, 70], a2: [88, 62] },
    ),
    pair(
      { a: [70, 93], k: [66, 76], h: [46, 86], s: [28, 66], e: [38, 70], w: [48, 74], props: [{ kind: 'box', x: 10, y: 66, w: 20, h: 28 }] },
      { a: [70, 93], k: [66, 68], h: [48, 68], s: [28, 66], e: [38, 70], w: [48, 70] },
    ),
  ],
  'bw-push': [
    pair(
      { a: [44, 94], k: [49, 76], h: [54, 58], s: [61, 36], e: [70, 38], w: [80, 40], props: [{ kind: 'wall', x: 82 }] },
      { a: [44, 94], k: [51, 76], h: [57, 58], s: [66, 38], e: [70, 50], w: [80, 40] },
    ),
    pair(
      { a: [16, 94], k: [30, 84], h: [43, 73], s: [70, 52], e: [71, 61], w: [72, 70], toe: 'd', props: [{ kind: 'box', x: 66, y: 70, w: 22, h: 24 }] },
      { a: [16, 94], k: [29, 86], h: [42, 78], s: [68, 62], e: [60, 64], w: [72, 70] },
    ),
    pair(
      { a: [18, 84], k: [32, 93], h: [52, 77], s: [72, 62], e: [72, 78], w: [72, 93], toe: 'u' },
      { a: [18, 84], k: [32, 93], h: [51, 86], s: [70, 80], e: [62, 84], w: [72, 93] },
    ),
    pair(
      { a: [14, 93], k: [32, 86], h: [50, 79], s: [72, 70], e: [72, 82], w: [72, 93], toe: 'd' },
      { a: [14, 93], k: [32, 90], h: [50, 87], s: [72, 84], e: [62, 86], w: [72, 93] },
    ),
    pair(
      { a: [16, 66], k: [31, 68], h: [46, 70], s: [70, 72], e: [71, 83], w: [72, 94], toe: 'd', props: [{ kind: 'box', x: 4, y: 66, w: 20, h: 28 }] },
      { a: [16, 66], k: [31, 71], h: [46, 76], s: [70, 84], e: [62, 88], w: [72, 94] },
    ),
  ],
  'bw-pull': [
    pair(
      { a: [46, 94], k: [46, 75], h: [46, 56], s: [46, 32], e: [58, 38], w: [70, 40], props: [{ kind: 'band', to: [95, 46] }] },
      { a: [46, 94], k: [46, 75], h: [46, 56], s: [46, 32], e: [36, 42], w: [46, 44] },
    ),
    pair(
      { a: [26, 94], k: [28, 75], h: [42, 72], s: [62, 68], e: [63, 55], w: [64, 42], props: [{ kind: 'bench', x1: 40, x2: 92, y: 40 }] },
      { a: [26, 94], k: [28, 75], h: [44, 64], s: [63, 48], e: [52, 46], w: [64, 42] },
    ),
    pair(
      { a: [14, 94], k: [28, 88], h: [42, 82], s: [64, 72], e: [64, 57], w: [64, 42], toe: 'u', props: [{ kind: 'bench', x1: 40, x2: 92, y: 40 }] },
      { a: [14, 94], k: [29, 84], h: [44, 74], s: [64, 58], e: [53, 52], w: [64, 42] },
    ),
  ],
  'bw-press': [
    pair(
      { a: [26, 94], k: [35, 75], h: [44, 56], s: [64, 62], e: [67, 68], w: [70, 74], props: [{ kind: 'box', x: 64, y: 74, w: 20, h: 20 }] },
      { a: [26, 94], k: [35, 75], h: [44, 56], s: [66, 70], e: [61, 70], w: [70, 74] },
    ),
    pair({ a: [24, 94], k: [32, 76], h: [42, 58], s: [62, 74], e: [66, 84], w: [70, 94] }, { a: [24, 94], k: [32, 76], h: [42, 58], s: [64, 82], e: [58, 86], w: [70, 94] }),
    pair(
      { a: [22, 72], k: [34, 60], h: [46, 48], s: [62, 70], e: [66, 82], w: [70, 94], props: [{ kind: 'box', x: 10, y: 72, w: 20, h: 22 }] },
      { a: [22, 72], k: [34, 60], h: [46, 48], s: [64, 80], e: [58, 86], w: [70, 94] },
    ),
  ],
  'bw-single': [
    pair({ ...legsUp, e: [50, 45], w: [50, 57] }, { a: [62, 94], k: [70, 78], h: [52, 72], s: [52, 48], e: [52, 60], w: [52, 71], k2: [42, 90], a2: [30, 92] }),
    [{ ...FIGURES['step-up'][0] }, { ...FIGURES['step-up'][1] }],
    [{ ...FIGURES['split-squat'][0], props: [] }, { ...FIGURES['split-squat'][1], props: [] }],
  ],
  'bw-core': [
    FIGURES['dead-bug'],
    FIGURES.plank,
    pair(
      { a: [90, 92], k: [74, 86], h: [56, 80], s: [32, 76], e: [32, 89], w: [44, 90], e2: [34, 64], w2: [36, 52], toe: 'd' },
      { a: [90, 92], k: [74, 85], h: [56, 77], s: [32, 76], e: [32, 89], w: [44, 90], e2: [34, 64], w2: [36, 52] },
    ),
  ],
};

/** The start and end poses for an exercise (at a step of its ladder), when drawn. */
export function figureFor(id: string, step = 0): [Pose, Pose] | undefined {
  const ladder = LADDER_FIGURES[id];
  if (ladder) return ladder[Math.max(0, Math.min(ladder.length - 1, step))];
  return FIGURES[id];
}
