import { apiUrl } from '../../app/apiBase';
import type { Found } from '../../core/ocr/labels';
import { knownStoreName } from '../../core/ocr/stores';

/** Sends a receipt only after the person explicitly chooses the online reader. */
export async function readReceiptOnline(file: File): Promise<Found[]> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(apiUrl('/api/receipt'), { method: 'POST', body: form });
  const body = (await response.json()) as { error?: string; merchant?: string; total?: number; date?: string; currency?: string; tax?: number };
  if (!response.ok) throw new Error(body.error ?? 'The online receipt reader could not read that photo.');
  const found: Found[] = [];
  const merchant = body.merchant ? knownStoreName(body.merchant) : undefined;
  if (merchant) found.push({ key: 'name', label: 'Name', value: merchant });
  if (typeof body.total === 'number' && Number.isFinite(body.total)) found.push({ key: 'amount', label: 'Amount', value: body.total.toFixed(2) });
  if (body.date) found.push({ key: 'date', label: 'Date', value: body.date });
  if (body.currency) found.push({ key: 'currency', label: 'Currency', value: body.currency });
  return found;
}
