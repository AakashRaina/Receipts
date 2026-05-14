import { z } from 'zod';

export const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().nullable(),
  unit_price: z.number().nullable(),
  total: z.number().nullable(),
});

export const ConfidenceSchema = z.object({
  vendor: z.number().min(0).max(1),
  date: z.number().min(0).max(1),
  total: z.number().min(0).max(1),
  gst: z.number().min(0).max(1),
  category: z.number().min(0).max(1),
  payment_method: z.number().min(0).max(1),
});

export const ReceiptSchema = z.object({
  vendor: z.string(),
  vendor_normalized: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
  total: z.number(),
  currency: z.string(),
  gst: z.number().nullable(),
  category: z.string(),
  payment_method: z.string().nullable(),
  line_items: z.array(LineItemSchema),
  raw_text: z.string(),
  confidence: ConfidenceSchema,
});

export type Receipt = z.infer<typeof ReceiptSchema>;
export type LineItem = z.infer<typeof LineItemSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const ReceiptJsonSchema = z.toJSONSchema(ReceiptSchema);
