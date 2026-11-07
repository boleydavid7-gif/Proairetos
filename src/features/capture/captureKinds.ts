import type { ComponentType } from 'react';
import { BulbIcon, CheckIcon, CloudIcon, HeartIcon, NoteIcon } from '../../components/icons/Icons';
import { itemKinds, type ItemKind } from '../../core/life-items/kinds';

const icons: Record<ItemKind, ComponentType<{ size?: number }>> = {
  TODO: CheckIcon,
  REMEMBER: NoteIcon,
  CONCERN: CloudIcon,
  IDEA: BulbIcon,
  FEELING: HeartIcon,
};

/** The kinds as Capture shows them, each with a way in. Never a required format. */
export const captureKinds = itemKinds.map((kind) => ({ ...kind, icon: icons[kind.id] }));
