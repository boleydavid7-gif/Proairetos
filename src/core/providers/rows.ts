/** Fields with something in them; an empty field cannot match, so it is not carried. */
export const present = (...entries: { name: string; text: string | undefined }[]): { name: string; text: string }[] =>
  entries.filter((entry): entry is { name: string; text: string } => Boolean(entry.text));
