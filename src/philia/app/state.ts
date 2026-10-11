import { collection, stored } from '../../app/family/shell';
import { defaultPeopleNotices, type PeopleNoticeChoices } from '../core/notices';
import type { Person } from '../core/people';

export type PhiliaSettings = { started: boolean; notices: PeopleNoticeChoices };

export const settings = stored<PhiliaSettings>('philia:settings', () => ({ started: false, notices: { ...defaultPeopleNotices } }));

/** One record per person, so each syncs on its own. */
export const people = collection<Person>('philia:person:');

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);
