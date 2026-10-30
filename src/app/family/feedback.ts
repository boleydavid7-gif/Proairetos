import { FEEDBACK_EMAIL } from '../siteAddress';

/** What kind of device this is, in words a person would write: only for the foot of a feedback email. */
function deviceWords(agent = typeof navigator === 'undefined' ? '' : navigator.userAgent): string {
  if (/iPhone|iPod/.test(agent)) return 'iPhone';
  if (/iPad/.test(agent) || (/Macintosh/.test(agent) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/Android/.test(agent)) return /Mobile/.test(agent) ? 'Android phone' : 'Android tablet';
  if (/Windows/.test(agent)) return 'Windows computer';
  if (/Macintosh/.test(agent)) return 'Mac';
  return 'Computer';
}

/**
 * A feedback email, ready to write: the app's name in the subject, and under a line the app, its build and the kind of
 * device, so a report says where it came from. Nothing else about the person or their records goes in.
 */
export function feedbackLink(app: string, built = typeof __BUILT_AT__ === 'string' ? __BUILT_AT__ : '', agent?: string): string {
  const day = built ? built.slice(0, 10) : '';
  const foot = ['', '', '—', `App: ${app}`, day && `Build: ${day}`, `Device: ${deviceWords(agent)}`].filter((line, index) => index < 3 || line).join('\n');
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(`${app} feedback`)}&body=${encodeURIComponent(foot)}`;
}
