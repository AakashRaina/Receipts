import { describe, expect, it } from 'vitest';
import { ReceiptSchema } from './receipt';

const validReceipt = {
  vendor: 'Blue Tokai',
  vendor_normalized: 'Blue Tokai',
  date: '2026-05-14',
  total: 450,
  currency: 'INR',
  gst: 22.5,
  category: 'Coffee',
  payment_method: 'UPI',
  line_items: [
    { description: 'Cappuccino', quantity: 1, unit_price: 280, total: 280 },
    { description: 'Croissant', quantity: 1, unit_price: 170, total: 170 },
  ],
  raw_text: 'Blue Tokai\\nCappuccino 280\\nCroissant 170\\nTotal 450',
  confidence: {
    vendor: 0.95,
    date: 0.99,
    total: 0.97,
    gst: 0.6,
    category: 0.85,
    payment_method: 0.4,
  },
};

describe('ReceiptSchema', () => {
  it('accepts a valid receipt', () => {
    expect(() => ReceiptSchema.parse(validReceipt)).not.toThrow();
  });

  it('allows nullable optional fields', () => {
    const r = ReceiptSchema.parse({
      ...validReceipt,
      gst: null,
      payment_method: null,
      line_items: [],
    });
    expect(r.gst).toBeNull();
    expect(r.payment_method).toBeNull();
  });

  it('rejects malformed dates', () => {
    expect(() =>
      ReceiptSchema.parse({ ...validReceipt, date: '14/05/2026' }),
    ).toThrow();
    expect(() =>
      ReceiptSchema.parse({ ...validReceipt, date: '2026-5-1' }),
    ).toThrow();
  });

  it('rejects confidence values outside 0..1', () => {
    expect(() =>
      ReceiptSchema.parse({
        ...validReceipt,
        confidence: { ...validReceipt.confidence, vendor: 1.5 },
      }),
    ).toThrow();
    expect(() =>
      ReceiptSchema.parse({
        ...validReceipt,
        confidence: { ...validReceipt.confidence, vendor: -0.1 },
      }),
    ).toThrow();
  });

  it('rejects when required scalar is missing', () => {
    const { vendor: _vendor, ...rest } = validReceipt;
    expect(() => ReceiptSchema.parse(rest)).toThrow();
  });

  it('rejects total when not a number', () => {
    expect(() => ReceiptSchema.parse({ ...validReceipt, total: '450' })).toThrow();
  });

  it('line items allow null quantity / unit_price / total', () => {
    const r = ReceiptSchema.parse({
      ...validReceipt,
      line_items: [
        { description: 'Something', quantity: null, unit_price: null, total: null },
      ],
    });
    expect(r.line_items[0].description).toBe('Something');
  });
});
