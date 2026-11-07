export const Permissions = {
  READ_OWN_DATA: 'READ_OWN_DATA',
  WRITE_OWN_DATA: 'WRITE_OWN_DATA',
  DELETE_OWN_DATA: 'DELETE_OWN_DATA',
  EXPORT_OWN_DATA: 'EXPORT_OWN_DATA',
} as const;

export type Permission = typeof Permissions[keyof typeof Permissions];
