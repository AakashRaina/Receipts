// Vercel Node function: extract structured fields from a receipt image with Gemini.
// Uses the caller's JWT for every Supabase call — RLS protects all reads/writes.
// No service role key. No bypass route.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
// Node ESM at runtime requires explicit .js extensions on relative imports.
// TypeScript resolves the .js path back to the .ts source for type-checking.
import { ReceiptSchema, ReceiptJsonSchema } from '../src/lib/schemas/receipt.js';
import type { Database } from '../src/lib/database.types.js';

export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

const PROMPT = `You are a receipt parser for Indian receipts. Extract the following fields from the receipt image.
Return JSON matching the provided schema exactly. For each field in "confidence",
return a score 0..1 based on how clearly visible / unambiguous the value was.
If a field is genuinely absent, return null where the schema allows.
Normalize the vendor name into vendor_normalized (drop store numbers, locations, branch suffixes).
Date must be YYYY-MM-DD. Total/gst are numeric (ignore currency symbols).
"gst" is the total GST amount on the receipt — sum CGST + SGST (or IGST if present) into a single number.
If only "Tax" or "VAT" is shown without GST breakdown, put that value in gst.
Currency is the 3-letter ISO code if visible, otherwise "INR".
Choose a free-form short category that describes the spend ("Coffee", "Groceries", "Restaurant", etc).
Include the full OCR'd raw_text verbatim.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  const jwt = auth.slice('Bearer '.length);

  const body = (typeof req.body === 'string' ? safeParse(req.body) : req.body) as
    | { receiptId?: unknown }
    | null;
  if (!body || typeof body.receiptId !== 'string') {
    return res.status(400).json({ error: 'receiptId is required' });
  }
  const receiptId = body.receiptId;

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  // Fetch the receipt (RLS ensures it's owned by the caller; 404 otherwise).
  const { data: receipt, error: fetchErr } = await supabase
    .from('receipts')
    .select('id, image_path, status')
    .eq('id', receiptId)
    .single();

  if (fetchErr || !receipt) {
    return res.status(404).json({ error: 'Receipt not found' });
  }

  await supabase.from('receipts').update({ status: 'processing' }).eq('id', receipt.id);

  const { data: signed, error: signErr } = await supabase.storage
    .from('receipts')
    .createSignedUrl(receipt.image_path, 120);
  if (signErr || !signed) {
    return fail(supabase, receipt.id, res, `Could not sign image URL: ${signErr?.message ?? 'unknown'}`);
  }

  let imageBytes: ArrayBuffer;
  let mimeType: string;
  try {
    const imgRes = await fetch(signed.signedUrl);
    if (!imgRes.ok) throw new Error(`Image fetch failed: ${imgRes.status}`);
    imageBytes = await imgRes.arrayBuffer();
    mimeType = imgRes.headers.get('content-type') ?? 'image/jpeg';
  } catch (err) {
    return fail(supabase, receipt.id, res, `Failed to read image: ${(err as Error).message}`);
  }

  let parsed: ReturnType<typeof ReceiptSchema.parse>;
  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: PROMPT },
            {
              inlineData: {
                mimeType,
                data: arrayBufferToBase64(imageBytes),
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: ReceiptJsonSchema as unknown as Record<string, unknown>,
      },
    });

    const text = result.text;
    if (!text) throw new Error('Gemini returned no text');
    parsed = ReceiptSchema.parse(JSON.parse(text));
  } catch (err) {
    return fail(supabase, receipt.id, res, `Extraction failed: ${(err as Error).message}`);
  }

  const { error: updateErr } = await supabase
    .from('receipts')
    .update({
      status: 'ready',
      error_message: null,
      vendor: parsed.vendor,
      vendor_normalized: parsed.vendor_normalized,
      date: parsed.date,
      total: parsed.total,
      currency: parsed.currency,
      gst: parsed.gst,
      category: parsed.category,
      payment_method: parsed.payment_method,
      line_items: parsed.line_items,
      raw_text: parsed.raw_text,
      confidence: parsed.confidence,
    })
    .eq('id', receipt.id);

  if (updateErr) {
    return fail(supabase, receipt.id, res, `Could not save extraction: ${updateErr.message}`);
  }

  return res.status(200).json({ ok: true, receipt: parsed });
}

async function fail(
  supabase: ReturnType<typeof createClient<Database>>,
  receiptId: string,
  res: VercelResponse,
  message: string,
) {
  await supabase
    .from('receipts')
    .update({ status: 'failed', error_message: message })
    .eq('id', receiptId);
  return res.status(500).json({ error: message });
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('base64');
}
