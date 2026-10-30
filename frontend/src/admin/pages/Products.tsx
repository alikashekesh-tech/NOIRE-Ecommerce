import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Icon } from '../../components/Icon'
import { Skeleton } from '../../components/ui'
import { cx, date, money } from '../../lib/format'
import { api, qs } from '../../services/api'
import { Badge, PageHeader, Pagination, Panel } from '../shared'

interface Row {
  id: number
  name: string
  slug: string
  type: string
  status: string
  image: string | null
  collections: string[]
  variant_count: number
  stock: number
  price_min: string | null
  price_max: string | null
  is_featured: boolean
  is_handmade: boolean
  updated_at: string
}

const TYPE_LABEL: Record<string, string> = { case: 'Case', power_bank: 'Power bank', bundle: 'Matching set' }

export default function Products() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const filters = { q: params.get('q') ?? '', status: params.get('status') ?? '', type: params.get('type') ?? '', page: params.get('page') ?? '1' }
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'products', filters],
    queryFn: () => api<{ data: Row[]; meta: { current_page: number; last_page: number; total: number } }>(`/admin/products${qs(filters)}`),
    placeholderData: keepPreviousData,
  })
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(params)
    if (v) n.set(k, v)
    else n.delete(k)
    if (k !== 'page') n.delete('page')
    setParams(n)
  }

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Create, edit, publish and archive catalogue items. Changes appear on the storefront immediately."
        actions={
          <Link to="/admin/products/new" className="btn btn-primary btn-sm h-11">
            <Icon name="plus" size={16} /> New product
          </Link>
        }
      />
      <Panel padded={false}>
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <input className="field h-10 min-h-0 max-w-xs" placeholder="Search name or SKU" defaultValue={filters.q} onKeyDown={(e) => e.key === 'Enter' && set('q', e.currentTarget.value)} aria-label="Search products" />
          <select className="field h-10 min-h-0 w-auto py-0" value={filters.status} onChange={(e) => set('status', e.target.value)} aria-label="Status">
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <select className="field h-10 min-h-0 w-auto py-0" value={filters.type} onChange={(e) => set('type', e.target.value)} aria-label="Type">
            <option value="">All types</option>
            <option value="case">Cases</option>
            <option value="power_bank">Power banks</option>
            <option value="bundle">Matching sets</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[14px]">
            <thead className="text-left text-[12px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Variants</th>
                <th className="px-5 py-3 font-semibold">Stock</th>
                <th className="px-5 py-3 font-semibold">Price</th>
                <th className="px-5 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="p-5"><Skeleton className="h-40" /></td>
                </tr>
              )}
              {data?.data.map((p) => (
                <tr key={p.id} className="cursor-pointer hover:bg-ivory" onClick={() => navigate(`/admin/products/${p.id}`)}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-11 shrink-0 overflow-hidden rounded-md bg-soft">{p.image && <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" />}</div>
                      <div className="min-w-0">
                        <Link to={`/admin/products/${p.id}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                          {p.name}
                        </Link>
                        <p className="truncate text-[12px] text-muted">{p.collections.join(', ')}{p.is_handmade ? ' · Handmade' : ''}{p.is_featured ? ' · Featured' : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted">{TYPE_LABEL[p.type]}</td>
                  <td className="px-5 py-3"><Badge value={p.status} /></td>
                  <td className="px-5 py-3 tabular-nums">{p.variant_count}</td>
                  <td className={cx('px-5 py-3 tabular-nums', p.stock === 0 && 'font-semibold text-danger')}>{p.stock}{p.type === 'bundle' && <span className="text-[11px] text-muted"> sets</span>}</td>
                  <td className="px-5 py-3 tabular-nums">{p.price_min ? (p.price_min === p.price_max ? money(p.price_min) : `${money(p.price_min)}–${money(p.price_max)}`) : '—'}</td>
                  <td className="px-5 py-3 text-muted">{date(p.updated_at)}</td>
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted">No products match.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination meta={data?.meta} onPage={(p) => set('page', String(p))} />
      </Panel>
    </>
  )
}
