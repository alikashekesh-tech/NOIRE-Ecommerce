import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Skeleton } from '../../components/ui'
import { date, money, STATUS_LABELS } from '../../lib/format'
import { api } from '../../services/api'
import { Badge, PageHeader, Panel, RevenueChart, Stat } from '../shared'

interface DashboardData {
  is_demo: boolean
  totals: { revenue: string; orders: number; open_orders: number; products: number; published_products: number; customers: number; average_order: string }
  status_breakdown: Record<string, number>
  sales_chart: { date: string; revenue: number }[]
  recent_orders: { id: number; number: string; customer: string; total: string; status: string; placed_at: string }[]
  best_sellers: { product_name: string; units: number; revenue: string }[]
  popular_models: { device_model: string; units: number }[]
  low_stock: { id: number; product_id: number; product: string; sku: string; label: string; stock: number }[]
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => api<DashboardData>('/admin/dashboard') })

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    )
  }
  const t = data.totals
  const statusMax = Math.max(1, ...Object.values(data.status_breakdown))
  const modelMax = Math.max(1, ...data.popular_models.map((m) => Number(m.units)))

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Demonstration metrics calculated from orders recorded in the demo database — not real sales." />
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <Stat label="Demo revenue" value={money(t.revenue)} hint="Excludes cancelled orders" />
        <Stat label="Demo orders" value={t.orders} hint={`${t.open_orders} awaiting fulfilment`} />
        <Stat label="Products" value={t.products} hint={`${t.published_products} published`} />
        <Stat label="Customers" value={t.customers} hint={`Average order ${money(t.average_order)}`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Demo revenue · last 30 days" className="xl:col-span-2">
          <RevenueChart data={data.sales_chart} />
        </Panel>
        <Panel title="Orders by status">
          <ul className="space-y-3">
            {Object.keys(STATUS_LABELS).map((s) => (
              <li key={s}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span>{STATUS_LABELS[s]}</span>
                  <span className="font-semibold tabular-nums">{data.status_breakdown[s] ?? 0}</span>
                </div>
                <div className="h-1.5 rounded-full bg-soft">
                  <div className="h-full rounded-full bg-ink" style={{ width: `${((data.status_breakdown[s] ?? 0) / statusMax) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Recent orders" className="xl:col-span-2" padded={false} actions={<Link to="/admin/orders" className="text-[13px] underline underline-offset-4">View all</Link>}>
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead className="text-left text-[12px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Placed</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.recent_orders.map((o) => (
                  <tr key={o.id} className="hover:bg-ivory">
                    <td className="px-5 py-3 font-semibold"><Link to={`/admin/orders/${o.id}`} className="hover:underline">{o.number}</Link></td>
                    <td className="px-5 py-3">{o.customer}</td>
                    <td className="px-5 py-3 text-muted">{date(o.placed_at)}</td>
                    <td className="px-5 py-3"><Badge value={o.status} /></td>
                    <td className="px-5 py-3 text-right tabular-nums">{money(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Low stock" padded={false} actions={<Link to="/admin/inventory?filter=low" className="text-[13px] underline underline-offset-4">Inventory</Link>}>
          <ul className="divide-y divide-line">
            {data.low_stock.length === 0 && <li className="px-5 py-6 text-[14px] text-muted">All variants are above their thresholds.</li>}
            {data.low_stock.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0 text-[13px]">
                  <Link to={`/admin/products/${v.product_id}`} className="block truncate font-semibold hover:underline">{v.product}</Link>
                  <p className="truncate text-muted">{v.label}</p>
                </div>
                <Badge value={v.stock === 0 ? 'out' : 'low'} label={v.stock === 0 ? 'Out' : `${v.stock} left`} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Panel title="Best-selling products (demo)">
          <ol className="space-y-3 text-[14px]">
            {data.best_sellers.map((b, i) => (
              <li key={b.product_name} className="flex items-center gap-3">
                <span className="w-5 text-muted tabular-nums">{i + 1}</span>
                <span className="flex-1 truncate">{b.product_name}</span>
                <span className="text-muted tabular-nums">{b.units} units</span>
                <span className="w-24 text-right font-semibold tabular-nums">{money(b.revenue)}</span>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Popular device variants (units)">
          <ul className="space-y-3">
            {data.popular_models.map((m) => (
              <li key={m.device_model}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span>{m.device_model}</span>
                  <span className="font-semibold tabular-nums">{m.units}</span>
                </div>
                <div className="h-1.5 rounded-full bg-soft">
                  <div className="h-full rounded-full bg-ink" style={{ width: `${(Number(m.units) / modelMax) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  )
}
