import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Icon } from '../components/Icon'
import { Newsletter } from '../components/Newsletter'
import { ProductGrid, ProductRail } from '../components/ProductCard'
import { Price, SectionHeading, Seo, Skeleton } from '../components/ui'
import { cx, money } from '../lib/format'
import { useHome, useSettings } from '../services/queries'
import { cart, modelStore } from '../store/shop'
import type { ProductDetail } from '../types'

function Hero() {
  const { data } = useHome()
  const hero = data?.hero
  return (
    <section className="relative isolate overflow-hidden bg-[#E4D8C6]" aria-labelledby="hero-title">
      {hero?.image_desktop && (
        <picture className="absolute inset-0 -z-10">
          {hero.image_mobile && <source media="(max-width: 767px)" srcSet={hero.image_mobile} />}
          <img src={hero.image_desktop} alt="NOIRÉ cases and matching power bank (demo campaign artwork)" fetchPriority="high" className="h-full w-full object-cover object-center animate-fade-in" />
        </picture>
      )}
      <div className="container-wide flex min-h-[calc(100svh-96px)] flex-col justify-start pb-12 pt-14 md:min-h-[600px] md:justify-center md:py-24 lg:min-h-[680px] xl:min-h-[720px]">
        <div className="max-w-xl animate-fade-up md:max-w-[560px]">
          {hero?.eyebrow && <p className="eyebrow mb-5 text-ink/70">{hero.eyebrow}</p>}
          <h1 id="hero-title" className="heading-hero">
            {hero?.title ?? 'Your Phone. Your Signature.'}
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink/75 md:mt-6 md:text-[17px]">{hero?.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {hero?.primary_label && (
              <Link to={hero.primary_url || '/shop'} className="btn btn-primary">
                {hero.primary_label}
              </Link>
            )}
            {hero?.secondary_label && (
              <Link to={hero.secondary_url || '/collections/handmade-creations'} className="btn btn-outline bg-ivory/40 backdrop-blur">
                {hero.secondary_label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function ModelSelector() {
  const { data } = useSettings()
  const navigate = useNavigate()
  const remembered = modelStore.use()
  const families = useMemo(() => {
    const map = new Map<string, NonNullable<typeof data>['device_models']>()
    data?.device_models.forEach((m) => map.set(m.family ?? '', [...(map.get(m.family ?? '') ?? []), m]))
    return [...map.entries()]
  }, [data])

  return (
    <section className="container-wide py-16 md:py-24" aria-labelledby="models-title">
      <div className="mb-8 flex flex-col items-center text-center md:mb-12">
        <p className="eyebrow mb-3 text-muted">Find your fit</p>
        <h2 id="models-title" className="heading-section">
          Shop by iPhone Model
        </h2>
      </div>
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        {families.map(([family, models]) => (
          <div key={family}>
            <p className="mb-3 text-center text-[12px] font-semibold uppercase tracking-[0.2em] text-muted md:text-left">{family}</p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {models.map((m) => (
                <button
                  key={m.slug}
                  type="button"
                  onClick={() => {
                    modelStore.set(m.slug)
                    navigate(`/shop?model=${m.slug}`)
                  }}
                  className={cx(
                    'group flex aspect-[5/4] flex-col items-center justify-center rounded-[var(--radius-card)] border bg-surface px-2 transition duration-300 hover:-translate-y-0.5 hover:border-ink hover:shadow-soft',
                    remembered === m.slug ? 'border-ink' : 'border-line',
                  )}
                  aria-label={`Shop ${m.name} cases`}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">iPhone</span>
                  <span className="mt-1 font-display text-[30px] leading-none sm:text-[36px] lg:text-[42px]">{m.short_name.split(' ')[0]}</span>
                  <span className="mt-1.5 min-h-[1.2em] text-[12px] font-medium sm:text-[13px]">{m.short_name.split(' ').slice(1).join(' ')}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Collections() {
  const { data } = useHome()
  return (
    <section className="container-wide pb-16 md:pb-28" aria-labelledby="collections-title">
      <SectionHeading eyebrow="The Collections" title="Shop by Collection" />
      <h2 id="collections-title" className="sr-only">
        Collections
      </h2>
      <div className="grid gap-4 md:grid-cols-3 md:gap-5 lg:gap-6">
        {(data?.collections ?? Array.from({ length: 3 })).map((c, i) =>
          c ? (
            <Link key={c.slug} to={`/collections/${c.slug}`} className="group relative block overflow-hidden rounded-[var(--radius-card)] bg-soft">
              <div className="aspect-[4/5] max-md:aspect-square">
                {c.image && <img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover object-top transition-transform duration-300 ease-out group-hover:scale-[1.015]" />}
              </div>
              <div className={cx('pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t', i === 2 ? 'from-ink/80 to-transparent' : 'from-ivory/85 to-transparent')} aria-hidden="true" />
              <div className={cx('absolute inset-x-0 bottom-0 p-6 md:p-8', i === 2 ? 'text-ivory' : 'text-ink')}>
                <p className="eyebrow mb-2 opacity-70">{c.count} pieces</p>
                <h3 className="font-display text-[30px] md:text-[36px]">{c.name}</h3>
                <p className="mt-1 max-w-xs text-[14px] opacity-80">{c.tagline}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em]">
                  Explore <Icon name="arrowRight" size={16} className="transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ) : (
            <Skeleton key={i} className="aspect-[4/5]" />
          ),
        )}
      </div>
    </section>
  )
}

function CompleteTheLook() {
  const { data } = useHome()
  const look = data?.complete_the_look
  const bundle = look?.bundle as ProductDetail | null | undefined
  const remembered = modelStore.use()
  const models = bundle?.device_models ?? []
  const colors = [...new Map((bundle?.variants ?? []).map((v) => [v.color_name, v])).values()]
  const [modelId, setModelId] = useState<number | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const activeModel = modelId ?? models.find((m) => m.slug === remembered)?.id ?? models[0]?.id ?? null
  const activeColor = color ?? colors[0]?.color_name ?? null
  const variant = bundle?.variants.find((v) => v.device_model_id === activeModel && v.color_name === activeColor)

  if (!bundle) return null
  const components = variant?.components ?? bundle.variants[0]?.components ?? []
  const image = bundle.media.find((m) => m.color_name === activeColor) ?? bundle.media[0]
  const savings = variant?.compare_at_price ? Number(variant.compare_at_price) - Number(variant.price) : 0

  return (
    <section className="bg-ink text-ivory" aria-labelledby="look-title">
      <div className="container-wide grid items-center gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-24">
        <div className="overflow-hidden rounded-[var(--radius-card)]">{image && <img src={image.url} alt={image.alt} loading="lazy" className="aspect-[4/5] w-full object-cover" />}</div>
        <div>
          <p className="eyebrow mb-4 text-ivory/60">{look?.eyebrow ?? 'Complete the Look'}</p>
          <h2 id="look-title" className="heading-section">
            {look?.title}
          </h2>
          <p className="mt-4 max-w-md text-ivory/70">{look?.description}</p>

          <ul className="mt-8 space-y-3">
            {components.map((c) => (
              <li key={c.variant_id} className="flex items-center gap-4 rounded-xl border border-ivory/10 bg-ivory/[0.04] p-3">
                {c.image && <img src={c.image} alt="" className="h-16 w-13 rounded-md object-cover" loading="lazy" />}
                <div className="flex-1">
                  <Link to={`/products/${c.slug}`} className="text-[14px] font-semibold hover:underline">
                    {c.name}
                  </Link>
                  <p className="text-[12px] text-ivory/55">Sold separately {money(c.price)}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-4">
            <div>
              <p className="mb-2 text-[12px] uppercase tracking-[0.16em] text-ivory/55">iPhone model</p>
              <div className="flex flex-wrap gap-2">
                {models.map((m) => (
                  <button key={m.id} type="button" onClick={() => setModelId(m.id)} aria-pressed={activeModel === m.id} className={cx('chip border-ivory/25 bg-transparent text-ivory', activeModel === m.id && '!bg-ivory !text-ink')}>
                    {m.short_name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[12px] uppercase tracking-[0.16em] text-ivory/55">Tone · {activeColor}</p>
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button key={c.color_name} type="button" onClick={() => setColor(c.color_name)} aria-pressed={activeColor === c.color_name} aria-label={c.color_name} className={cx('h-9 w-9 rounded-full border-2', activeColor === c.color_name ? 'border-ivory' : 'border-transparent')}>
                    <span className="block h-full w-full rounded-full border border-ivory/30" style={{ background: c.color_hex }} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            {variant && <Price price={variant.price} compare={variant.compare_at_price} className="text-xl [&_s]:text-ivory/50" />}
            {savings > 0 && <span className="rounded-full bg-ivory/10 px-3 py-1 text-[12px]">Save {money(savings)} as a set</span>}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn btn-light" disabled={!variant?.in_stock} onClick={() => variant && cart.add(variant.id)}>
              {variant?.in_stock ? 'Add the set to bag' : 'Set unavailable for this choice'}
            </button>
            <Link to={`/products/${bundle.slug}`} className="btn btn-ghost-light">
              View the matching set
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function HandmadeStory() {
  const { data } = useHome()
  const s = data?.handmade_story
  if (!s?.title) return null
  return (
    <section className="container-wide py-16 md:py-28" aria-labelledby="story-title">
      <div className="grid items-center gap-10 md:grid-cols-12 md:gap-12">
        <div className="overflow-hidden rounded-[var(--radius-card)] md:col-span-6 lg:col-span-5">{s.image && <img src={s.image} alt="A hand-embroidered NOIRÉ case (demo artwork)" loading="lazy" className="aspect-[4/5] w-full object-cover" />}</div>
        <div className="md:col-span-6 lg:col-span-6 lg:col-start-7">
          <p className="eyebrow mb-4 text-muted">{s.eyebrow}</p>
          <h2 id="story-title" className="heading-section max-w-lg">
            {s.title}
          </h2>
          <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-ink/75 md:text-[17px]">{s.body}</p>
          <ul className="mt-8 grid max-w-lg grid-cols-3 gap-4 border-y border-line py-6 text-center">
            {[
              ['hand', 'Finished by hand'],
              ['sparkle', 'Personalisation available'],
              ['layers', 'Limited pieces'],
            ].map(([icon, label]) => (
              <li key={label} className="flex flex-col items-center gap-2 text-[12px] font-medium">
                <Icon name={icon as 'hand'} size={22} />
                {label}
              </li>
            ))}
          </ul>
          {s.cta_label && (
            <Link to={s.cta_url || '/collections/handmade-creations'} className="btn btn-primary mt-8">
              {s.cta_label}
            </Link>
          )}
          {s.note && <p className="mt-6 text-[12px] italic text-muted">{s.note}</p>}
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const { data, isLoading } = useHome()
  const { data: settings } = useSettings()
  const on = (key: string) => data?.sections?.[key] !== false

  return (
    <>
      <Seo title="NOIRÉ — Designed to Be Different" description={settings?.store.description} />
      <Hero />
      {on('models') && <ModelSelector />}
      {on('collections') && <Collections />}
      {on('bestsellers') && (
        <section className="container-wide pb-16 md:pb-28" aria-label="Best sellers">
          <SectionHeading
            eyebrow="Most loved"
            title="Best Sellers"
            action={
              <Link to="/shop?bestseller=1" className="link-underline text-[13px] font-semibold uppercase tracking-[0.14em]">
                View all
              </Link>
            }
          />
          <ProductRail products={data?.bestsellers} loading={isLoading} />
        </section>
      )}
      {on('complete_the_look') && <CompleteTheLook />}
      {on('handmade_story') && <HandmadeStory />}
      {on('new_arrivals') && (
        <section className="container-wide pb-16 md:pb-24" aria-label="New arrivals">
          <SectionHeading
            eyebrow="Just in"
            title="New Arrivals"
            action={
              <Link to="/shop?new=1&sort=newest" className="link-underline text-[13px] font-semibold uppercase tracking-[0.14em]">
                Shop new
              </Link>
            }
          />
          <ProductGrid products={data?.new_arrivals.slice(0, 8)} loading={isLoading} />
        </section>
      )}
      {on('newsletter') && (
        <section className="container-lux" aria-labelledby="nl-title">
          <div className="mx-auto max-w-2xl rounded-[var(--radius-card)] border border-line bg-surface px-6 py-12 text-center md:px-12 md:py-16">
            <p className="eyebrow mb-3 text-muted">The NOIRÉ letter</p>
            <h2 id="nl-title" className="heading-section">
              Be first to the next edit.
            </h2>
            <p className="mx-auto mb-8 mt-4 max-w-md text-muted">New collections, handmade drops and styling notes — occasionally, never noisy.</p>
            <div className="mx-auto max-w-md text-left">
              <Newsletter source="homepage" />
            </div>
          </div>
        </section>
      )}
    </>
  )
}
