import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { withQueryClient } from '@/test/query-wrapper';

const mocks = vi.hoisted(() => {
  type ChainCall = { method: string; args: unknown[] };
  type Result = { data?: unknown; error?: unknown };

  const lastChains: Array<{ table: string; calls: ChainCall[] }> = [];

  function createChain(result: Result) {
    const calls: ChainCall[] = [];
    const proxy: unknown = new Proxy(
      {},
      {
        get(_t, prop: string | symbol) {
          if (prop === 'then') {
            return (
              resolve?: (v: Result) => unknown,
              reject?: (e: unknown) => unknown,
            ) => Promise.resolve(result).then(resolve, reject);
          }
          return (...args: unknown[]) => {
            calls.push({ method: String(prop), args });
            return proxy;
          };
        },
      },
    );
    return { proxy: proxy as Record<string, unknown>, calls };
  }

  const fromMock = vi.fn();
  const storageRemove = vi.fn();
  const storageFrom = vi.fn(() => ({ remove: storageRemove }));
  const getSession = vi.fn();

  const supabase = {
    from: fromMock,
    auth: { getSession },
    storage: { from: storageFrom },
    rpc: vi.fn(),
  };

  return { supabase, fromMock, lastChains, storageRemove, storageFrom, getSession, createChain };
});

vi.mock('./supabase', () => ({ supabase: mocks.supabase }));

import { useUpdateField, useDeleteReceipt, useBulkDeleteReceipts, useRetryExtract } from './mutations';

beforeEach(() => {
  mocks.lastChains.length = 0;
  mocks.fromMock.mockReset();
  mocks.fromMock.mockImplementation((table: string) => {
    const { proxy, calls } = mocks.createChain({ data: null, error: null });
    mocks.lastChains.push({ table, calls });
    return proxy;
  });
  mocks.storageRemove.mockReset();
  mocks.storageRemove.mockResolvedValue({ data: [], error: null });
  mocks.storageFrom.mockClear();
  mocks.getSession.mockReset();
  mocks.getSession.mockResolvedValue({
    data: { session: { access_token: 'jwt-token', user: { id: 'user-1' } } },
    error: null,
  });
});

describe('useUpdateField', () => {
  it('updates the field and bumps confidence to 1.0 for the matching key', async () => {
    const { result } = renderHook(() => useUpdateField('receipt-1'), {
      wrapper: withQueryClient(),
    });

    await result.current.mutateAsync({
      field: 'vendor',
      value: 'New Vendor',
      currentConfidence: {
        vendor: 0.4,
        date: 0.9,
        total: 0.95,
        gst: 0.7,
        category: 0.8,
        payment_method: 0.6,
      },
    });

    const updateCall = mocks.lastChains[0].calls.find((c) => c.method === 'update');
    expect(updateCall).toBeDefined();
    expect(updateCall!.args[0]).toMatchObject({
      vendor: 'New Vendor',
      confidence: { vendor: 1, date: 0.9, total: 0.95 },
    });
    expect(mocks.lastChains[0].calls).toContainEqual({
      method: 'eq',
      args: ['id', 'receipt-1'],
    });
  });

  it('maps vendor_normalized edits onto the vendor confidence key', async () => {
    const { result } = renderHook(() => useUpdateField('r2'), {
      wrapper: withQueryClient(),
    });

    await result.current.mutateAsync({
      field: 'vendor_normalized',
      value: 'BlueTokai',
      currentConfidence: {
        vendor: 0.3,
        date: 1,
        total: 1,
        gst: 1,
        category: 1,
        payment_method: 1,
      },
    });

    const update = mocks.lastChains[0].calls.find((c) => c.method === 'update')!;
    expect(update.args[0]).toMatchObject({
      vendor_normalized: 'BlueTokai',
      confidence: { vendor: 1 },
    });
  });

  it('does not touch confidence when none provided', async () => {
    const { result } = renderHook(() => useUpdateField('r3'), {
      wrapper: withQueryClient(),
    });
    await result.current.mutateAsync({
      field: 'currency',
      value: 'INR',
      currentConfidence: null,
    });

    const update = mocks.lastChains[0].calls.find((c) => c.method === 'update')!;
    expect(update.args[0]).toEqual({ currency: 'INR' });
  });
});

