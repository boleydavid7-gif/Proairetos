import { describe, expect, it } from 'vitest';
import { receiptFromText } from '../../core/ocr/labels';
import { handleReceiptRequest } from '../../../worker/receipt';

const request = (body: FormData, ip: string) => new Request('https://proairetos.com/api/receipt', { method: 'POST', body, headers: { 'cf-connecting-ip': ip } });

describe('online receipt reader', () => {
  it('reports when Azure is not configured', async () => {
    const form = new FormData();
    form.append('file', new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' }));
    expect((await handleReceiptRequest(request(form, 'receipt-missing'), {})).status).toBe(503);
  });

  it('reduces the Azure receipt result to editable fields', async () => {
    const form = new FormData();
    form.append('file', new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' }));
    const response = await handleReceiptRequest(request(form, 'receipt-success'), { AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: 'https://azure.test', AZURE_DOCUMENT_INTELLIGENCE_KEY: 'secret' }, async (input, init) => {
      if (init?.method === 'POST') {
        expect(String(input)).toContain('/documentintelligence/documentModels/prebuilt-receipt:analyze');
        expect(new Headers(init.headers).get('Ocp-Apim-Subscription-Key')).toBe('secret');
        return new Response(null, { status: 202, headers: { 'operation-location': 'https://azure.test/operation/1' } });
      }
      return new Response(JSON.stringify({ status: 'succeeded', analyzeResult: { documents: [{ fields: { MerchantName: { valueString: 'Kroger' }, TransactionDate: { valueDate: '2026-10-22' }, Total: { valueCurrency: { amount: 31.62, currencyCode: 'USD' } } } }] } }), { status: 200 });
    });
    expect(await response.json()).toMatchObject({ merchant: 'Kroger', date: '2026-10-22', total: 31.62, currency: 'USD' });
  });
});

describe('offline receipt amount reader', () => {
  it('uses the largest decimal amount and ignores whole-number receipt noise', () => {
    const found = receiptFromText(`Kroger
885 UNION BLVD
937-832-4060
14378 BULLET OLD
19.99
9.49
2.14
31.62
TOTAL: 31.62
PURCHASE: 31.62
10/22/26 04:34pm`);
    expect(found.find((each) => each.key === 'amount')?.value).toBe('31.62');
  });

  it('supports grouped thousands and does not use whole numbers as an amount', () => {
    expect(receiptFromText('Reference 937392\nTOTAL 1,000.00').find((each) => each.key === 'amount')?.value).toBe('1000.00');
    expect(receiptFromText('Reference 937392\nTOTAL 100').some((each) => each.key === 'amount')).toBe(false);
    expect(receiptFromText('Printed 2026.10.24\nReference 937392').some((each) => each.key === 'amount')).toBe(false);
  });
});
