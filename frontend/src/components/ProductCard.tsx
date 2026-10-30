import { useState } from 'react'
import { Link } from 'react-router'
import { cx, money, priceRange } from '../lib/format'
import { cart, ui, useWishlist, wishlist } from '../store/shop'
import type { ProductCard as Card } from '../types'
import { Icon } from './Icon'
import { Skeleton } from './ui'

export function WishlistButton({ productId, name, className }: { productId: number; name: string; className?: string }) {
  const saved = useWishlist().includes(productId)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        wishlist.toggle(productId)
        ui.toast(saved ? 'Removed from wishlist' : 'Saved to wishlist')
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      className={cx('grid h-10 w-10 place-items-center rounded-full bg-ivory/85 backdrop-blur transition hover:bg-ivory', className)}
    >
      <Icon name="heart" size={18} fill={saved ? 'currentColor' : 'none'} />
    </button>
  )
}

const MAX_SWATCHES = 6

/**
 * Colour swatches as an accessible radio group. Every colour can be previewed (sold-out ones are
 * shown faded and announced as sold out — they are never `disabled`, so there is no not-allowed cursor).
 * Purchasing is still enforced on the product page and by the server.
 */
function Swatches({ product, selected, onSelect }: { product: Card; selected: string; onSelect: (name: string) => void }) {
  const shown = product.colors.slice(0, MAX_SWATCHES)
  return (
    <div role="radiogroup" aria-label={`${product.name} colours`} className="-mr-1.5 flex flex-wrap items-center">
      {shown.map((c, i) => {
        const active = c.name === selected
        const name = c.in_stock ? c.name : `${c.name} · Sold out`
        return (
          <button
            key={c.name}
            type="button"
            role="radio"
            data-color={c.name}
            aria-checked={active}
            aria-label={c.in_stock ? c.name : `${c.name}, sold out`}
            tabIndex={active ? 0 : -1}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onSelect(c.name)
            }}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
              e.preventDefault()
              const next = shown[(i + (e.key === 'ArrowRight' ? 1 : -1) + shown.length) % shown.length]
              onSelect(next.name)
              const buttons = Array.from(e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[data-color]') ?? [])
              buttons.find((b) => b.dataset.color === next.name)?.focus()
            }}
            className="group/sw relative grid h-8 w-8 cursor-pointer place-items-center rounded-full outline-offset-0"
          >
            <span
              className={cx(
                'block h-4 w-4 rounded-full border border-ink/15 transition-[box-shadow,opacity] duration-200',
                active ? 'shadow-[0_0_0_2px_#FAF7F1,0_0_0_3px_#17181C]' : 'group-hover/sw:shadow-[0_0_0_2px_#FAF7F1,0_0_0_3px_#CFC9BF]',
                !c.in_stock && 'opacity-35',
              )}
              style={{ background: c.hex }}
            />
            {/* Desktop tooltip (hover-capable devices only); mobile shows the name line below. */}
            {/* Rendered only while hovered/focused (no layout footprint otherwise); right-anchored so it never spills past the card edge. */}
            <span className="pointer-events-none absolute bottom-full right-0 z-10 mb-1 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-ivory shadow-soft group-focus-visible/sw:block [@media(hover:hover)]:group-hover/sw:block" aria-hidden="true">
              {name}
            </span>
          </button>
        )
      })}
      {product.colors.length > MAX_SWATCHES && <span className="pl-1 text-[11px] text-muted">+{product.colors.length - MAX_SWATCHES}</span>}
    </div>
  )
}

