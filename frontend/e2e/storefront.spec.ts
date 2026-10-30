import { expect, test, type Page } from '@playwright/test'

test.describe('customer journey', () => {
  test('model filter → product → variants → wishlist → bag → demo checkout', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your Phone. Your Signature.')

    // Shop by iPhone model.
    await page.getByRole('button', { name: 'Shop iPhone 17 Pro cases' }).click()
    await expect(page).toHaveURL(/model=iphone-17-pro/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('iPhone 17 Pro')

    // Filter by colour (desktop sidebar).
    await page.getByRole('complementary', { name: 'Filters' }).getByRole('button', { name: 'Ivory', exact: true }).click()
    await expect(page).toHaveURL(/color=Ivory/)

    // Open a product and change colour + model.
    await page.goto('/products/noire-signature-case')
    await expect(page.getByRole('heading', { level: 1, name: 'Noiré Signature Case' })).toBeVisible()
    await page.getByRole('radio', { name: '17 Pro Max' }).click()
    await page.getByRole('radiogroup', { name: 'Colour', exact: true }).getByRole('radio', { name: /^Mocha/ }).click()
    await expect(page.getByText(/SKU NR-SIG-17PM-MOC/)).toBeVisible()

    // Wishlist.
    await page.getByRole('button', { name: /Save Noiré Signature Case to wishlist/ }).first().click()
    await page.goto('/wishlist')
    await expect(page.getByRole('link', { name: 'Noiré Signature Case' }).first()).toBeVisible()

    // Add to bag (choose an in-stock combination).
    await page.goto('/products/noire-signature-case')
    for (const model of ['17', '17 Pro', '17 Pro Max', '18', '18 Pro', '18 Pro Max']) {
      await page.getByRole('radio', { name: model, exact: true }).click()
      if (await page.getByTestId('add-to-bag').isEnabled()) break
    }
    await page.getByTestId('add-to-bag').click()
    await expect(page.getByRole('dialog', { name: /Your Bag/ })).toBeVisible()

    // Matching set from the product page.
    await page.goto('/products/the-matching-edit-signature')
    for (const model of ['17', '17 Pro', '17 Pro Max', '18', '18 Pro', '18 Pro Max']) {
      await page.getByRole('radio', { name: model, exact: true }).click()
      if (await page.getByTestId('add-to-bag').isEnabled()) break
    }
    await page.getByTestId('add-to-bag').click()

    // Checkout.
    await page.goto('/checkout')
    await page.getByLabel('First name').fill('Demo')
    await page.getByLabel('Last name').fill('Client')
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('demo.client@example.com')
    await page.getByLabel('Phone number').fill('+961 70 000 000')
    await page.getByLabel('City / area').selectOption('Beirut')
    await page.getByLabel('Address', { exact: true }).fill('Demo Street 1')
    await page.getByText('Simulated Card Payment').click()
    await page.getByRole('button', { name: 'Simulate Successful Payment' }).click()
    await page.getByTestId('place-order').click()

    await expect(page).toHaveURL(/\/order\/NR-DEMO-/)
    await expect(page.getByTestId('order-number')).toContainText('NR-DEMO-')
    await expect(page.getByText('Approved (simulated)')).toBeVisible()
  })

  test('product WhatsApp inquiry contains the selected variant', async ({ page }) => {
    await page.goto('/products/ivory-muse')
    await page.getByRole('radio', { name: '17 Pro Max' }).click()
    await page.getByRole('radiogroup', { name: 'Colour', exact: true }).getByRole('radio', { name: /^Sand/ }).click()
    await page.getByRole('button', { name: 'Ask About This Product' }).click()
    await page.getByRole('button', { name: 'Check availability' }).click()
    const preview = page.getByTestId('whatsapp-preview')
    await expect(preview).toContainText('Ivory Muse for iPhone 17 Pro Max in Sand')
    await expect(preview).toContainText('/products/ivory-muse')
    await expect(preview).toContainText('NR-IVM-17PM-SAN')
  })

  test('mobile menu and filter drawer', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await page.getByRole('button', { name: 'Open menu' }).click()
    const menu = page.getByRole('dialog', { name: 'Menu' })
    await expect(menu).toBeVisible()
    await menu.getByRole('link', { name: 'Handmade' }).click()
    await expect(page).toHaveURL(/handmade-creations/)
    await page.getByRole('button', { name: /^Filters/ }).click()
    await expect(page.getByRole('dialog', { name: 'Filters' })).toBeVisible()
  })
})

