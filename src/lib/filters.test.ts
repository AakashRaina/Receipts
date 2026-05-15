import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  defaultFilters,
  hasAnyFilter,
  isDefaultFilters,
  parseFilters,
  serializeFilters,
  thisMonthRange,
} from './filters';

describe('parseFilters', () => {
  it('returns empty object when no params', () => {
    expect(parseFilters(new URLSearchParams(''))).toEqual({});
  });

  it('parses all known params', () => {
    const params = new URLSearchParams(
      'vendor=Starbucks&category=Coffee&payment=UPI&from=2026-04-01&to=2026-04-30&q=oat+milk',
    );
    expect(parseFilters(params)).toEqual({
      vendor: 'Starbucks',
      category: 'Coffee',
      paymentMethod: 'UPI',
      from: '2026-04-01',
      to: '2026-04-30',
      q: 'oat milk',
    });
  });

  it('rejects malformed dates', () => {
    const params = new URLSearchParams('from=2026-4-1&to=not-a-date');
    expect(parseFilters(params)).toEqual({});
  });

  it('ignores unknown params', () => {
    expect(parseFilters(new URLSearchParams('foo=bar'))).toEqual({});
  });
});

describe('serializeFilters', () => {
  it('round-trips back to the same filters object', () => {
    const filters = {
      vendor: 'Blue Tokai',
      category: 'Coffee',
      paymentMethod: 'Card',
      from: '2026-05-01',
      to: '2026-05-31',
      q: 'cappuccino',
    };
    const round = parseFilters(serializeFilters(filters));
    expect(round).toEqual(filters);
  });

  it('omits undefined fields', () => {
    expect(serializeFilters({ vendor: 'X' }).toString()).toBe('vendor=X');
  });

  it('produces empty params for empty filters', () => {
    expect(serializeFilters({}).toString()).toBe('');
  });
});

describe('thisMonthRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T10:00:00+05:30'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns first/last day of the current month', () => {
    expect(thisMonthRange()).toEqual({ from: '2026-05-01', to: '2026-05-31' });
  });
});

describe('defaultFilters / isDefaultFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T10:00:00+05:30'));
  });
  afterEach(() => vi.useRealTimers());

  it('default is the current month', () => {
    expect(defaultFilters()).toEqual({ from: '2026-05-01', to: '2026-05-31' });
  });

  it('isDefaultFilters: true for current-month range, false otherwise', () => {
    expect(isDefaultFilters({ from: '2026-05-01', to: '2026-05-31' })).toBe(true);
    expect(isDefaultFilters({ from: '2026-05-01', to: '2026-05-31', vendor: 'X' })).toBe(false);
    expect(isDefaultFilters({ from: '2026-04-01', to: '2026-04-30' })).toBe(false);
    expect(isDefaultFilters({})).toBe(false);
  });
});

describe('hasAnyFilter', () => {
  it('false for empty filters', () => {
    expect(hasAnyFilter({})).toBe(false);
  });

  it('true when any facet is set', () => {
    expect(hasAnyFilter({ vendor: 'X' })).toBe(true);
    expect(hasAnyFilter({ paymentMethod: 'UPI' })).toBe(true);
    expect(hasAnyFilter({ from: '2026-05-01' })).toBe(true);
    expect(hasAnyFilter({ q: 'coffee' })).toBe(true);
  });
});
