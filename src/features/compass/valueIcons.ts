import type { ComponentType } from 'react';
import {
  BookIcon,
  CompassIcon,
  HeartIcon,
  MountainIcon,
  ScalesIcon,
  ShieldIcon,
  SproutIcon,
  SunIcon,
} from '../../components/icons/Icons';

type IconComponent = ComponentType<{ size?: number }>;

const presetIcons: Readonly<Record<string, IconComponent>> = {
  Courage: ShieldIcon,
  Justice: ScalesIcon,
  Wisdom: BookIcon,
  Curiosity: BookIcon,
  Discipline: MountainIcon,
  Craft: MountainIcon,
  Patience: SproutIcon,
  Growth: SproutIcon,
  Health: SproutIcon,
  Family: HeartIcon,
  Friendship: HeartIcon,
  Kindness: HeartIcon,
  Generosity: HeartIcon,
  Presence: SunIcon,
  Calm: SunIcon,
};

/** A small mark for each value card; values without one get the compass. */
export function valueIcon(name: string): IconComponent {
  return presetIcons[name] ?? CompassIcon;
}
