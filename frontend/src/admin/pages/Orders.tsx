import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Skeleton } from '../../components/ui'
import { date, money, STATUS_LABELS } from '../../lib/format'
import { api, qs } from '../../services/api'
import { Badge, PageHeader, Pagination, Panel } from '../shared'

interface Row { id: number; number: string; customer: string; email: string; city: string; status: string; payment_method: string; payment_status: string; total: string; items_count: number; placed_at: string }

export default function Orders() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const filters = { q: params.get('q') ?? '', status: params.get('status') ?? '', page: params.get('page') ?? '1' }
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', filters],
    queryFn: () => api<{ data: Row[]; meta: { current_page: number; last_page: number; total: number }; counts: Record<string, number> }>(`/admin/orders${qs(filters)}`),
    placeholderData: keepPreviousData,
  })
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(params)
    if (v) n.set(k, v)
    else n.delete(k)
    if (k !== 'page') n.delete('page')
    setParams(n)
  }
  const total = Object.values(data?.counts ?? {}).reduce((a, b) => a + b, 0)

  return (
    <>
      <PageHeader title="Orders" subtitle="Demo orders placed through the storefront checkout. No payments are captured." />
      <Panel padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          <input className="field mr-2 h-10 min-h-0 max-w-xs" placeholder="Order number, name or email" defaultValue={filters.q} onKeyDown={(e) => e.key === 'Enter' && set('q', e.currentTarget.value)} aria-label="Search orders" />
          <button type="button" className="chip h-10" aria-pressed={!filters.status} onClick={() => set('status', '')}>All ({total})</button>
          {Object.keys(STATUS_LABELS).map((s) => (
            <button key={s} type="button" className="chip h-10" aria-pressed={filters.status === s} onClick={() => set('status', s)}>
              {STATUS_LABELS[s]} ({data?.counts[s] ?? 0})
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-[14px]">
            <thead className="text-left text-[12px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Order</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Placed</th>
                <th className="px-5 py-3 font-semibold">Payment</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && <tr><td colSpan={6} className="p-5"><Skeleton className="h-40" /></td></tr>}
              {data?.data.map((o) => (
                <tr key={o.id} className="cursor-pointer hover:bg-ivory" onClick={() => navigate(`/admin/orders/${o.id}`)}>
                  <td className="px-5 py-3">
                    <Link to={`/admin/orders/${o.id}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>{o.number}</Link>
                    <p className="text-[12px] text-muted">{o.items_count} item{o.items_count > 1 ? 's' : ''}</p>
                  </td>
                  <td className="px-5 py-3">{o.customer}<p className="text-[12px] text-muted">{o.city}</p></td>
                  <td className="px-5 py-3 text-muted">{date(o.placed_at, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="px-5 py-3 text-[13px]">{o.payment_method}<p className="text-[12px] text-muted">{o.payment_status.replaceAll('_', ' ')}</p></td>
                  <td className="px-5 py-3"><Badge value={o.status} /></td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums">{money(o.total)}</td>
                </tr>
              ))}
              {data?.data.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-muted">No orders found.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination meta={data?.meta} onPage={(p) => set('page', String(p))} />
      </Panel>
    </>
  )
}
