// Visual review helper: node e2e/shots.mjs [outDir] — captures key pages at desktop and mobile widths.
import { chromium } from '@playwright/test'

const out = process.argv[2] ?? 'test-results/shots'
const base = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
// PAGES="name=/path,name2=/path2" overrides the default set.
const pages = process.env.PAGES
  ? process.env.PAGES.split(',').map((p) => [p.slice(0, p.indexOf('=')), p.slice(p.indexOf('=') + 1)])
  : [
      ['home', '/'],
      ['shop', '/shop?model=iphone-17-pro'],
      ['product', '/products/quilted-atelier'],
      ['handmade', '/collections/handmade-creations'],
    ]
const browser = await chromium.launch({ channel: 'msedge' })
for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  for (const [name, path] of pages) {
    await page.goto(base + path, { waitUntil: 'networkidle' })
    // Scroll through so lazy images load, then return to top.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo({ top: y, behavior: 'instant' })
        await new Promise((r) => setTimeout(r, 120))
      }
      window.scrollTo({ top: 0, behavior: 'instant' })
    })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(400)
    if (name.startsWith('lightbox')) {
      await page.getByRole('button', { name: /Open image 1 of/ }).click()
      await page.waitForTimeout(500)
    }
    await page.screenshot({ path: `${out}/${name}-${tag}.png` })
    if (name === 'home') {
      await page.screenshot({ path: `${out}/home-full-${tag}.png`, fullPage: true })
      // Collections section close-up.
      await page.locator('#collections-title').scrollIntoViewIfNeeded()
      await page.evaluate(() => window.scrollBy({ top: -120, behavior: 'instant' }))
      await page.waitForTimeout(300)
      await page.screenshot({ path: `${out}/home-collections-${tag}.png` })
    }
  }
  await page.close()
}
await browser.close()
console.log('saved to', out)
