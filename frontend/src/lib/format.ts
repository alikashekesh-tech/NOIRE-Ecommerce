const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

/** Prices come from the API as decimal strings; format for display only. */
export function money(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  return usd.format(Number(value))
}

export function priceRange(min: string, max: string): string {
  return Number(min) === Number(max) ? money(min) : `From ${money(min)}`
}

export function date(value: string | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
  return value ? new Intl.DateTimeFormat('en-GB', opts).format(new Date(value)) : ''
}

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}
