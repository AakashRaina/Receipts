import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Receipt dates are YYYY-MM-DD strings. parseISO treats them as local midnight,
// avoiding the UTC-shift that `new Date('2026-05-14')` causes in non-UTC zones.
export function formatReceiptDate(date: string | null): string {
  if (!date) return '—'
  try {
    return format(parseISO(date), 'MMM d, yyyy')
  } catch {
    return date
  }
}