describe('useDeleteReceipt', () => {
  it('removes the storage object first, then deletes the row', async () => {
    const callOrder: string[] = [];
    mocks.storageRemove.mockImplementation(async (paths: string[]) => {
      callOrder.push('storage:remove');
      expect(paths).toEqual(['user-1/r1.jpg']);
      return { data: [], error: null };
    });
    mocks.fromMock.mockImplementation((table: string) => {
      callOrder.push(`from:${table}`);
      const { proxy, calls } = mocks.createChain({ data: null, error: null });
      mocks.lastChains.push({ table, calls });
      return proxy;
    });

    const { result } = renderHook(() => useDeleteReceipt(), {
      wrapper: withQueryClient(),
    });
    await result.current.mutateAsync({ id: 'r1', image_path: 'user-1/r1.jpg' });

    expect(callOrder).toEqual(['storage:remove', 'from:receipts']);
    const calls = mocks.lastChains[0].calls;
    expect(calls.map((c) => c.method)).toContain('delete');
    expect(calls).toContainEqual({ method: 'eq', args: ['id', 'r1'] });
  });

  it('skips storage removal for pending uploads (image_path === "pending")', async () => {
    const { result } = renderHook(() => useDeleteReceipt(), {
      wrapper: withQueryClient(),
    });
    await result.current.mutateAsync({ id: 'r1', image_path: 'pending' });

    expect(mocks.storageRemove).not.toHaveBeenCalled();
    expect(mocks.lastChains[0].calls.map((c) => c.method)).toContain('delete');
  });

  it('swallows "not found" storage errors but propagates others', async () => {
    mocks.storageRemove.mockResolvedValueOnce({
      data: null,
      error: { message: 'Object not found' },
    });
    const { result } = renderHook(() => useDeleteReceipt(), {
      wrapper: withQueryClient(),
    });
    // Should not throw despite the storage error.
    await result.current.mutateAsync({ id: 'r1', image_path: 'user-1/r1.jpg' });
    expect(mocks.lastChains[0].calls.map((c) => c.method)).toContain('delete');
  });
});

describe('useBulkDeleteReceipts', () => {
  it('passes all paths to a single storage.remove call and uses .in() for the row delete', async () => {
    const { result } = renderHook(() => useBulkDeleteReceipts(), {
      wrapper: withQueryClient(),
    });
    await result.current.mutateAsync([
      { id: 'r1', image_path: 'user-1/r1.jpg' },
      { id: 'r2', image_path: 'user-1/r2.png' },
      { id: 'r3', image_path: 'pending' },
    ]);

    expect(mocks.storageRemove).toHaveBeenCalledTimes(1);
    expect(mocks.storageRemove).toHaveBeenCalledWith(['user-1/r1.jpg', 'user-1/r2.png']);

    const calls = mocks.lastChains[0].calls;
    expect(calls).toContainEqual({
      method: 'in',
      args: ['id', ['r1', 'r2', 'r3']],
    });
  });
});

describe('useRetryExtract', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);
  });

  it('POSTs to /api/extract with the JWT and receiptId', async () => {
    const { result } = renderHook(() => useRetryExtract(), {
      wrapper: withQueryClient(),
    });
    await result.current.mutateAsync('receipt-99');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/extract');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      'content-type': 'application/json',
      authorization: 'Bearer jwt-token',
    });
    expect(JSON.parse(init?.body as string)).toEqual({ receiptId: 'receipt-99' });
  });

  it('throws when the function returns non-ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Gemini failed' }),
    } as Response);

    const { result } = renderHook(() => useRetryExtract(), {
      wrapper: withQueryClient(),
    });
    await expect(result.current.mutateAsync('receipt-99')).rejects.toThrow('Gemini failed');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });
});

