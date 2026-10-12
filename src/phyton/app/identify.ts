import { smallPhoto } from '../data/photos';

/** What Pl@ntNet thinks a plant is, best first, with its score from 0 to 1. */
export type Match = { score: number; latin: string; genus?: string; family?: string; common: string[] };
export type Organ = 'auto' | 'leaf' | 'flower' | 'fruit' | 'bark';

export const IDENTIFY_SOURCE = 'Identification by Pl@ntNet (plantnet.org), a research project of Cirad, INRAE, Inria and IRD. Photos are sent to it only when you tap Identify.';

/** Sends up to three photos through this site's bridge to Pl@ntNet. */
export async function identify(photos: { file: Blob; organ: Organ }[]): Promise<Match[]> {
  const form = new FormData();
  for (const { file, organ } of photos.slice(0, 3)) {
    form.append('images', await smallPhoto(file, 1280), 'plant.jpg');
    form.append('organs', organ);
  }
  let response: Response;
  try {
    response = await fetch('/api/plant', { method: 'POST', body: form });
  } catch {
    throw new Error('No connection. Try again when online.');
  }
  const data = (await response.json().catch(() => ({}))) as { matches?: Match[]; error?: string };
  if (!response.ok) throw new Error(data.error ?? 'That did not go through. Try again.');
  return data.matches ?? [];
}

/** "86%", "Under 10%". */
export const scoreText = (score: number) => (score < 0.1 ? 'Under 10%' : `${Math.round(score * 100)}%`);

// The photo used to identify a plant, held until the plant is saved so it can start the plant's photos.
let held: Blob | undefined;
export const holdPhoto = (photo: Blob | undefined) => {
  held = photo;
};
export function takeHeldPhoto(): Blob | undefined {
  const photo = held;
  held = undefined;
  return photo;
}
