import type { Customization, WhatsAppTemplate } from '../types'

export interface InquiryContext {
  product: string
  url: string
  model?: string | null
  color?: string | null
  sku?: string | null
}

/** Fill a template's {product} {variant} {model} {color} {sku} {url} placeholders. */
export function buildMessage(template: WhatsAppTemplate, ctx: InquiryContext): string {
  const variantParts = [ctx.model ? `for ${ctx.model}` : null, ctx.color ? `in ${ctx.color}` : null].filter(Boolean)
  const variant = variantParts.length ? ' ' + variantParts.join(' ') : ''
  let message = template.message
    .replaceAll('{product}', ctx.product)
    .replaceAll('{variant}', variant)
    .replaceAll('{model}', ctx.model || 'my iPhone model')
    .replaceAll('{color}', ctx.color || '')
    .replaceAll('{sku}', ctx.sku || '')
    .replaceAll('{url}', ctx.url)
  if (ctx.sku && !template.message.includes('{sku}')) message += ` (SKU: ${ctx.sku})`
  return message.replace(/\s{2,}/g, ' ').trim()
}

export interface CartInquiryLine {
  name: string
  quantity: number
  model?: string | null
  color?: string | null
  customization?: Customization | null
}

/** Readable cart summary — no account, address or payment details are ever included. */
export function buildCartMessage(lines: CartInquiryLine[], total: string): string {
  const rows = lines.map((l, i) => {
    const detail = [l.model, l.color].filter(Boolean).join(', ')
    const custom = l.customization?.text ? ` — personalisation: "${l.customization.text}"` : ''
    return `${i + 1}. ${l.name}${detail ? ` (${detail})` : ''} × ${l.quantity}${custom}`
  })
  return ['Hello NOIRÉ! I have a question about my bag:', ...rows, `Estimated total: ${total}`].join('\n')
}

/** Returns a wa.me link, or null when no business number is configured (demo preview mode). */
export function whatsappLink(number: string | null | undefined, message: string): string | null {
  const digits = (number || '').replace(/\D/g, '')
  if (digits.length < 8) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
