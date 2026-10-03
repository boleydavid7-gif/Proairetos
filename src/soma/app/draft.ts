import type { RecipeDraft } from '../core/recipes';

/** A recipe brought in but not yet kept: Import and Ideas hand it to the edit page to look over. */
let pending: RecipeDraft | undefined;

export function holdDraft(draft: RecipeDraft): void {
  pending = draft;
}

export function takeDraft(): RecipeDraft | undefined {
  const draft = pending;
  pending = undefined;
  return draft;
}

/** A photo from the phone, made small enough to keep (1200 px, JPEG). */
export function shrinkPhoto(file: File, longest = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, longest / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That photo could not be read.'));
    };
    image.src = url;
  });
}
