import { geometry, type Geometry, type Pose } from './figures';

/** The drawing of a pose as SVG markup (also used for the sheet of all figures while drawing them). */
export function figureMarkup(pose: Pose, ink = 'currentColor', accent = 'currentColor'): string {
  return parts(geometry(pose), ink, accent);
}

const f = (n: number) => n.toFixed(1);

export function parts(shape: Geometry, ink: string, accent: string): string {
  const line = ([a, b]: [number[], number[]], width = 4.2, opacity = 1) => `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${ink}" stroke-width="${width}" stroke-linecap="round" opacity="${opacity}"/>`;
  const props = shape.props
    .map((prop) => {
      const [p, q] = prop.points;
      switch (prop.kind) {
        case 'dumbbell':
          return `<rect class="fig-accent" x="${f(p[0] - 4.5)}" y="${f(p[1] - 2.2)}" width="9" height="4.4" rx="1.6" fill="${accent}"/>`;
        case 'barbell':
          return `<circle class="fig-accent" cx="${f(p[0] - 2)}" cy="${f(p[1] - 1)}" r="6.5" fill="none" stroke="${accent}" stroke-width="2.6"/>`;
        case 'bar':
          return `<line class="fig-accent" x1="${f(p[0] - 10)}" y1="${f(p[1])}" x2="${f(p[0] + 10)}" y2="${f(p[1])}" stroke="${accent}" stroke-width="2.6" stroke-linecap="round"/>`;
        case 'bench':
          return `<line x1="${f(p[0])}" y1="${f(p[1])}" x2="${f(q[0])}" y2="${f(q[1])}" stroke="${ink}" stroke-width="3" stroke-linecap="round" opacity="0.4"/><line x1="${f((p[0] + q[0]) / 2)}" y1="${f(p[1])}" x2="${f((p[0] + q[0]) / 2)}" y2="94" stroke="${ink}" stroke-width="2.4" opacity="0.4"/>`;
        case 'box':
          return `<rect x="${f(p[0])}" y="${f(p[1])}" width="${f(q[0] - p[0])}" height="${f(q[1] - p[1])}" rx="1.5" fill="none" stroke="${ink}" stroke-width="2.4" opacity="0.4"/>`;
        case 'band':
          return `<line class="fig-accent" x1="${f(p[0])}" y1="${f(p[1])}" x2="${f(q[0])}" y2="${f(q[1])}" stroke="${accent}" stroke-width="1.6" stroke-dasharray="3 2.4"/>`;
        case 'wall':
          return `<line x1="${f(p[0])}" y1="${f(p[1])}" x2="${f(q[0])}" y2="${f(q[1])}" stroke="${ink}" stroke-width="3" opacity="0.4"/>`;
        default:
          return '';
      }
    })
    .join('');
  return [
    `<line x1="4" y1="96.5" x2="96" y2="96.5" stroke="${ink}" stroke-width="1.4" opacity="0.25"/>`,
    props,
    shape.far.map((each) => line(each as [number[], number[]], 3.6, 0.45)).join(''),
    shape.lines.map((each) => line(each as [number[], number[]])).join(''),
    `<circle cx="${f(shape.head.c[0])}" cy="${f(shape.head.c[1])}" r="${shape.head.r}" fill="${ink}"/>`,
  ].join('');
}
