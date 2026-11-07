import { tooOften } from './safeFetch';

export type ReceiptEnv = { AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT?: string; AZURE_DOCUMENT_INTELLIGENCE_KEY?: string };
const MAX_RECEIPT_BYTES = 8_000_000;

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer' } });
}

type AzureField = { valueString?: string; valueDate?: string; valueNumber?: number; valueCurrency?: { amount?: number; currencyCode?: string } };
type AzureResult = { status?: string; analyzeResult?: { documents?: { fields?: Record<string, AzureField> }[] } };

function reduced(data: AzureResult) {
  const fields = data.analyzeResult?.documents?.[0]?.fields ?? {};
  const merchant = fields.MerchantName?.valueString?.trim();
  const date = fields.TransactionDate?.valueDate?.trim();
  const totalField = fields.Total;
  const total = totalField?.valueCurrency?.amount ?? totalField?.valueNumber;
  const currency = totalField?.valueCurrency?.currencyCode ?? fields.CurrencyCode?.valueString?.trim();
  const tax = fields.TotalTax?.valueCurrency?.amount ?? fields.TotalTax?.valueNumber;
  return { merchant, date, total: typeof total === 'number' && Number.isFinite(total) ? total : undefined, currency, tax: typeof tax === 'number' && Number.isFinite(tax) ? tax : undefined };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function handleReceiptRequest(request: Request, env: ReceiptEnv, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return reply(405, { error: 'Not allowed' });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return reply(403, { error: 'Not allowed' });
  if (!env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || !env.AZURE_DOCUMENT_INTELLIGENCE_KEY) return reply(503, { error: 'Online receipt reading is not configured.' });
  if (tooOften(request)) return reply(429, { error: 'Too many receipt readings. Try again shortly.' });
  if (Number(request.headers.get('content-length') ?? 0) > MAX_RECEIPT_BYTES + 10_000) return reply(413, { error: 'That receipt photo is too large.' });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { error: 'No receipt photo came through.' });
  }
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_RECEIPT_BYTES || !/^image\/(jpeg|png|webp)$/.test(file.type)) return reply(400, { error: 'Send a JPEG, PNG, or WebP receipt under 8 MB.' });
  const endpoint = env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT.replace(/\/+$/, '');
  const analyzeUrl = `${endpoint}/documentintelligence/documentModels/prebuilt-receipt:analyze?api-version=2024-11-30`;
  let started: Response;
  try {
    started = await fetchImpl(analyzeUrl, { method: 'POST', headers: { 'content-type': file.type, 'Ocp-Apim-Subscription-Key': env.AZURE_DOCUMENT_INTELLIGENCE_KEY }, body: await file.arrayBuffer(), signal: AbortSignal.timeout(20_000) });
  } catch {
    return reply(502, { error: 'The online receipt reader could not be reached.' });
  }
  if (started.status === 401 || started.status === 403) return reply(502, { error: 'The online receipt reader rejected its credentials.' });
  if (!started.ok && started.status !== 202) return reply(502, { error: 'The online receipt reader could not read that photo.' });
  if (started.status === 200) return reply(200, reduced((await started.json()) as AzureResult));
  const operation = started.headers.get('operation-location');
  if (!operation) return reply(502, { error: 'The online receipt reader did not return a result.' });
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await wait(500);
    let checked: Response;
    try {
      checked = await fetchImpl(operation, { headers: { 'Ocp-Apim-Subscription-Key': env.AZURE_DOCUMENT_INTELLIGENCE_KEY }, signal: AbortSignal.timeout(10_000) });
    } catch {
      return reply(502, { error: 'The online receipt result could not be reached.' });
    }
    if (!checked.ok) return reply(502, { error: 'The online receipt result could not be read.' });
    const data = (await checked.json()) as AzureResult;
    if (data.status === 'succeeded') return reply(200, reduced(data));
    if (data.status === 'failed') return reply(502, { error: 'The online receipt reader could not understand that photo.' });
  }
  return reply(504, { error: 'The online receipt reader took too long. Try again or enter the amount manually.' });
}
