import type { ComponentType } from 'react';
import { BulbIcon, CloudIcon, HeartIcon, NoteIcon } from '../../components/icons/Icons';
import type { CaptureKind } from '../../core/life-items/types';

export type CaptureKindOption = {
  id: CaptureKind;
  label: string;
  /** Shown as the placeholder: a way in, never a required format. */
  prompt: string;
  icon: ComponentType<{ size?: number }>;
};

export const captureKinds: readonly CaptureKindOption[] = [
  { id: 'THOUGHT', label: 'Thought', prompt: 'I need to remember…', icon: NoteIcon },
  { id: 'EMOTION', label: 'Emotion', prompt: 'I’m feeling…', icon: HeartIcon },
  { id: 'CONCERN', label: 'Concern', prompt: 'I’m worried about…', icon: CloudIcon },
  { id: 'IDEA', label: 'Idea', prompt: 'An idea for later…', icon: BulbIcon },
];

export const captureKindLabel = (kind: CaptureKind | undefined) => captureKinds.find((k) => k.id === kind)?.label;
