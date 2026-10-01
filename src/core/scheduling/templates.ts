import type { ScheduleKind, ScheduleSegment } from './types';

export type ScheduleTemplate = {
  id: string;
  name: string;
  description: string;
  kind: ScheduleKind;
  /** Weekly templates must start on a Monday. */
  weekly: boolean;
  segments: ScheduleSegment[];
};

const on = (days: number, start: string, end: string, label?: string): ScheduleSegment => ({
  days,
  blocks: [{ start, end, label }],
});
const off = (days: number): ScheduleSegment => ({ days, blocks: [] });

/** Starting points only. Every value can be changed after choosing one. */
export const scheduleTemplates: ScheduleTemplate[] = [
  {
    id: 'weekly',
    name: 'Same days every week',
    description: 'Monday to Friday, 9 to 5. Change the days and hours to match yours.',
    kind: 'COMMITTED',
    weekly: true,
    segments: [...Array.from({ length: 5 }, () => on(1, '09:00', '17:00')), off(1), off(1)],
  },
  {
    id: 'three-shift-rotation',
    name: 'Days, evenings, nights',
    description: '7 days, 1 off, 7 evenings, 1 off, 7 nights, 5 off. A 28-day rotation.',
    kind: 'COMMITTED',
    weekly: false,
    segments: [
      on(7, '06:30', '14:30', 'Days'),
      off(1),
      on(7, '14:30', '22:30', 'Evenings'),
      off(1),
      on(7, '22:30', '06:30', 'Nights'),
      off(5),
    ],
  },
  {
    id: 'four-on-four-off',
    name: '4 on, 4 off',
    description: 'Four 12-hour shifts, then four days off.',
    kind: 'COMMITTED',
    weekly: false,
    segments: [on(4, '07:00', '19:00'), off(4)],
  },
  {
    id: 'two-two-three',
    name: '2-2-3',
    description: 'Twelve-hour shifts over a 14-day cycle: 2 on, 2 off, 3 on, 2 on, 2 off, 3 off.',
    kind: 'COMMITTED',
    weekly: false,
    segments: [on(2, '07:00', '19:00'), off(2), on(3, '07:00', '19:00'), off(2), on(2, '07:00', '19:00'), off(3)],
  },
  {
    id: 'protected',
    name: 'Protected time',
    description: 'Time you guard for yourself, like a morning walk or family dinner.',
    kind: 'PROTECTED',
    weekly: true,
    segments: Array.from({ length: 7 }, () => on(1, '18:00', '19:00')),
  },
  {
    id: 'blank',
    name: 'Start from scratch',
    description: 'Build any cycle of working days and days off.',
    kind: 'COMMITTED',
    weekly: false,
    segments: [on(1, '09:00', '17:00')],
  },
];
