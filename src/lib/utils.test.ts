import { describe, expect, it } from 'vitest';
import { cn, formatReceiptDate } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, null, undefined, '')).toBe('a');
  });

  it('dedupes conflicting Tailwind classes (twMerge)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});

describe('formatReceiptDate', () => {
  it('formats an ISO date as "MMM d, yyyy"', () => {
    expect(formatReceiptDate('2026-05-14')).toBe('May 14, 2026');
  });

  it('returns em-dash for null', () => {
    expect(formatReceiptDate(null)).toBe('—');
  });

  it('does not drift to the previous day (UTC shift bug)', () => {
    // The whole reason this helper exists: `new Date('2026-05-01')` is UTC midnight,
    // which in IST is the *prior* day at 5:30am. parseISO treats it as local.
    expect(formatReceiptDate('2026-05-01')).toBe('May 1, 2026');
  });

  it('falls back to raw string on invalid input', () => {
    expect(formatReceiptDate('not-a-date')).toBe('not-a-date');
  });
});
