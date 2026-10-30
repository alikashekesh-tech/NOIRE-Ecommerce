import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Gallery } from '../components/Gallery'
import { Icon } from '../components/Icon'
import { ProductRail, WishlistButton } from '../components/ProductCard'
import { Breadcrumbs, DemoNotice, Price, QuantityStepper, Seo, Skeleton } from '../components/ui'
import { ProductInquiry } from '../components/WhatsApp'
import { cx, money } from '../lib/format'
import { useProduct, useProductsByIds, useSettings } from '../services/queries'
import { cart, modelStore, recentStore, rememberViewed } from '../store/shop'
import type { ProductDetail, Variant } from '../types'

function Accordion({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-line">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between text-[14px] font-semibold">
        {title}
        <Icon name="plus" size={18} className="transition group-open:rotate-45" />
      </summary>
      <div className="pb-5 text-[14px] leading-relaxed text-ink/75">{children}</div>
    </details>
  )
}

function useVariantSelection(product: ProductDetail | undefined, requestedColor: string | null) {
  const remembered = modelStore.use()
  const [modelId, setModelId] = useState<number | null>(null)
  const [color, setColor] = useState<string | null>(null)

  useEffect(() => {
    if (!product) return
    const models = product.device_models
    // Colour chosen on a product card wins, then the remembered model, then the first in-stock option.
    const wanted = requestedColor && product.variants.some((v) => v.color_name === requestedColor) ? requestedColor : null
    const fits = (m: { id: number }) => !wanted || product.variants.some((v) => v.device_model_id === m.id && v.color_name === wanted)
    const preferred =
      models.find((m) => m.slug === remembered && fits(m)) ??
      models.find((m) => fits(m) && product.variants.some((v) => v.device_model_id === m.id && v.in_stock && (!wanted || v.color_name === wanted))) ??
      models.find(fits) ??
      models[0]
    const mId = preferred?.id ?? null
    const firstColor =
      wanted ??
      product.variants.find((v) => v.device_model_id === mId && v.in_stock)?.color_name ??
      product.variants.find((v) => v.device_model_id === mId)?.color_name ??
      product.variants[0]?.color_name ??
      null
    setModelId(mId)
    setColor(firstColor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id])

  const colors = useMemo(() => [...new Map((product?.variants ?? []).map((v) => [v.color_name, v.color_hex])).entries()], [product])
  const find = (m: number | null, c: string | null): Variant | undefined => product?.variants.find((v) => v.device_model_id === m && v.color_name === c)
  const variant = find(modelId, color)

  return { modelId, setModelId, color, setColor, colors, variant, find }
}

export default function Product() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const { data: product, isLoading, error } = useProduct(slug)
  const { data: settings } = useSettings()
  const { modelId, setModelId, color, setColor, colors, variant, find } = useVariantSelection(product, searchParams.get('color'))
  const [qty, setQty] = useState(1)
  const [custom, setCustom] = useState({ text: '', colors: '', instructions: '' })
  const [showSticky, setShowSticky] = useState(false)
  const buyRef = useRef<HTMLDivElement>(null)
  const recentIds = recentStore.use().filter((id) => id !== product?.id).slice(0, 4)
  const { data: recent } = useProductsByIds(recentIds)

  useEffect(() => {
    if (product) rememberViewed(product.id)
  }, [product])
  useEffect(() => setQty(1), [variant?.id])
  useEffect(() => {
    // Show the mobile purchase bar only once the main Add to Bag area has scrolled above the viewport.
    // (Position-based rather than IntersectionObserver, which misses jumps that skip over the element.)
    const update = () => {
      const el = buyRef.current
      setShowSticky(!!el && el.getBoundingClientRect().bottom < 0)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [product])

  if (error) {
    return (
      <div className="container-lux py-32 text-center">
        <h1 className="heading-section">This piece isn’t available</h1>
        <p className="mt-4 text-muted">It may have been archived or the link is incorrect.</p>
        <Link to="/shop" className="btn btn-primary mt-8">
          Continue shopping
        </Link>
      </div>
    )
  }
  if (isLoading || !product) {
    return (
      <div className="container-wide grid gap-10 py-10 lg:grid-cols-2">
        <Skeleton className="aspect-[4/5]" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-40" />
        </div>
      </div>
    )
  }

  const models = product.device_models
  const modelName = models.find((m) => m.id === modelId)?.name ?? null
  const canAdd = !!variant && variant.in_stock
  const maxQty = Math.max(1, Math.min(10, variant?.stock ?? 1))
  const addToBag = () => {
    if (!variant) return
    cart.add(variant.id, qty, product.is_customizable ? custom : null)
  }
  const ctaLabel = !variant ? (models.length ? 'Unavailable for this model' : 'Select a colour') : !variant.in_stock ? 'Sold out' : 'Add to Bag'
  const url = typeof window !== 'undefined' ? `${window.location.origin}/products/${product.slug}` : `/products/${product.slug}`
  const savings = variant?.compare_at_price ? Number(variant.compare_at_price) - Number(variant.price) : 0

  const jsonLd = variant && {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.short_description,
    image: product.media.filter((m) => m.type === 'image').map((m) => window.location.origin + m.url),
    sku: variant.sku,
    brand: { '@type': 'Brand', name: 'NOIRÉ' },
    offers: { '@type': 'Offer', priceCurrency: 'USD', price: variant.price, availability: variant.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url },
  }

  return (
    <>
      <Seo title={product.seo.title} description={product.seo.description} />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}

      <div className="container-wide pt-6 md:pt-8">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, ...(product.collection ? [{ label: product.collection.name, to: `/collections/${product.collection.slug}` }] : []), { label: product.name }]} />
      </div>

      <section className="container-wide grid grid-cols-1 gap-8 pb-16 pt-6 md:pb-24 lg:grid-cols-12 lg:gap-12 xl:gap-16">
        <div className="lg:col-span-7">
          <Gallery media={product.media} activeColor={color} name={product.name} />
        </div>

        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-muted">{product.labels.filter((l) => l !== 'Best Seller').join(' · ') || product.collection?.name}</p>
                <h1 className="mt-3 font-display text-[34px] leading-[1.05] md:text-[44px]">{product.name}</h1>
              </div>
              <WishlistButton productId={product.id} name={product.name} className="mt-1 shrink-0 border border-line bg-surface" />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-[20px]">
              {variant ? <Price price={variant.price} compare={variant.compare_at_price} /> : <span>{money(product.price)}</span>}
              {savings > 0 && product.type === 'bundle' && <span className="rounded-full bg-soft px-3 py-1 text-[12px] font-semibold">Save {money(savings)} as a set</span>}
            </div>
            {product.short_description && <p className="mt-4 text-[15px] leading-relaxed text-ink/75">{product.short_description}</p>}

            <div className="mt-8 space-y-6">
              {models.length > 0 && (
                <fieldset>
                  <legend className="mb-3 flex w-full justify-between text-[13px] font-semibold">
                    <span>iPhone model</span>
                    <span className="font-normal text-muted">{modelName}</span>
                  </legend>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="iPhone model">
                    {models.map((m) => {
                      const available = product.variants.some((v) => v.device_model_id === m.id)
                      const withColor = find(m.id, color)
                      return (
                        <button
                          key={m.id}
                          type="button"
                          role="radio"
                          aria-checked={modelId === m.id}
                          className={cx('chip', withColor && !withColor.in_stock && 'opacity-60')}
                          disabled={!available}
                          onClick={() => {
                            setModelId(m.id)
                            if (!find(m.id, color)) setColor(product.variants.find((v) => v.device_model_id === m.id)?.color_name ?? color)
                          }}
                        >
                          {m.short_name}
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-[12px] text-muted">Only models this design is configured for are shown.</p>
                </fieldset>
              )}

              <fieldset>
                <legend className="mb-3 flex w-full justify-between text-[13px] font-semibold">
                  <span>Colour</span>
                  <span className="font-normal text-muted">{color}</span>
                </legend>
                <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Colour">
                  {colors.map(([name, hex]) => {
                    const v = find(modelId, name)
                    const soldOut = !v || !v.in_stock
                    return (
                      <button
                        key={name}
                        type="button"
                        role="radio"
                        aria-checked={color === name}
                        aria-label={`${name}${!v ? ', available for other models' : !v.in_stock ? ', sold out' : ''}`}
                        title={!v ? `${name} — available for other iPhone models` : !v.in_stock ? `${name} — sold out for this model` : name}
                        onClick={() => {
                          setColor(name)
                          // Colour not made for this model: switch to a model that offers it (prefer in stock).
                          if (!v) {
                            const options = product.variants.filter((x) => x.color_name === name)
                            const next = options.find((x) => x.in_stock) ?? options[0]
                            if (next) setModelId(next.device_model_id)
                          }
                        }}
                        className={cx('relative h-11 w-11 cursor-pointer rounded-full border-2 p-0.5 transition', color === name ? 'border-ink' : 'border-transparent hover:border-line-strong')}
                      >
                        <span className={cx('block h-full w-full rounded-full border border-ink/15 transition-opacity', soldOut && 'opacity-40')} style={{ background: hex }} />
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              {product.is_customizable && (
                <fieldset className="rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:p-5">
                  <legend className="px-1 text-[13px] font-semibold">Personalise (optional)</legend>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="pz-text" className="label">
                        Name or initials <span className="font-normal text-muted">(up to 20 characters)</span>
                      </label>
                      <input id="pz-text" className="field" maxLength={20} value={custom.text} onChange={(e) => setCustom({ ...custom, text: e.target.value })} placeholder="e.g. L.H." />
                    </div>
                    <div>
                      <label htmlFor="pz-colors" className="label">
                        Colour preferences
                      </label>
                      <input id="pz-colors" className="field" maxLength={60} value={custom.colors} onChange={(e) => setCustom({ ...custom, colors: e.target.value })} placeholder="e.g. ivory lettering" />
                    </div>
                    <div>
                      <label htmlFor="pz-notes" className="label">
                        Special instructions
                      </label>
                      <textarea id="pz-notes" className="field min-h-20" maxLength={300} value={custom.instructions} onChange={(e) => setCustom({ ...custom, instructions: e.target.value })} />
                    </div>
                    <p className="text-[12px] text-muted">
                      Have an inspiration image? <Link to={`/custom?product=${product.id}`} className="underline underline-offset-4">Send a custom design request</Link>.
                    </p>
                  </div>
                </fieldset>
              )}

              {variant?.components && (
                <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
                  <p className="mb-3 text-[13px] font-semibold">Included in this set</p>
                  <ul className="space-y-3">
                    {variant.components.map((c) => (
                      <li key={c.variant_id} className="flex items-center gap-3">
                        {c.image && <img src={c.image} alt="" className="h-14 w-11 rounded-md object-cover" />}
                        <div className="flex-1 text-[13px]">
                          <Link to={`/products/${c.slug}`} className="font-semibold hover:underline">
                            {c.name}
                          </Link>
                          <p className="text-muted">{c.label}</p>
                        </div>
                        <span className="text-[13px] text-muted tabular-nums">{money(c.price)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div ref={buyRef} className="space-y-3">
                <p className="text-[13px]" aria-live="polite">
                  {!variant ? (
                    <span className="text-muted">This colour isn’t offered for the selected model.</span>
                  ) : !variant.in_stock ? (
                    <span className="font-semibold text-danger">Sold out for this selection</span>
                  ) : variant.low_stock ? (
                    <span className="font-semibold">Only {variant.stock} left (demo stock)</span>
                  ) : (
                    <span className="text-success">● In stock</span>
                  )}
                  {variant && <span className="ml-3 text-[11px] uppercase tracking-wider text-muted">SKU {variant.sku}</span>}
                </p>
                <div className="flex gap-3">
                  <QuantityStepper value={qty} onChange={setQty} max={maxQty} />
                  <button type="button" className="btn btn-primary flex-1" disabled={!canAdd} onClick={addToBag} data-testid="add-to-bag">
                    {ctaLabel}
                    {canAdd && <span className="font-normal normal-case tracking-normal opacity-80 max-[380px]:hidden">· {money(Number(variant!.price) * qty)}</span>}
                  </button>
                </div>
                <ProductInquiry ctx={{ product: product.name, url, model: modelName, color, sku: variant?.sku }} />
              </div>

              <ul className="grid grid-cols-3 gap-2 border-y border-line py-5 text-center text-[11px] font-medium text-ink/75">
                <li className="flex flex-col items-center gap-1.5"><Icon name="truck" size={20} />Delivery across Lebanon</li>
                <li className="flex flex-col items-center gap-1.5"><Icon name="shield" size={20} />Raised edge protection</li>
                <li className="flex flex-col items-center gap-1.5"><Icon name={product.is_handmade ? 'hand' : 'sparkle'} size={20} />{product.is_handmade ? 'Finished by hand' : 'Designed by NOIRÉ'}</li>
              </ul>

              <div>
                <Accordion title="Description" open>
                  {product.description?.split('\n').filter(Boolean).map((p, i) => <p key={i} className="mb-3 last:mb-0">{p}</p>)}
                </Accordion>
                {Object.keys(product.specs).length > 0 && (
                  <Accordion title="Materials & details">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                      {Object.entries(product.specs).map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt className="font-semibold text-ink">{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </Accordion>
                )}
                {product.production_days && (
                  <Accordion title="Production time">
                    Handmade to order — estimated {product.production_days.min}–{product.production_days.max} business days before dispatch (demo estimate).
                  </Accordion>
                )}
                {product.care_instructions && <Accordion title="Care">{product.care_instructions}</Accordion>}
                <Accordion title="Delivery">
                  {settings?.shipping.delivery_note ?? 'Delivery across Lebanon.'}
                  {settings?.shipping.free_threshold ? ` Free standard delivery on orders over ${money(settings.shipping.free_threshold)} (demo offer).` : ''}
                </Accordion>
              </div>
              <DemoNotice>Demonstration product. Name, price, stock and specifications are sample data and imagery is a demo render.</DemoNotice>
            </div>
          </div>
        </div>
      </section>

      {product.matching.length > 0 && (
        <section className="border-t border-line bg-soft/60 py-16 md:py-24" aria-label="Complete the look">
          <div className="container-wide">
            <div className="mb-8 md:mb-12">
              <p className="eyebrow mb-3 text-muted">Complete the Look</p>
              <h2 className="heading-section">Buy the Matching Set</h2>
            </div>
            <ProductRail products={product.matching} />
          </div>
        </section>
      )}
      {product.related.length > 0 && (
        <section className="container-wide py-16 md:py-24" aria-label="You may also like">
          <h2 className="heading-section mb-8 md:mb-12">You may also like</h2>
          <ProductRail products={product.related} />
        </section>
      )}
      {recent && recent.length > 0 && (
        <section className="container-wide pb-8" aria-label="Recently viewed">
          <h2 className="mb-8 font-display text-3xl">Recently viewed</h2>
          <ProductRail products={recent} />
        </section>
      )}

      {/* Sticky purchase bar on mobile */}
      <div className={cx('fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ivory/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur transition-transform duration-300 lg:hidden', showSticky ? 'translate-y-0' : 'translate-y-full')} aria-hidden={!showSticky}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{product.name}</p>
            <p className="truncate text-[12px] text-muted">{[modelName, color].filter(Boolean).join(' · ')}</p>
          </div>
          <button type="button" className="btn btn-primary btn-sm h-12" disabled={!canAdd} onClick={addToBag} tabIndex={showSticky ? 0 : -1}>
            {canAdd ? `Add · ${money(variant!.price)}` : ctaLabel}
          </button>
        </div>
      </div>
    </>
  )
}
