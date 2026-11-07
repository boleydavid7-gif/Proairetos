/*
 * Things some phones can do and others cannot (Android Chrome today): read a barcode in a photo, pick a contact,
 * write an NFC tag. Each says whether it is here, so a button shows only where it works.
 */

type Detected = { rawValue: string; format: string };
type Detector = { detect: (image: ImageBitmapSource) => Promise<Detected[]> };
type DetectorClass = { new (options?: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> };

const PRODUCT_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

export function barcodesHere(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

/** The product number in a photo of a barcode, if one is found. */
export async function readBarcode(photo: Blob): Promise<string | undefined> {
  const Barcode = (window as unknown as { BarcodeDetector?: DetectorClass }).BarcodeDetector;
  if (!Barcode) return undefined;
  const supported = (await Barcode.getSupportedFormats?.().catch(() => [])) ?? [];
  const formats = PRODUCT_FORMATS.filter((format) => supported.includes(format));
  const detector = new Barcode(formats.length ? { formats } : undefined);
  const bitmap = await createImageBitmap(photo);
  try {
    return (await detector.detect(bitmap))[0]?.rawValue;
  } finally {
    bitmap.close();
  }
}

/** A product's name from Open Food Facts (only the number is sent). */
export async function productName(code: string): Promise<string | undefined> {
  if (!/^\d{8,14}$/.test(code)) return undefined;
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,quantity`);
  if (!response.ok) return undefined;
  const data = (await response.json()) as { status?: number; product?: { product_name?: string; brands?: string; quantity?: string } };
  const product = data.product;
  if (!product?.product_name?.trim()) return undefined;
  const brand = product.brands?.split(',')[0]?.trim();
  return [brand && !product.product_name.toLowerCase().includes(brand.toLowerCase()) ? brand : '', product.product_name.trim(), product.quantity?.trim()]
    .filter(Boolean)
    .join(' ');
}

type ContactsManager = { select: (properties: string[], options?: { multiple?: boolean }) => Promise<{ name?: string[]; tel?: string[]; email?: string[] }[]> };

export function contactsHere(): boolean {
  return typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;
}

/** One contact the person chooses from their phone; nothing else is read. */
export async function pickContact(): Promise<{ name?: string; phone?: string; email?: string } | undefined> {
  const contacts = (navigator as unknown as { contacts?: ContactsManager }).contacts;
  if (!contacts) return undefined;
  const [chosen] = await contacts.select(['name', 'tel', 'email'], { multiple: false });
  if (!chosen) return undefined;
  return { name: chosen.name?.[0]?.trim(), phone: chosen.tel?.[0]?.trim(), email: chosen.email?.[0]?.trim() };
}

type NdefWriter = { write: (message: { records: { recordType: string; data: string }[] }) => Promise<void> };

export function nfcHere(): boolean {
  return typeof window !== 'undefined' && 'NDEFReader' in window;
}

/** Writes a link onto an NFC tag held to the phone. Any phone that reads the tag opens the link. */
export async function writeTag(url: string): Promise<void> {
  const Reader = (window as unknown as { NDEFReader?: new () => NdefWriter }).NDEFReader;
  if (!Reader) throw new Error('This device cannot write NFC tags.');
  await new Reader().write({ records: [{ recordType: 'url', data: url }] });
}
