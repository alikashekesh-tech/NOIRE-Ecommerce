import { Link } from 'react-router'
import { AskAboutCart, CartLine, FreeShippingMeter } from '../components/CartDrawer'
import { DemoBadge, Seo, Skeleton } from '../components/ui'
import { money } from '../lib/format'
import { useQuote } from '../services/queries'
import { useCartItems } from '../store/shop'

export default function Cart() {
  const items = useCartItems()
  const { data: quote, isLoading } = useQuote(items)

  return (
    <div className="container-lux py-10 md:py-16">
      <Seo title="Your Bag" />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-12">
        <h1 className="heading-section">Your Bag</h1>
        <DemoBadge />
      </div>
      {items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong py-24 text-center">
          <p className="font-display text-3xl">Your bag is empty</p>
          <Link to="/shop" className="btn btn-primary mt-8">
            Shop the Collection
          </Link>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-12">
          <ul className="divide-y divide-line border-y border-line lg:col-span-8">
            {isLoading && !quote ? <Skeleton className="my-5 h-32" /> : items.map((item, i) => <CartLine key={item.key} item={item} line={quote?.lines[i]} />)}
          </ul>
          <aside className="lg:col-span-4">
            <div className="card space-y-4 p-6 lg:sticky lg:top-28">
              <h2 className="font-display text-2xl">Order summary</h2>
              {quote && <FreeShippingMeter subtotal={Number(quote.subtotal)} threshold={quote.free_shipping_threshold} />}
              <dl className="space-y-2 text-[15px]">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd className="font-semibold tabular-nums">{money(quote?.subtotal)}</dd>
                </div>
                <div className="flex justify-between text-muted">
                  <dt>Delivery</dt>
                  <dd>Calculated at checkout</dd>
                </div>
              </dl>
              {quote && !quote.can_checkout && <p className="text-[13px] text-danger">Please update the highlighted items before checking out.</p>}
              <Link to="/checkout" className={`btn btn-primary w-full ${quote?.can_checkout ? '' : 'pointer-events-none opacity-45'}`} aria-disabled={!quote?.can_checkout}>
                Proceed to checkout
              </Link>
              <Link to="/shop" className="btn btn-outline w-full">
                Continue shopping
              </Link>
              {quote && <AskAboutCart lines={quote.lines} total={quote.subtotal} />}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
