import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Icon } from '../components/Icon'
import { ProductGrid } from '../components/ProductCard'
import { Breadcrumbs, Seo, Sheet } from '../components/ui'
import { cx } from '../lib/format'
import { useCollection, useProducts, useSettings } from '../services/queries'
import { modelStore } from '../store/shop'
import type { Facets } from '../types'

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name: A to Z' },
]

const TOGGLES = [
  { key: 'handmade', label: 'Handmade' },
  { key: 'in_stock', label: 'In stock' },
  { key: 'new', label: 'New arrivals' },
  { key: 'matching', label: 'Has matching set' },
  { key: 'limited', label: 'Limited edition' },
  { key: 'bestseller', label: 'Best sellers' },
]

const PRICE_BANDS = [
  { label: 'Under $40', min: '', max: '40' },
  { label: '$40 – $60', min: '40', max: '60' },
  { label: '$60 – $100', min: '60', max: '100' },
  { label: '$100+', min: '100', max: '' },
]

function FilterGroup({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group border-b border-line py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-semibold uppercase tracking-[0.14em]">
        {title}
        <Icon name="chevronDown" size={16} className="transition group-open:rotate-180" />
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  )
}

function Filters({ params, set, toggleList, facets, hideCollection }: { params: URLSearchParams; set: (k: string, v: string | null) => void; toggleList: (k: string, v: string) => void; facets: Facets | null | undefined; hideCollection: boolean }) {
  const { data: settings } = useSettings()
  const list = (k: string) => (params.get(k) ?? '').split(',').filter(Boolean)
  return (
    <div>
      <FilterGroup title="iPhone model">
        <div className="flex flex-wrap gap-2">
          {settings?.device_models.map((m) => (
            <button
              key={m.slug}
              type="button"
              className="chip"
              aria-pressed={params.get('model') === m.slug}
              onClick={() => {
                const next = params.get('model') === m.slug ? null : m.slug
                modelStore.set(next)
                set('model', next)
              }}
            >
              {m.short_name}
            </button>
          ))}
        </div>
      </FilterGroup>
      {!hideCollection && (
        <FilterGroup title="Collection">
          <div className="flex flex-wrap gap-2">
            {settings?.collections.map((c) => (
              <button key={c.slug} type="button" className="chip" aria-pressed={params.get('collection') === c.slug} onClick={() => set('collection', params.get('collection') === c.slug ? null : c.slug)}>
                {c.name}
              </button>
            ))}
          </div>
        </FilterGroup>
      )}
      <FilterGroup title="Product type">
        <div className="flex flex-wrap gap-2">
          {facets?.types.map((t) => (
            <button key={t.value} type="button" className="chip" aria-pressed={list('type').includes(t.value)} onClick={() => toggleList('type', t.value)}>
              {t.label}
            </button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Colour">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          {facets?.colors.map((c) => {
            const on = list('color').includes(c.name)
            return (
              <button key={c.name} type="button" onClick={() => toggleList('color', c.name)} aria-pressed={on} className="flex items-center gap-2.5 text-left text-[14px]">
                <span className={cx('h-6 w-6 shrink-0 rounded-full border', on ? 'ring-2 ring-ink ring-offset-2 ring-offset-ivory' : 'border-ink/15')} style={{ background: c.hex }} />
                <span className={on ? 'font-semibold' : ''}>{c.name}</span>
              </button>
            )
          })}
        </div>
      </FilterGroup>
      <FilterGroup title="Price">
        <div className="flex flex-wrap gap-2">
          {PRICE_BANDS.map((b) => {
            const on = (params.get('min_price') ?? '') === b.min && (params.get('max_price') ?? '') === b.max
            return (
              <button
                key={b.label}
                type="button"
                className="chip"
                aria-pressed={on}
                onClick={() => {
                  set('min_price', on ? null : b.min || null)
                  set('max_price', on ? null : b.max || null)
                }}
              >
                {b.label}
              </button>
            )
          })}
        </div>
      </FilterGroup>
      <FilterGroup title="Material" defaultOpen={false}>
        <div className="space-y-2">
          {facets?.materials.map((m) => (
            <label key={m} className="flex cursor-pointer items-center gap-3 text-[14px]">
              <input type="checkbox" className="h-4 w-4 accent-ink" checked={list('material').includes(m)} onChange={() => toggleList('material', m)} />
              {m}
            </label>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Refine">
        <div className="space-y-2.5">
          {TOGGLES.map((t) => (
            <label key={t.key} className="flex cursor-pointer items-center gap-3 text-[14px]">
              <input type="checkbox" className="h-4 w-4 accent-ink" checked={params.get(t.key) === '1'} onChange={(e) => set(t.key, e.target.checked ? '1' : null)} />
              {t.label}
            </label>
          ))}
        </div>
      </FilterGroup>
    </div>
  )
}

export default function Shop() {
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()
  const [drawer, setDrawer] = useState(false)
  const { data: collection } = useCollection(slug)
  const { data: settings } = useSettings()

  // Apply a remembered model when arriving at the generic shop without one.
  useEffect(() => {
    const remembered = modelStore.get()
    if (!slug && !params.has('model') && remembered && !params.has('q') && !params.has('type')) {
      const next = new URLSearchParams(params)
      next.set('model', remembered)
      setParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const query = useMemo(() => {
    const q = new URLSearchParams(params)
    if (slug) q.set('collection', slug)
    q.set('facets', '1')
    return q.toString()
  }, [params, slug])
  const { data, isLoading, isFetching } = useProducts(query)

  const set = (key: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === null || value === '') next.delete(key)
        else next.set(key, value)
        next.delete('page')
        return next
      },
      { preventScrollReset: true },
    )
  const toggleList = (key: string, value: string) => {
    const current = (params.get(key) ?? '').split(',').filter(Boolean)
    set(key, (current.includes(value) ? current.filter((v) => v !== value) : [...current, value]).join(',') || null)
  }

  const activeModel = settings?.device_models.find((m) => m.slug === params.get('model'))
  const filterKeys = ['model', 'collection', 'type', 'color', 'material', 'min_price', 'max_price', ...TOGGLES.map((t) => t.key), 'q']
  const activeCount = filterKeys.filter((k) => params.get(k)).length
  const clear = () => {
    modelStore.set(null)
    setParams(params.get('sort') ? { sort: params.get('sort')! } : {})
  }

  const title = collection?.name ?? (params.get('q') ? `Search: “${params.get('q')}”` : params.get('type') === 'case' ? 'Phone Cases' : params.get('type') === 'power_bank' ? 'Power Banks' : 'Shop All')
  const page = Number(params.get('page') ?? 1)

  return (
    <>
      <Seo title={collection?.seo_title || title} description={collection?.seo_description || collection?.description || 'Shop NOIRÉ cases, handmade creations and matching sets.'} />
      <section className="border-b border-line">
        <div className="container-wide py-10 md:py-16">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, ...(collection ? [{ label: 'Shop', to: '/shop' }, { label: collection.name }] : [{ label: 'Shop' }])]} />
          <div className="mt-6 grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <h1 className="heading-section">
                {title}
                {activeModel && <span className="block text-[0.55em] italic text-muted">for {activeModel.name}</span>}
              </h1>
              {collection?.description && <p className="mt-4 max-w-xl text-ink/70">{collection.description}</p>}
            </div>
          </div>
        </div>
      </section>

      <div className="container-wide py-8 md:py-10">
        <div className="sticky top-16 z-30 -mx-4 mb-6 flex items-center justify-between gap-3 border-b border-line bg-ivory/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
          <button type="button" className="chip lg:hidden" onClick={() => setDrawer(true)}>
            <Icon name="filter" size={16} /> Filters{activeCount ? ` (${activeCount})` : ''}
          </button>
          <p className="hidden text-[13px] text-muted lg:block" aria-live="polite">
            {data ? `${data.meta.total} ${data.meta.total === 1 ? 'product' : 'products'}` : ' '}
            {activeCount > 0 && (
              <button type="button" onClick={clear} className="ml-4 text-ink underline underline-offset-4">
                Clear all filters
              </button>
            )}
          </p>
          <label className="flex items-center gap-2 text-[13px]">
            <span className="text-muted max-sm:sr-only">Sort by</span>
            <select className="field h-10 min-h-0 w-auto rounded-full py-0 pl-4 pr-9 text-[13px]" value={params.get('sort') ?? 'featured'} onChange={(e) => set('sort', e.target.value === 'featured' ? null : e.target.value)}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-10 lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block" aria-label="Filters">
            <Filters params={params} set={set} toggleList={toggleList} facets={data?.facets} hideCollection={!!slug} />
          </aside>
          <div className={cx('transition-opacity', isFetching && !isLoading && 'opacity-60')}>
            <p className="mb-4 text-[13px] text-muted lg:hidden" aria-live="polite">
              {data ? `${data.meta.total} products` : ''}
            </p>
            {data && data.data.length === 0 ? (
              <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong px-6 py-20 text-center">
                <p className="font-display text-3xl">No pieces match these filters</p>
                <p className="mx-auto mt-3 max-w-sm text-muted">Try another model or colour — or ask us about a custom design made just for you.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={clear} className="btn btn-primary">
                    Clear filters
                  </button>
                  <Link to="/custom" className="btn btn-outline">
                    Create your own
                  </Link>
                </div>
              </div>
            ) : (
              <ProductGrid products={data?.data} loading={isLoading} className="lg:grid-cols-3 2xl:grid-cols-4" />
            )}
            {data && data.meta.last_page > 1 && (
              <nav className="mt-14 flex items-center justify-center gap-2" aria-label="Pagination">
                {Array.from({ length: data.meta.last_page }).map((_, i) => (
                  <button key={i} type="button" onClick={() => setParams((p) => { const n = new URLSearchParams(p); n.set('page', String(i + 1)); return n })} aria-current={page === i + 1 ? 'page' : undefined} className={cx('chip h-10 w-10 justify-center px-0', page === i + 1 && 'is-active')}>
                    {i + 1}
                  </button>
                ))}
              </nav>
            )}
          </div>
        </div>
      </div>

      <Sheet
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Filters"
        side="left"
        widthClass="w-[92%] max-w-sm"
        footer={
          <div className="flex gap-3">
            <button type="button" className="btn btn-outline flex-1" onClick={clear}>
              Clear
            </button>
            <button type="button" className="btn btn-primary flex-1" onClick={() => setDrawer(false)}>
              Show {data?.meta.total ?? ''} results
            </button>
          </div>
        }
      >
        <Filters params={params} set={set} toggleList={toggleList} facets={data?.facets} hideCollection={!!slug} />
      </Sheet>
    </>
  )
}
