import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Run ONLY against the isolated stack (test database), e.g.:
//   E2E_BASE_URL=http://localhost:5174 E2E_ADMIN_EMAIL=admin@noire.test E2E_ADMIN_PASSWORD=test-password-123 npx playwright test e2e/admin.spec.ts
const email = process.env.E2E_ADMIN_EMAIL ?? 'admin@noire.demo'
const password = process.env.E2E_ADMIN_PASSWORD ?? ''
const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'case-photo.png')
const stamp = Date.now().toString().slice(-5)

async function signIn(page: Page) {
  await page.goto('/admin')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
}

test.describe.configure({ mode: 'serial' })
test.describe('admin dashboard (isolated test database)', () => {
  test.skip(!password, 'Set E2E_ADMIN_PASSWORD (and point E2E_BASE_URL at the isolated stack)')

  test('rejects wrong credentials and protects admin routes', async ({ page }) => {
    await page.goto('/admin')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('definitely-wrong')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toContainText(/do not match/)
    const res = await page.request.get('/api/v1/admin/dashboard', { headers: { Accept: 'application/json' } })
    expect(res.status()).toBe(401)
  })

  test('dashboard shows metrics from recorded demo orders', async ({ page }) => {
    await signIn(page)
    await expect(page.getByText('Demo revenue', { exact: true })).toBeVisible()
    await expect(page.getByRole('img', { name: /Demo revenue per day/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /NR-DEMO-/ }).first()).toBeVisible()
    // Navigation reaches every section.
    for (const [link, heading] of [['Products', 'Products'], ['Inventory', 'Inventory'], ['Orders', 'Orders'], ['Customers', 'Customers'], ['Custom requests', 'Custom requests'], ['Homepage', 'Homepage'], ['Settings', 'Settings']]) {
      await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: link }).click()
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    }
  })

  test('create product → variants → image → publish → appears on storefront; edit price; stock persists', async ({ page }) => {
    await signIn(page)
    const name = `QA Atelier Case ${stamp}`
    await page.goto('/admin/products/new')
    await page.getByLabel('Product name').fill(name)
    await page.getByLabel('Short description').fill('Created by the automated admin test.')
    await page.getByRole('button', { name: 'Signature Cases' }).click()
    await page.getByRole('button', { name: 'Create product' }).click()
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()

    // Two iPhone models × one colour.
    await page.getByRole('button', { name: 'Add variants' }).click()
    const sheet = page.getByRole('dialog', { name: 'Add variants' })
    await sheet.getByRole('button', { name: '17 Pro', exact: true }).click()
    await sheet.getByRole('button', { name: '18 Pro', exact: true }).click()
    await sheet.getByLabel('Price (USD)').fill('47.00')
    await sheet.getByLabel('Initial stock').fill('6')
    await sheet.getByRole('button', { name: /Create 2 variants/ }).click()
    await expect(page.getByLabel('SKU')).toHaveCount(2)

    // Duplicate model/colour combination is rejected by the server.
    await page.getByRole('button', { name: 'Add variants' }).click()
    await sheet.getByRole('button', { name: '17 Pro', exact: true }).click()
    await sheet.getByRole('button', { name: /Create 1 variant/ }).click()
    await expect(page.getByText(/skipped/)).toBeVisible()
    await page.keyboard.press('Escape')

    // Image upload.
    await page.getByTestId('media-input').setInputFiles(fixture)
    await page.getByRole('button', { name: /Upload 1 image/ }).click()
    await expect(page.getByText('Primary', { exact: true })).toBeVisible()

    // Publish.
    await page.getByLabel('Status').selectOption('published')
    await page.getByRole('button', { name: 'Save changes' }).first().click()
    await expect(page.getByText('Product saved')).toBeVisible()

    const slug = name.toLowerCase().replace(/\s+/g, '-')
    await page.goto(`/products/${slug}`)
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    await expect(page.getByText('$47.00').first()).toBeVisible()
    await expect(page.getByRole('radio', { name: '18 Pro', exact: true })).toBeVisible()
    const img = page.getByRole('button', { name: /Open image 1 of/ }).locator('img')
    await expect(img).toHaveAttribute('src', /\/storage\/products\//)
    expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)

    // Model filter finds it.
    await page.goto(`/shop?model=iphone-18-pro&q=${encodeURIComponent(name)}`)
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()

    // Edit a variant price.
    await page.goto('/admin/products')
    await page.getByRole('link', { name, exact: true }).click()
    const priceInput = page.getByLabel('Price').first()
    await priceInput.fill('52.50')
    await page.getByRole('button', { name: 'Save', exact: true }).first().click()
    await expect(page.getByText(/^Saved NR-/)).toBeVisible()
    await page.goto(`/products/${slug}`)
    await expect(page.getByText('$52.50').first()).toBeVisible()

    // Inventory change persists and reaches the storefront.
    await page.goto(`/admin/inventory?q=${encodeURIComponent(name)}`)
    const stock = page.getByLabel(/^Stock for/).first()
    await stock.fill('2')
    await stock.blur()
    await expect(page.getByText(/stock 2$/)).toBeVisible()
    await page.reload()
    await expect(page.getByLabel(/^Stock for/).first()).toHaveValue('2')
    await expect(page.getByText(/Stock count updated/).first()).toBeVisible() // movement history
  })

  test('order status flow and internal notes persist', async ({ page }) => {
    await signIn(page)
    await page.goto('/admin/orders?status=pending')
    await page.getByRole('link', { name: /NR-DEMO-/ }).first().click()
    await page.getByRole('button', { name: 'Mark as Confirmed' }).click()
    await expect(page.getByText('Status updated to Confirmed')).toBeVisible()
    await page.getByLabel('Internal notes').fill(`QA note ${stamp}`)
    await page.getByRole('button', { name: 'Save notes' }).click()
    await expect(page.getByText('Notes saved')).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Internal notes')).toHaveValue(`QA note ${stamp}`)
    await expect(page.getByText(/Pending → Confirmed/)).toBeVisible()
  })

  test('custom design request can be quoted', async ({ page }) => {
    await signIn(page)
    await page.goto('/admin/requests')
    await page.getByLabel('Status').selectOption('quoted')
    await page.getByLabel('Suggested quotation (USD)').fill('99.00')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText(/updated$/)).toBeVisible()
  })

  test('homepage announcement and store settings reach the storefront', async ({ page }) => {
    await signIn(page)
    const text = `QA announcement ${stamp}`
    await page.goto('/admin/homepage')
    await page.getByLabel('Text', { exact: true }).fill(text)
    await page.getByRole('button', { name: 'Save homepage' }).click()
    await expect(page.getByText(/Homepage updated/)).toBeVisible()
    await page.goto('/')
    await expect(page.getByText(text)).toBeVisible()

    // Settings → WhatsApp number makes inquiries open a real wa.me link instead of the preview.
    await page.goto('/admin/settings')
    await page.getByRole('tab', { name: 'WhatsApp' }).click()
    await page.getByLabel('Business WhatsApp number').fill('+961 70 000 000')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('Settings saved')).toBeVisible()
    await page.goto('/products/ivory-muse')
    await page.getByRole('button', { name: 'Ask About This Product' }).click()
    const popup = page.waitForEvent('popup')
    await page.getByRole('button', { name: 'Check availability' }).click()
    const wa = await popup
    expect(wa.url()).toMatch(/^https:\/\/(wa\.me|api\.whatsapp\.com)\/.*96170000000/)
    await wa.close()
  })
})
