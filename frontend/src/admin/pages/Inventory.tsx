import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Skeleton } from '../../components/ui'
import { cx, date } from '../../lib/format'
import { api, qs } from '../../services/api'
import { Badge, messageOf, PageHeader, Pagination, Panel, Stat, useFlash } from '../shared'

interface Row {
  id: number
  sku: string
  product_id: number
  product: string
  product_status: string
  device_model: string | null
  color_name: string
  color_hex: string
  stock: number
  low_stock_threshold: number
  is_active: boolean
  state: 'ok' | 'low' | 'out'
}
interface Movement { id: number; sku: string; product: string; change: number; stock_after: number; reason: string; reference: string | null; note: string | null; user: string | null; created_at: string }

function StockCell({ row, onSaved, flash }: { row: Row; onSaved: () => void; flash: ReturnType<typeof useFlash>['show'] }) {
  const [value, setValue] = useState(String(row.stock))
  const [busy, setBusy] = useState(false)
  const apply = async (mode: 'set' | 'change', v: number) => {
    setBusy(true)
    try {
      const res = await api<{ stock: number }>(`/admin/inventory/${row.id}/adjust`, { method: 'POST', body: { mode, value: v, note: mode === 'set' ? 'Stock count updated' : 'Quick adjustment' } })
      setValue(String(res.stock))
      flash('ok', `${row.sku}: stock ${res.stock}`)
      onSaved()
    } catch (e) {
      flash('error', messageOf(e))
      setValue(String(row.stock))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className="grid h-9 w-9 place-items-center rounded-full border border-line hover:bg-soft disabled:opacity-30" disabled={busy || row.stock === 0} onClick={() => apply('change', -1)} aria-label={`Decrease ${row.sku}`}>−</button>
      <input
        className={cx('field h-9 min-h-0 w-16 px-2 py-0 text-center tabular-nums', row.state === 'out' && 'text-danger')}
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => Number(value) !== row.stock && value !== '' && apply('set', Number(value))}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        aria-label={`Stock for ${row.sku}`}
        disabled={busy}
      />
      <button type="button" className="grid h-9 w-9 place-items-center rounded-full border border-line hover:bg-soft" disabled={busy} onClick={() => apply('change', 1)} aria-label={`Increase ${row.sku}`}>+</button>
    </div>
  )
}

export default function Inventory() {
  const [params, setParams] = useSearchParams()
  const qc = useQueryClient()
  const flash = useFlash()
  const filters = { q: params.get('q') ?? '', filter: params.get('filter') ?? '', page: params.get('page') ?? '1' }
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'inventory', filters],
    queryFn: () => api<{ data: Row[]; meta: { current_page: number; last_page: number; total: number }; summary: { out: number; low: number; units: number } }>(`/admin/inventory${qs(filters)}`),
    placeholderData: keepPreviousData,
  })
  const { data: movements } = useQuery({ queryKey: ['admin', 'movements'], queryFn: () => api<Movement[]>('/admin/inventory/movements') })
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(params)
    if (v) n.set(k, v)
    else n.delete(k)
    if (k !== 'page') n.delete('page')
    setParams(n)
  }
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'inventory'] })
    qc.invalidateQueries({ queryKey: ['admin', 'movements'] })
    qc.invalidateQueries({ queryKey: ['product'] })
  }

  return (
    <>
      {flash.node}
      <PageHeader title="Inventory" subtitle="Stock per variant. Matching sets draw from these component quantities automatically." />
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Units in stock" value={data?.summary.units ?? '—'} />
        <Stat label="Low stock" value={data?.summary.low ?? '—'} />
        <Stat label="Out of stock" value={data?.summary.out ?? '—'} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel padded={false} className="xl:col-span-2">
          <div className="flex flex-wrap gap-3 border-b border-line p-4">
            <input className="field h-10 min-h-0 max-w-xs" placeholder="Search SKU, product, colour" defaultValue={filters.q} onKeyDown={(e) => e.key === 'Enter' && set('q', e.currentTarget.value)} aria-label="Search inventory" />
            {[['', 'All'], ['low', 'Low stock'], ['out', 'Out of stock']].map(([v, l]) => (
              <button key={v} type="button" className="chip h-10" aria-pressed={filters.filter === v} onClick={() => set('filter', v)}>{l}</button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-[13px]">
              <thead className="text-left text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Variant</th>
                  <th className="px-5 py-3 font-semibold">SKU</th>
                  <th className="px-5 py-3 font-semibold">State</th>
                  <th className="px-5 py-3 font-semibold">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {isLoading && <tr><td colSpan={4} className="p-5"><Skeleton className="h-40" /></td></tr>}
                {data?.data.map((r) => (
                  <tr key={r.id} className="hover:bg-ivory">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="h-5 w-5 shrink-0 rounded-full border border-ink/15" style={{ background: r.color_hex }} />
                        <div>
                          <Link to={`/admin/products/${r.product_id}`} className="font-semibold hover:underline">{r.product}</Link>
                          <p className="text-muted">{[r.device_model, r.color_name].filter(Boolean).join(' · ')}{!r.is_active && ' · inactive'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 font-mono text-[12px]">{r.sku}</td>
                    <td className="px-5 py-2.5"><Badge value={r.state} label={r.state === 'ok' ? 'In stock' : r.state === 'low' ? `Low (≤${r.low_stock_threshold})` : 'Out'} /></td>
                    <td className="px-5 py-2.5"><StockCell row={r} onSaved={refresh} flash={flash.show} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={data?.meta} onPage={(p) => set('page', String(p))} />
        </Panel>
        <Panel title="Recent movements" padded={false}>
          <ul className="max-h-[720px] divide-y divide-line overflow-y-auto">
            {movements?.map((m) => (
              <li key={m.id} className="px-5 py-3 text-[13px]">
                <div className="flex justify-between gap-2">
                  <span className="truncate font-semibold">{m.product}</span>
                  <span className={cx('font-semibold tabular-nums', m.change < 0 ? 'text-danger' : 'text-success')}>{m.change > 0 ? `+${m.change}` : m.change}</span>
                </div>
                <p className="text-muted">
                  {m.sku} · <span className="capitalize">{m.reason}</span>{m.reference ? ` · ${m.reference}` : ''} → {m.stock_after}
                </p>
                <p className="text-[11px] text-muted">{date(m.created_at, { dateStyle: 'medium', timeStyle: 'short' })}{m.user ? ` · ${m.user}` : ''}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  )
}
