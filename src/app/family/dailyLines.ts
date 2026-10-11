import { daysBetween } from '../../core/scheduling/dates';
import { stored } from './shell';

/*
 * One line a day for each of the newer apps, on its subject: Stoic and Buddhist days in turn, the same line all
 * day. Older translations are used where they are free to quote; a line given in paraphrase says so.
 */

export type Line = { text: string; by: string };
type Lines = { stoic: Line[]; buddhist: Line[] };

const BUDDHARAKKHITA = 'tr. Acharya Buddharakkhita';
const LONG = 'tr. George Long';

export const LINES: Record<'diaita' | 'philia' | 'ergon' | 'therapeia' | 'dynamis' | 'ktema', Lines> = {
  diaita: {
    stoic: [
      { text: 'Indulge the body only so far as is needful for good health.', by: 'Seneca, Letters 8' },
      { text: 'Provide things relating to the body no further than mere use; as meat, drink, clothing, house, family.', by: 'Epictetus, Enchiridion 33' },
      { text: 'When thou hast been compelled by circumstances to be disturbed in a manner, quickly return to thyself.', by: `Marcus Aurelius, Meditations 6.11 (${LONG})` },
      { text: 'It is not that we have a short space of time, but that we waste much of it.', by: 'Seneca, On the Shortness of Life 1' },
    ],
    buddhist: [
      { text: 'Health is the most precious gain and contentment the greatest wealth.', by: `The Buddha, Dhammapada 204 (${BUDDHARAKKHITA})` },
      { text: 'Waking up this morning, I smile. Twenty-four brand new hours are before me.', by: 'Thich Nhat Hanh, Present Moment Wonderful Moment' },
      { text: 'Breathing in, I calm my body. Breathing out, I smile.', by: 'Thich Nhat Hanh, Being Peace' },
      { text: 'Controlled in the senses, moderate in eating, and filled with faith and earnest effort.', by: `The Buddha, Dhammapada 8 (${BUDDHARAKKHITA})` },
    ],
  },
  philia: {
    stoic: [
      { text: 'If you would be loved, love.', by: 'Hecato, quoted by Seneca, Letters 9' },
      { text: 'When you have decided to admit him, welcome him with all your heart and soul.', by: 'Seneca, Letters 3' },
      { text: 'When thou wishest to delight thyself, think of the virtues of those who live with thee.', by: `Marcus Aurelius, Meditations 6.48 (${LONG})` },
      { text: 'Let us greedily enjoy our friends, because we do not know how long this privilege will be ours.', by: 'Seneca, Letters 63' },
    ],
    buddhist: [
      { text: 'Admirable friendship, admirable companionship, admirable camaraderie is actually the whole of the holy life.', by: 'The Buddha, Upaddha Sutta, SN 45.2 (tr. Thanissaro Bhikkhu)' },
      { text: 'A trustworthy person is the best kinsman.', by: `The Buddha, Dhammapada 204 (${BUDDHARAKKHITA})` },
      { text: 'The most precious gift we can give to the one we love is our true presence.', by: 'Thich Nhat Hanh, True Love' },
      { text: 'A friend who helps, a friend in good times and bad, a friend who gives good counsel, a friend who cares: these are true friends.', by: 'After the Sigalovada Sutta, DN 31 (paraphrase)' },
    ],
  },
  ergon: {
    stoic: [
      { text: 'In the morning when thou risest unwillingly, let this thought be present: I am rising to the work of a human being.', by: `Marcus Aurelius, Meditations 5.1 (${LONG})` },
      { text: 'When you are going about any action, remind yourself what nature the action is.', by: 'Epictetus, Enchiridion 4' },
      { text: 'Occupy thyself with few things, says the philosopher, if thou wouldst be tranquil.', by: `Marcus Aurelius, Meditations 4.24 (${LONG})` },
      { text: 'Do every act of thy life as if it were the last.', by: `Marcus Aurelius, Meditations 2.5 (${LONG})` },
    ],
    buddhist: [
      { text: 'Before enlightenment, chop wood, carry water. After enlightenment, chop wood, carry water.', by: 'Zen saying' },
      { text: 'A day without work is a day without food.', by: 'Baizhang Huaihai' },
      { text: 'The dishes themselves and the fact that I am here washing them are miracles!', by: 'Thich Nhat Hanh, The Miracle of Mindfulness' },
      { text: 'There are two ways to wash the dishes. The first is to wash the dishes in order to have clean dishes and the second is to wash the dishes in order to wash the dishes.', by: 'Thich Nhat Hanh, The Miracle of Mindfulness' },
    ],
  },
  therapeia: {
    stoic: [
      { text: 'It is part of the cure to wish to be cured.', by: 'Seneca, Phaedra' },
      { text: 'Sickness is an impediment to the body, but not to the will, unless itself pleases.', by: 'Epictetus, Enchiridion 9 (tr. Elizabeth Carter)' },
      { text: 'On the occasion of every pain let this thought be present, that there is no dishonour in it.', by: `Marcus Aurelius, Meditations 7.64 (${LONG})` },
      { text: 'Take away thy opinion, and then there is taken away the complaint, "I have been harmed."', by: `Marcus Aurelius, Meditations 4.7 (${LONG})` },
    ],
    buddhist: [
      { text: 'Health is the most precious gain and contentment the greatest wealth.', by: `The Buddha, Dhammapada 204 (${BUDDHARAKKHITA})` },
      { text: 'Pain may be the first arrow. The worry added to it is a second, and that one need not strike.', by: 'After the Sallatha Sutta, SN 36.6 (paraphrase)' },
      { text: 'Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor.', by: 'Thich Nhat Hanh, Stepping into Freedom' },
      { text: 'Be islands unto yourselves, refuges unto yourselves, seeking no external refuge.', by: 'The Buddha, Mahaparinibbana Sutta, DN 16 (tr. Sister Vajira and Francis Story)' },
    ],
  },
  dynamis: {
    stoic: [
      { text: 'No great thing is produced suddenly, since not even the grape or the fig is.', by: `Epictetus, Discourses 1.15 (${LONG})` },
      { text: 'Every habit and faculty is maintained and increased by the corresponding actions: the habit of walking by walking, the habit of running by running.', by: `Epictetus, Discourses 2.18 (${LONG})` },
      { text: 'There are short and simple exercises which tire the body rapidly, and so save our time.', by: 'Seneca, Letters 15' },
      { text: 'We suffer more often in imagination than in reality.', by: 'Seneca, Letters 13' },
    ],
    buddhist: [
      { text: 'Drop by drop is the water pot filled.', by: `The Buddha, Dhammapada 122 (${BUDDHARAKKHITA})` },
      { text: 'Though one may conquer a thousand times a thousand men in battle, yet he indeed is the noblest victor who conquers himself.', by: `The Buddha, Dhammapada 103 (${BUDDHARAKKHITA})` },
      { text: 'When its strings were neither too taut nor too slack, the lute was tuned and ready to play.', by: 'After the Buddha’s words to Sona, AN 6.55 (paraphrase)' },
      { text: 'Walk as if you are kissing the Earth with your feet.', by: 'Thich Nhat Hanh, Peace Is Every Step' },
    ],
  },
  ktema: {
    stoic: [
      { text: 'Never say of anything, "I have lost it"; but, "I have returned it."', by: 'Epictetus, Enchiridion 11' },
      { text: 'It is not the man who has too little, but the man who craves more, that is poor.', by: 'Seneca, Letters 2' },
      { text: 'Nothing, Lucilius, is ours, except time.', by: 'Seneca, Letters 1' },
      { text: 'Think not so much of what thou hast not as of what thou hast.', by: `Marcus Aurelius, Meditations 7.27 (${LONG})` },
      { text: 'With regard to whatever objects give you delight, are useful, or are deeply loved, remember to tell yourself of what general nature they are.', by: 'Epictetus, Enchiridion 3' },
    ],
    buddhist: [
      { text: 'Contentment is the greatest wealth.', by: `The Buddha, Dhammapada 204 (${BUDDHARAKKHITA})` },
      { text: '"I have sons, I have wealth": thus the fool worries. Indeed, when he himself is not his own, whence are sons, whence is wealth?', by: `The Buddha, Dhammapada 62 (${BUDDHARAKKHITA})` },
      { text: 'The teaching is like a raft: for crossing over, not for holding on to.', by: 'After the Alagaddupama Sutta, MN 22 (paraphrase)' },
    ],
  },
};

export type LineApp = keyof typeof LINES;

/** The day's line: Stoic and Buddhist days in turn, each going through its own list. */
export function lineOf(app: LineApp, today: string): Line {
  const day = Math.abs(daysBetween('2026-01-01', today));
  const lists = LINES[app];
  const list = day % 2 === 0 ? lists.stoic : lists.buddhist;
  return list[Math.floor(day / 2) % list.length];
}

/** Which apps show their daily line: on unless the person turns it off (synced, backed up). */
export const dailyLines = stored<{ off: LineApp[] }>('proairetos.dailyLines', () => ({ off: [] }));
