// Debug helper: node e2e/swatch-debug.mjs — clicks each swatch on two bundle cards and reports what changes.
import { chromium } from '@playwright/test'

const base = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
const browser = await chromium.launch({ channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(base + '/collections/matching-sets', { waitUntil: 'networkidle' })
for (const name of ['The Matching Edit — Marble', 'The Matching Edit — Pearl']) {
  const card = page.locator('article', { has: page.getByRole('heading', { name }) }).first()
  await card.scrollIntoViewIfNeeded()
  const img = card.locator('a img').first()
  const radios = card.getByRole('radio')
  console.log(`== ${name}: ${await radios.count()} swatches; initial src=${await img.getAttribute('src')}`)
  for (const r of await radios.all()) {
    const label = await r.getAttribute('aria-label')
    const disabled = await r.isDisabled()
    const cursor = await r.evaluate((el) => getComputedStyle(el).cursor)
    const box = await r.boundingBox()
    // What element actually receives a click at the swatch centre?
    const hit = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y)
      return el ? `${el.tagName.toLowerCase()}${el.getAttribute('role') ? `[role=${el.getAttribute('role')}]` : ''}` : 'none'
    }, { x: box.x + box.width / 2, y: box.y + box.height / 2 })
    if (!disabled) await r.click()
    console.log(`  ${label}: disabled=${disabled} cursor=${cursor} size=${Math.round(box.width)}px hit=${hit} checked=${await r.getAttribute('aria-checked')} src=${await img.getAttribute('src')}`)
  }
}
await browser.close()
