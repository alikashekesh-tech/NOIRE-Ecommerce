import { Link } from 'react-router'
import { money } from '../lib/format'
import { buildCartMessage } from '../lib/whatsapp'
import { useQuote } from '../services/queries'
import { cart, ui, useCartItems, useUi } from '../store/shop'
import type { CartItem, QuoteLine } from '../types'
import { ChatGlyph, Icon } from './Icon'
import { DemoBadge, QuantityStepper, Sheet, Spinner } from './ui'
import { useWhatsApp } from './WhatsApp'

export function CartLine({ item, line, compact = false }: { item: CartItem; line?: QuoteLine; compact?: boolean }) {
  if (!line) return null
  if (!line.product) {
    return (
      <li className="flex items-center justify-between gap-3 py-4 text-sm text-muted">
        <span>An item in your bag is no longer available.</span>
        <button type="button" className="underline" onClick={() => cart.remove(item.key)}>
          Remove
        </button>
      </li>
    )
  }
  return (
    <li className="flex gap-4 py-5">
      <Link to={`/products/${line.product.slug}`} onClick={ui.closeCart} className="w-20 shrink-0 overflow-hidden rounded-lg bg-soft sm:w-24">
        {line.product.image && <img src={line.product.image} alt="" className="aspect-[4/5] w-full object-cover" loading="lazy" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/products/${line.product.slug}`} onClick={ui.closeCart} className="block truncate text-[14px] font-semibold hover:underline">
              {line.product.name}
            </Link>
            <p className="mt-0.5 text-[13px] text-muted">{[line.device_model, line.color_name].filter(Boolean).join(' · ')}</p>
            {line.components && <p className="mt-0.5 text-[12px] text-muted">Includes: {line.components.map((c) => c.name).join(' + ')}</p>}
            {line.customization?.text && <p className="mt-0.5 text-[12px] text-muted">Personalisation: “{line.customization.text}”</p>}
            {!compact && <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted/80">SKU {line.sku}</p>}
          </div>
          <p className="shrink-0 text-[14px] font-medium tabular-nums">{money(line.line_total)}</p>
        </div>
        {line.issues.length > 0 && (
          <p className="mt-2 text-[12px] font-medium text-danger" role="alert">
            {line.issues.join(' · ')}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <QuantityStepper size="sm" value={item.quantity} max={Math.max(1, Math.min(10, line.stock ?? 10))} onChange={(q) => cart.setQuantity(item.key, q)} label={`Quantity for ${line.product.name}`} />
          <button type="button" className="text-[12px] text-muted underline underline-offset-4 hover:text-ink" onClick={() => cart.remove(item.key)}>
            Remove
          </button>
        </div>
      </div>
    </li>
  )
}

export function FreeShippingMeter({ subtotal, threshold }: { subtotal: number; threshold: number | null }) {
  if (!threshold) return null
  const remaining = threshold - subtotal
  const pct = Math.min(100, (subtotal / threshold) * 100)
  return (
    <div className="rounded-xl bg-soft px-4 py-3">
      <p className="text-[13px]">{remaining > 0 ? <>You’re {money(remaining)} away from free standard delivery.</> : <>Your order qualifies for free standard delivery.</>}</p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div className="h-full bg-ink transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function AskAboutCart({ lines, total }: { lines: QuoteLine[]; total: string }) {
  const { enabled, send, previewSheet } = useWhatsApp()
  if (!enabled || !lines.length) return null
  return (
    <>
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 py-2 text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
        onClick={() =>
          send(
            buildCartMessage(
              lines.filter((l) => l.product).map((l) => ({ name: l.product!.name, quantity: l.quantity, model: l.device_model, color: l.color_name, customization: l.customization })),
              money(total),
            ),
          )
        }
      >
        <ChatGlyph size={16} /> Ask about my bag on WhatsApp
      </button>
      {previewSheet}
    </>
  )
}

export function CartDrawer() {
  const { cartOpen } = useUi()
  const items = useCartItems()
  const { data: quote, isFetching } = useQuote(items)
  const lines = quote?.lines ?? []

  return (
    <Sheet
      open={cartOpen}
      onClose={ui.closeCart}
      title={`Your Bag${items.length ? ` (${items.reduce((n, i) => n + i.quantity, 0)})` : ''}`}
      footer={
        items.length > 0 && quote ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[15px]">
              <span>Subtotal</span>
              <span className="flex items-center gap-2 font-semibold tabular-nums">
                {isFetching && <Spinner className="text-muted" />}
                {money(quote.subtotal)}
              </span>
            </div>
            <p className="text-[12px] text-muted">Delivery calculated at checkout. Prices are verified by the store before ordering.</p>
            <Link to="/checkout" onClick={ui.closeCart} className={`btn btn-primary w-full ${quote.can_checkout ? '' : 'pointer-events-none opacity-45'}`} aria-disabled={!quote.can_checkout}>
              Checkout
            </Link>
            <Link to="/cart" onClick={ui.closeCart} className="btn btn-outline w-full">
              View bag
            </Link>
            <AskAboutCart lines={lines} total={quote.subtotal} />
          </div>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center py-16 text-center">
          <Icon name="bag" size={36} className="text-muted" />
          <p className="mt-4 font-display text-2xl">Your bag is empty</p>
          <p className="mt-2 text-sm text-muted">Discover cases designed to be different.</p>
          <Link to="/shop" onClick={ui.closeCart} className="btn btn-primary mt-6">
            Shop the Collection
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between">
            <DemoBadge />
          </div>
          {quote && <FreeShippingMeter subtotal={Number(quote.subtotal)} threshold={quote.free_shipping_threshold} />}
          <ul className="divide-y divide-line" aria-busy={isFetching}>
            {items.map((item, i) => (
              <CartLine key={item.key} item={item} line={lines[i]} compact />
            ))}
          </ul>
        </>
      )}
    </Sheet>
  )
}
