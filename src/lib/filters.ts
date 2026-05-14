import { endOfMonth, format, startOfMonth } from 'date-fns';
import type { ReceiptFilters } from './queries';

export function thisMonthRange(): { from: string; to: string } {
  const now = new Date();
  return {
    from: format(startOfMonth(now), 'yyyy-MM-dd'),
    to: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
}

export function defaultFilters(): ReceiptFilters {
  return thisMonthRange();
}

// Source of truth: URL search params.
// Component state derives from URL, mutations push back into URL via setSearchParams.

export function parseFilters(params: URLSearchParams): ReceiptFilters {
  const filters: ReceiptFilters = {};

  const vendor = params.get('vendor');
  if (vendor) filters.vendor = vendor;

  const category = params.get('category');
  if (category) filters.category = category;

  const paymentMethod = params.get('payment');
  if (paymentMethod) filters.paymentMethod = paymentMethod;

  const from = params.get('from');
  if (from && isValidIsoDate(from)) filters.from = from;

  const to = params.get('to');
  if (to && isValidIsoDate(to)) filters.to = to;

  const q = params.get('q');
  if (q) filters.q = q;

  return filters;
}

export function serializeFilters(filters: ReceiptFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.vendor) params.set('vendor', filters.vendor);
  if (filters.category) params.set('category', filters.category);
  if (filters.paymentMethod) params.set('payment', filters.paymentMethod);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.q) params.set('q', filters.q);
  return params;
}

export function hasAnyFilter(filters: ReceiptFilters): boolean {
  return (
    !!filters.vendor ||
    !!filters.category ||
    !!filters.paymentMethod ||
    !!filters.from ||
    !!filters.to ||
    !!filters.q
  );
}

export function isDefaultFilters(filters: ReceiptFilters): boolean {
  return serializeFilters(filters).toString() === serializeFilters(defaultFilters()).toString();
}

function isValidIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
