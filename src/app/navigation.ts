export const navigation = [
  { id: 'today', label: 'Today' },
  { id: 'reflect', label: 'Reflect' },
  { id: 'capture', label: 'Capture' },
  { id: 'compass', label: 'Your Compass' },
] as const;

export type NavigationId = (typeof navigation)[number]['id'];
