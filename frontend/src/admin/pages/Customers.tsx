import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Fragment, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Icon } from '../../components/Icon'
import { Skeleton } from '../../components/ui'
import { date, money } from '../../lib/format'
import { api, qs } from '../../services/api'
import { Badge, PageHeader, Pagination, Panel } from '../shared'

interface Row { email: string; name: string; phone: string; city: string; orders_count: number; total_spent: string; last_order_at: string; account: string; orders: { id: number; number: string; status: string; total: string; placed_at: string }[] }

export default function Customers() {
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState<string | null>(null)
  const filters = { q: params.get('q') ?? '', page: params.get('page') ?? '1' }
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'customers', filters],
    queryFn: () => api<{ data: Row[]; meta: { current_page: number; last_page: number; total: number } }>(`/admin/customers${qs(filters)}`),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageHeader title="Customers" subtitle="Fictional demo customers, grouped from checkout details. Visible to administrators only." />
      <Panel padded={false}>
        <div className="border-b border-line p-4">
          <input className="field h-10 min-h-0 max-w-xs" placeholder="Search name or email" defaultValue={filters.q} onKeyDown={(e) => e.key === 'Enter' && setParams(e.currentTarget.value ? { q: e.currentTarget.value } : {})} aria-label="Search customers" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[14px]">
            <thead className="text-left text-[12px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Contact</th>
                <th className="px-5 py-3 font-semibold">Account</th>
                <th className="px-5 py-3 font-semibold">Orders</th>
                <th className="px-5 py-3 font-semibold">Spent</th>
                <th className="px-5 py-3 font-semibold">Last order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && <tr><td colSpan={6} className="p-5"><Skeleton className="h-40" /></td></tr>}
              {data?.data.map((c) => (
                <Fragment key={c.email}>
                  <tr className="cursor-pointer hover:bg-ivory" onClick={() => setOpen(open === c.email ? null : c.email)}>
                    <td className="px-5 py-3 font-semibold">
                      <span className="inline-flex items-center gap-2"><Icon name="chevronRight" size={14} className={open === c.email ? 'rotate-90' : ''} />{c.name}</span>
                    </td>
                    <td className="px-5 py-3 text-[13px]">{c.email}<p className="text-muted">{c.phone} · {c.city}</p></td>
                    <td className="px-5 py-3"><Badge value={c.account === 'active' ? 'ok' : 'draft'} label={c.account} /></td>
                    <td className="px-5 py-3 tabular-nums">{c.orders_count}</td>
                    <td className="px-5 py-3 tabular-nums">{money(c.total_spent)}</td>
                    <td className="px-5 py-3 text-muted">{date(c.last_order_at)}</td>
                  </tr>
                  {open === c.email && (
                    <tr className="bg-ivory">
                      <td colSpan={6} className="px-5 py-3">
                        <ul className="space-y-1.5 text-[13px]">
                          {c.orders.map((o) => (
                            <li key={o.id} className="flex items-center gap-4">
                              <Link to={`/admin/orders/${o.id}`} className="font-semibold underline-offset-4 hover:underline">{o.number}</Link>
                              <span className="text-muted">{date(o.placed_at)}</span>
                              <Badge value={o.status} />
                              <span className="ml-auto tabular-nums">{money(o.total)}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination meta={data?.meta} onPage={(p) => setParams({ ...filters, page: String(p) })} />
      </Panel>
    </>
  )
}
