import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { withQueryClient } from '@/test/query-wrapper';

// All mock state must live inside vi.hoisted — vi.mock factories are hoisted
// above regular imports, so they can only see hoisted values.
const mocks = vi.hoisted(() => {
  type ChainCall = { method: string; args: unknown[] };
  type Result = { data?: unknown; error?: unknown };

  const lastChains: Array<{ table: string; calls: ChainCall[] }> = [];
  const nextResult: { value: Result } = { value: { data: [], error: null } };

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

  const supabase = {
    from: fromMock,
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    storage: { from: vi.fn() },
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  };

  return { supabase, fromMock, lastChains, nextResult, createChain };
});

vi.mock('./supabase', () => ({ supabase: mocks.supabase }));

import { useReceipts, useReceipt } from './queries';

beforeEach(() => {
  mocks.lastChains.length = 0;
  mocks.nextResult.value = { data: [], error: null };
  mocks.fromMock.mockReset();
  mocks.fromMock.mockImplementation((table: string) => {
    const { proxy, calls } = mocks.createChain(mocks.nextResult.value);
    mocks.lastChains.push({ table, calls });
    return proxy;
  });
});

describe('useReceipts', () => {
  it('queries with no filters: select * + ordered by date desc, created_at desc', async () => {
    const { result } = renderHook(() => useReceipts({}), { wrapper: withQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const chain = mocks.lastChains[0];
    expect(chain.table).toBe('receipts');
    const methods = chain.calls.map((c) => c.method);
    expect(methods).toContain('select');
    expect(methods.filter((m) => m === 'order')).toHaveLength(2);
    expect(methods).not.toContain('eq');
    expect(methods).not.toContain('gte');
    expect(methods).not.toContain('textSearch');
  });

  it('applies vendor / category / payment / date / q filters', async () => {
    const filters = {
      vendor: 'Blue Tokai',
      category: 'Coffee',
      paymentMethod: 'UPI',
      from: '2026-05-01',
      to: '2026-05-31',
      q: 'oat milk',
    };
    const { result } = renderHook(() => useReceipts(filters), {
      wrapper: withQueryClient(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calls = mocks.lastChains[0].calls;
    expect(calls).toContainEqual({
      method: 'eq',
      args: ['vendor_normalized', 'Blue Tokai'],
    });
    expect(calls).toContainEqual({ method: 'eq', args: ['category', 'Coffee'] });
    expect(calls).toContainEqual({ method: 'eq', args: ['payment_method', 'UPI'] });
    expect(calls).toContainEqual({ method: 'gte', args: ['date', '2026-05-01'] });
    expect(calls).toContainEqual({ method: 'lte', args: ['date', '2026-05-31'] });
    expect(calls).toContainEqual({
      method: 'textSearch',
      args: ['search_vector', 'oat milk', { type: 'websearch' }],
    });
  });

  it('passes the data through unchanged', async () => {
    mocks.nextResult.value = {
      data: [{ id: '1', vendor: 'Test', total: 100 }],
      error: null,
    };
    const { result } = renderHook(() => useReceipts({}), { wrapper: withQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: '1', vendor: 'Test', total: 100 }]);
  });
});

describe('useReceipt', () => {
  it('is idle when id is undefined', () => {
    const { result } = renderHook(() => useReceipt(undefined), {
      wrapper: withQueryClient(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('selects a single row by id when id is provided', async () => {
    mocks.nextResult.value = { data: { id: 'abc' }, error: null };
    const { result } = renderHook(() => useReceipt('abc'), {
      wrapper: withQueryClient(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calls = mocks.lastChains[0].calls;
    expect(calls).toContainEqual({ method: 'eq', args: ['id', 'abc'] });
    expect(calls.map((c) => c.method)).toContain('single');
  });
});