test.describe('product card swatches and gallery', () => {
  test('swatch switches the card image without navigating, and carries the colour to the product page', async ({ page }) => {
    await page.goto('/shop?q=Soft%20Sculpture')
    const card = page.locator('article', { has: page.getByRole('heading', { name: 'Soft Sculpture' }) }).first()
    const img = card.locator('a img').first()
    const before = await img.getAttribute('src')

    const sage = card.getByRole('radio', { name: 'Sage', exact: true })
    await sage.click()
    await expect(page).toHaveURL(/\/shop/) // no navigation
    await expect(sage).toHaveAttribute('aria-checked', 'true')
    await expect(img).not.toHaveAttribute('src', before!)
    await expect(img).toHaveAttribute('src', /soft-sculpture-\d+\.svg/)

    // Keyboard: arrow keys move between available colours.
    await sage.focus()
    await page.keyboard.press('ArrowRight')
    await expect(card.getByRole('radio', { checked: true })).not.toHaveAccessibleName('Sage')

    await card.getByRole('radio', { name: 'Sage', exact: true }).click()
    await card.getByRole('link', { name: /Soft Sculpture/ }).first().click()
    await expect(page).toHaveURL(/color=Sage/)
    await expect(page.getByRole('radiogroup', { name: 'Colour', exact: true }).getByRole('radio', { checked: true })).toHaveAccessibleName(/^Sage/)
  })

  const card = (page: Page, name: string) => page.locator('article', { has: page.getByRole('heading', { name, exact: true }) }).first()

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    test(`Matching Edit — Marble: each swatch shows its own colour, even while hovering (${viewport.width}px)`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/collections/matching-sets')
      const c = card(page, 'The Matching Edit — Marble')
      const img = c.getByTestId('card-image')
      await c.hover()
      for (const [colour, file] of [['Nero Marble', 'marble-2'], ['Ivory Marble', 'marble-1'], ['Nero Marble', 'marble-2']]) {
        const swatch = c.getByRole('radio', { name: colour, exact: true })
        await expect(swatch).toHaveCSS('cursor', 'pointer')
        await swatch.click()
        await expect(swatch).toHaveAttribute('aria-checked', 'true')
        await expect(img).toHaveAttribute('src', new RegExp(`the-matching-edit-${file}\\.svg`))
        await expect(c.getByTestId('card-colour')).toHaveText(colour)
        // Nothing may overlay the chosen colour with a different photo.
        const overlays = await c.locator('a img').evaluateAll((els) => els.filter((e) => getComputedStyle(e).opacity !== '0' && e.getAttribute('aria-hidden') === 'true').length)
        expect(overlays).toBe(0)
      }
      await expect(page).toHaveURL(/matching-sets$/) // swatches never navigate
      await c.getByRole('link', { name: /Marble, Nero Marble/ }).click()
      await expect(page).toHaveURL(/the-matching-edit-marble\?color=Nero%20Marble/)
      await expect(page.getByRole('radiogroup', { name: 'Colour', exact: true }).getByRole('radio', { checked: true })).toHaveAccessibleName(/^Nero Marble/)
    })
  }

  test('Matching Edit — Pearl: genuinely sold out; colours still previewable, never purchasable', async ({ page, request }) => {
    const res = await request.get('/api/v1/products/the-matching-edit-pearl')
    const pearl = await res.json()
    const sellable = pearl.variants.some((v: { in_stock: boolean }) => v.in_stock)
    await page.goto('/collections/matching-sets')
    const c = card(page, 'The Matching Edit — Pearl')
    // The whole-product label must match real availability.
    await expect(c.getByText('Sold out', { exact: true })).toHaveCount(sellable ? 0 : 1)
    const charcoal = c.getByRole('radio', { name: /^Charcoal/ })
    await expect(charcoal).toBeEnabled()
    await expect(charcoal).toHaveCSS('cursor', 'pointer')
    await charcoal.click()
    await expect(c.getByTestId('card-image')).toHaveAttribute('src', /the-matching-edit-pearl-2\.svg/)
    await c.getByRole('link', { name: /Pearl, Charcoal/ }).click()
    await expect(page.getByRole('radiogroup', { name: 'Colour', exact: true }).getByRole('radio', { checked: true })).toHaveAccessibleName(/^Charcoal/)
    if (!sellable) await expect(page.getByTestId('add-to-bag')).toBeDisabled()
  })

  test('partially sold-out products are not labelled sold out, and the sold-out colour is marked', async ({ page }) => {
    // Isolated fixture: mark one colour of "Soft Sculpture" sold out in the API response only
    // (the database and inventory are untouched).
    const soldColour = 'Sage'
    await page.route('**/api/v1/products?*', async (route) => {
      const res = await route.fetch()
      const body = await res.json()
      for (const p of body.data) {
        if (p.slug === 'soft-sculpture') {
          p.in_stock = true
          p.colors = p.colors.map((c: { name: string }) => ({ ...c, in_stock: c.name !== soldColour }))
        }
      }
      await route.fulfill({ response: res, json: body })
    })
    await page.goto('/shop?q=Soft%20Sculpture')
    const c = card(page, 'Soft Sculpture')
    await expect(c.getByText('Sold out', { exact: true })).toHaveCount(0)
    await c.getByRole('radio', { name: new RegExp(`^${soldColour}, sold out`) }).click()
    await expect(c.getByTestId('card-colour')).toContainText('Sold out in this colour')
  })

  test('lightbox opens, navigates and closes', async ({ page }) => {
    await page.goto('/products/quilted-atelier')
    await page.getByRole('button', { name: /Open image 1 of/ }).click()
    const dialog = page.getByRole('dialog', { name: /image gallery/ })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/^1 \/ \d+$/)).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await expect(dialog.getByText(/^2 \/ \d+$/)).toBeVisible()
    await dialog.getByRole('button', { name: 'Show image 3' }).click()
    await expect(dialog.getByText(/^3 \/ \d+$/)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await page.getByRole('button', { name: /Open image 1 of/ }).click()
    await page.getByRole('button', { name: 'Close gallery' }).click()
    await expect(dialog).toBeHidden()
  })

  test('mobile: swipe gallery and thumbnails', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/products/quilted-atelier')
    await page.getByRole('button', { name: 'Image 3', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Image 3', exact: true })).toHaveAttribute('aria-current', 'true')
  })
})

test.describe('header navigation', () => {
  test('only the current section is marked active, and the header never covers content', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/custom')
    const nav = page.getByRole('navigation', { name: 'Main' })
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1)
    await expect(nav.getByRole('link', { name: 'Create Your Own' })).toHaveAttribute('aria-current', 'page')
    const linkBox = await nav.getByRole('link', { name: 'Create Your Own' }).boundingBox()
    expect(linkBox!.height).toBeLessThan(32) // hugs the label

    const header = await page.locator('header').boundingBox()
    const heading = await page.getByRole('heading', { level: 1 }).boundingBox()
    expect(heading!.y).toBeGreaterThan(header!.y + header!.height)

    await page.goto('/shop?type=case')
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1)
    await expect(nav.getByRole('link', { name: 'Phone Cases' })).toHaveAttribute('aria-current', 'page')
  })
})

test.describe('responsive layout', () => {
  for (const width of [320, 375, 390, 430, 768, 1024, 1366, 1440, 1920]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      for (const path of ['/', '/shop', '/products/quilted-atelier', '/checkout']) {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0)
      }
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: `test-results/screens/home-${width}.png`, fullPage: false })
    })
  }
})