export function ProductCard({ product, priority = false }: { product: Card; priority?: boolean }) {
  const label = product.labels[0]
  // Start on the colour shown in the primary photo, so the card never claims a colour it isn't showing.
  const [color, setColor] = useState(product.colors[0]?.name ?? '')
  const chosen = product.colors.find((c) => c.name === color)
  const isDefault = color === product.colors[0]?.name
  // If a colour has no dedicated photo, keep the current image rather than pretending it changed.
  const imageUrl = (!isDefault && chosen?.image) || product.image?.url
  const multiColour = product.colors.length > 1
  const href = `/products/${product.slug}${multiColour && color ? `?color=${encodeURIComponent(color)}` : ''}`

  return (
    <article className="group relative flex flex-col">
      <Link to={href} className="group/media relative block overflow-hidden rounded-[var(--radius-card)] bg-soft" aria-label={`${product.name}${multiColour ? `, ${color}` : ''}`}>
        <div className="aspect-[4/5]">
          {imageUrl && (
            <img
              key={imageUrl}
              src={imageUrl}
              alt={product.image?.alt ?? product.name}
              width={1200}
              height={1500}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              data-testid="card-image"
              className="h-full w-full animate-fade-in object-contain transition-transform duration-300 ease-out group-hover/media:scale-[1.015]"
            />
          )}
          {/* Alternate view of the same colour, only while hovering the image itself. */}
          {product.hover_image && isDefault && (
            <img
              src={product.hover_image.url}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-300 ease-out group-hover/media:opacity-100 max-md:hidden"
            />
          )}
        </div>
        {label && <span className="absolute left-3 top-3 rounded-full bg-ivory/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur">{label}</span>}
        {!product.in_stock && <span className="absolute bottom-3 left-3 rounded-full bg-ink px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ivory">Sold out</span>}
      </Link>
      <WishlistButton productId={product.id} name={product.name} className="absolute right-2.5 top-2.5" />

      <div className="flex flex-1 flex-col pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-sans text-[14px] font-semibold leading-snug tracking-normal md:text-[15px]">
            <Link to={href} className="hover:underline underline-offset-4">
              {product.name}
            </Link>
          </h3>
        </div>
        <p className="mt-1 text-[13px] text-muted">
          {product.type === 'bundle' ? 'Case + power bank' : product.type === 'power_bank' ? 'Power bank' : product.models.length >= 6 ? 'All iPhone 17 & 18 models' : product.models.map((m) => `iPhone ${m}`).slice(0, 2).join(', ') + (product.models.length > 2 ? ` +${product.models.length - 2}` : '')}
        </p>
        <div className="mt-1.5 flex min-h-8 flex-wrap items-center justify-between gap-x-2">
          <p className="text-[14px] font-medium tabular-nums">
            {priceRange(product.price, product.price_max)}
            {product.compare_at_price && <s className="ml-2 text-[13px] font-normal text-muted">{money(product.compare_at_price)}</s>}
          </p>
          {multiColour && <Swatches product={product} selected={color} onSelect={setColor} />}
        </div>
        {multiColour && (
          <p className="h-4 truncate text-[12px] leading-4 text-muted" aria-live="polite" data-testid="card-colour">
            {color}
            {chosen && !chosen.in_stock && product.in_stock && <span className="text-ink/70"> · Sold out in this colour</span>}
          </p>
        )}
        {product.quick_add_variant_id ? (
          <button type="button" onClick={() => cart.add(product.quick_add_variant_id!)} className="btn btn-outline btn-sm mt-3 w-full md:opacity-0 md:transition md:group-hover:opacity-100 md:focus-visible:opacity-100">
            Quick add
          </button>
        ) : null}
      </div>
    </article>
  )
}

export function ProductGrid({ products, loading, count = 8, className }: { products?: Card[]; loading?: boolean; count?: number; className?: string }) {
  return (
    <div className={cx('grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12', className)}>
      {loading && !products
        ? Array.from({ length: count }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[4/5]" />
              <Skeleton className="mt-4 h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </div>
          ))
        : products?.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
    </div>
  )
}

/** Horizontal scroll rail on mobile, grid on desktop. */
export function ProductRail({ products, loading }: { products?: Card[]; loading?: boolean }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:-mx-5 sm:px-5 md:mx-0 md:overflow-visible md:px-0">
      <div className="grid auto-cols-[46%] grid-flow-col gap-3 sm:auto-cols-[38%] md:grid-flow-row md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6">
        {loading && !products
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5]" />)
          : products?.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  )
}
