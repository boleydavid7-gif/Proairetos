import { registerPlugin } from '@capacitor/core';
import type { AskesisBridgePlugin } from './definitions';

export const AskesisBridge = registerPlugin<AskesisBridgePlugin>('AskesisBridge');

export * from './definitions';
