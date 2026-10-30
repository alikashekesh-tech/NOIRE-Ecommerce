import { describe, expect, it } from 'vitest'
import { buildCartMessage, buildMessage, whatsappLink } from './whatsapp'

const template = { key: 'availability', label: 'Check availability', message: "Hello NOIRÉ! I'm interested in the {product}{variant}. Could you tell me more about its availability? Product: {url}" }

describe('WhatsApp inquiry messages', () => {
  it('includes the selected product, model, colour, SKU and URL', () => {
    const msg = buildMessage(template, { product: 'Ivory Muse', url: 'https://demo.test/products/ivory-muse', model: 'iPhone 17 Pro Max', color: 'Ivory', sku: 'NR-IVM-17PM-IVO' })
    expect(msg).toBe(
      "Hello NOIRÉ! I'm interested in the Ivory Muse for iPhone 17 Pro Max in Ivory. Could you tell me more about its availability? Product: https://demo.test/products/ivory-muse (SKU: NR-IVM-17PM-IVO)",
    )
  })

  it('omits variant text cleanly when no model is chosen', () => {
    const msg = buildMessage(template, { product: 'Pearl Power Bank', url: '/p', color: 'Ivory' })
    expect(msg).toContain('the Pearl Power Bank in Ivory.')
    expect(msg).not.toContain('  ')
  })

  it('builds an encoded wa.me link only when a number is configured', () => {
    expect(whatsappLink('', 'hi')).toBeNull()
    expect(whatsappLink(null, 'hi')).toBeNull()
    expect(whatsappLink('+961 70 123 456', 'Hello & welcome?')).toBe('https://wa.me/96170123456?text=Hello%20%26%20welcome%3F')
  })

  it('summarises the bag without personal data', () => {
    const msg = buildCartMessage([{ name: 'Monogram Muse', quantity: 1, model: 'iPhone 18 Pro', color: 'Mocha', customization: { text: 'AK' } }], '$72.00')
    expect(msg).toContain('1. Monogram Muse (iPhone 18 Pro, Mocha) × 1 — personalisation: "AK"')
    expect(msg).toContain('Estimated total: $72.00')
  })
})
