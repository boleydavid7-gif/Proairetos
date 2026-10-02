import type { ComponentType } from 'react';
import {
  BarsIcon,
  BowlIcon,
  FlameIcon,
  KeysIcon,
  LeafIcon,
  NoiseIcon,
  PlanetIcon,
  RainIcon,
  RiverIcon,
  StormIcon,
  TreesIcon,
  WaveIcon,
  WindIcon,
} from '../../components/icons/Icons';

export const soundIcons: Record<string, ComponentType<{ size?: number }>> = {
  rain: RainIcon,
  storm: StormIcon,
  river: RiverIcon,
  wave: WaveIcon,
  trees: TreesIcon,
  flame: FlameIcon,
  wind: WindIcon,
  noise: NoiseIcon,
  keys: KeysIcon,
  bars: BarsIcon,
  leaf: LeafIcon,
  planet: PlanetIcon,
  bowl: BowlIcon,
};
