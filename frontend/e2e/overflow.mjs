// Debug helper: node e2e/overflow.mjs <path> <width> — lists elements wider than the viewport.
import { chromium } from '@playwright/test'

const [path = '/', width = '320'] = process.argv.slice(2)
const browser = await chromium.launch({ channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: Number(width), height: 800 } })
await page.goto((process.env.E2E_BASE_URL ?? 'http://localhost:5173') + path, { waitUntil: 'networkidle' })
const offenders = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth
  return [...document.querySelectorAll('body *')]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.right > vw + 0.5 && r.width > 0)
    .filter(({ el }) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX
        if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return false
      }
      return true
    })
    .slice(0, 12)
    .map(({ el, r }) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 90)} right=${Math.round(r.right)} w=${Math.round(r.width)} text="${(el.textContent ?? '').trim().slice(0, 40)}"`)
})
console.log(offenders.join('\n') || 'no offenders')
await browser.close()
