import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Icon } from '../../components/Icon'
import { DemoNotice, Skeleton } from '../../components/ui'
import { cx, date, money, STATUS_LABELS } from '../../lib/format'
import { api } from '../../services/api'
import { Badge, messageOf, PageHeader, Panel, SaveButton, useFlash } from '../shared'

interface OrderFull {
  id: number
  number: string
  status: string
  payment_method_label: string
  payment_status: string
  payment_reference: string | null
  refunded_amount: string
  first_name: string
  last_name: string
  customer_name: string
  email: string
  phone: string
  country: string
  city: string
  address_line1: string
  address_line2: string | null
  customer_notes: string | null
  internal_notes: string | null
  shipping_method: string
  subtotal: string
  shipping_total: string
  total: string
  placed_at: string
  is_demo: boolean
  inventory_restored_at: string | null
  next_statuses: string[]
  customer_order_count: number
  items: { id: number; product_id: number | null; product_name: string; sku: string; device_model: string | null; color_name: string | null; image_url: string | null; unit_price: string; quantity: number; line_total: string; customization: Record<string, string> | null; components: { name: string; sku: string; quantity: number }[] | null }[]
  history: { id: number; from_status: string | null; to_status: string; note: string | null; created_at: string; user: { name: string } | null }[]
}

const FLOW = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered']

export default function OrderDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const flash = useFlash()
  const { data: order, isLoading } = useQuery({ queryKey: ['admin', 'order', id], queryFn: () => api<OrderFull>(`/admin/orders/${id}`) })
  const [notes, setNotes] = useState('')
  const [refund, setRefund] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => setNotes(order?.internal_notes ?? ''), [order?.internal_notes])

  const mutate = async (key: string, path: string, method: string, body: unknown, ok: string) => {
    setBusy(key)
    try {
      const updated = await api<OrderFull>(path, { method, body })
      qc.setQueryData(['admin', 'order', id], updated)
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      flash.show('ok', ok)
    } catch (e) {
      flash.show('error', messageOf(e))
    } finally {
      setBusy(null)
    }
  }

  if (isLoading || !order) return <Skeleton className="h-96" />
  const step = FLOW.indexOf(order.status)

  return (
    <>
      {flash.node}
      <Link to="/admin/orders" className="mb-4 inline-flex items-center gap-2 text-[13px] text-muted hover:text-ink"><Icon name="arrowLeft" size={16} /> Orders</Link>
      <PageHeader title={order.number} subtitle={`Placed ${date(order.placed_at, { dateStyle: 'full', timeStyle: 'short' })}`} actions={<Badge value={order.status} />} />

      <Panel className="mb-4">
        <ol className="grid grid-cols-5 gap-2" aria-label="Fulfilment progress">
          {FLOW.map((s, i) => (
            <li key={s} className="text-center">
              <div className={cx('h-1.5 rounded-full', order.status === 'cancelled' ? 'bg-danger/30' : i <= step ? 'bg-ink' : 'bg-soft')} />
              <p className={cx('mt-2 text-[12px]', i === step ? 'font-semibold' : 'text-muted')}>{STATUS_LABELS[s]}</p>
            </li>
          ))}
        </ol>
        {order.next_statuses.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
            {order.next_statuses.map((s) => (
              <button
                key={s}
                type="button"
                className={cx('btn btn-sm', s === 'cancelled' ? 'btn-outline text-danger' : s === order.next_statuses[0] ? 'btn-primary' : 'btn-outline')}
                disabled={!!busy}
                onClick={() => (s !== 'cancelled' || confirm('Cancel this demo order? Reserved stock will be returned to inventory.')) && mutate(s, `/admin/orders/${order.id}/status`, 'PUT', { status: s }, `Status updated to ${STATUS_LABELS[s]}`)}
              >
                {s === 'cancelled' ? 'Cancel order' : `Mark as ${STATUS_LABELS[s]}`}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[13px] text-muted">This order is {order.status} — no further status changes.{order.inventory_restored_at && ' Stock was returned to inventory.'}</p>
        )}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Panel title={`Items (${order.items.length})`} padded={false}>
            <ul className="divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.id} className="flex gap-4 px-5 py-4">
                  {it.image_url && <img src={it.image_url} alt="" className="aspect-[4/5] w-14 rounded-md object-cover" />}
                  <div className="flex-1 text-[13px]">
                    {it.product_id ? <Link to={`/admin/products/${it.product_id}`} className="text-[14px] font-semibold hover:underline">{it.product_name}</Link> : <p className="text-[14px] font-semibold">{it.product_name}</p>}
                    <p className="text-muted">{[it.device_model, it.color_name].filter(Boolean).join(' · ')} · <span className="font-mono">{it.sku}</span></p>
                    {it.components && <p className="text-muted">Components: {it.components.map((c) => `${c.name} (${c.sku})`).join(' + ')}</p>}
                    {it.customization && (
                      <p className="mt-1 rounded-md bg-soft px-2 py-1">
                        {Object.entries(it.customization).map(([k, v]) => <span key={k} className="mr-3"><span className="capitalize text-muted">{k}:</span> {v}</span>)}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-[13px] tabular-nums">
                    <p>{money(it.unit_price)} × {it.quantity}</p>
                    <p className="font-semibold">{money(it.line_total)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-line px-5 py-4 text-[14px]">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{money(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>{order.shipping_method}</dt><dd className="tabular-nums">{money(order.shipping_total)}</dd></div>
              <div className="flex justify-between text-[16px] font-semibold"><dt>Total</dt><dd className="tabular-nums">{money(order.total)}</dd></div>
              {Number(order.refunded_amount) > 0 && <div className="flex justify-between text-danger"><dt>Simulated refunds</dt><dd className="tabular-nums">−{money(order.refunded_amount)}</dd></div>}
            </dl>
          </Panel>

          <Panel title="Internal notes">
            <textarea className="field" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Visible to administrators only" aria-label="Internal notes" />
            <div className="mt-3 flex justify-end">
              <SaveButton busy={busy === 'notes'} disabled={notes === (order.internal_notes ?? '')} onClick={() => mutate('notes', `/admin/orders/${order.id}/notes`, 'PUT', { internal_notes: notes }, 'Notes saved')}>Save notes</SaveButton>
            </div>
          </Panel>

          <Panel title="History" padded={false}>
            <ol className="divide-y divide-line">
              {order.history.map((h) => (
                <li key={h.id} className="flex gap-3 px-5 py-3 text-[13px]">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ink" />
                  <div className="flex-1">
                    <p>
                      {h.from_status && h.from_status !== h.to_status ? <>{STATUS_LABELS[h.from_status]} → <strong>{STATUS_LABELS[h.to_status]}</strong></> : <strong>{STATUS_LABELS[h.to_status]}</strong>}
                      {h.note && <span className="text-muted"> — {h.note}</span>}
                    </p>
                    <p className="text-[12px] text-muted">{date(h.created_at, { dateStyle: 'medium', timeStyle: 'short' })}{h.user ? ` · ${h.user.name}` : ' · System'}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Customer">
            <p className="font-semibold">{order.customer_name}</p>
            <p className="text-[14px]"><a className="underline" href={`mailto:${order.email}`}>{order.email}</a></p>
            <p className="text-[14px]">{order.phone}</p>
            <p className="mt-2 text-[12px] text-muted">{order.customer_order_count} order{order.customer_order_count > 1 ? 's' : ''} with this email</p>
          </Panel>
          <Panel title="Delivery">
            <address className="text-[14px] not-italic leading-relaxed">
              {order.address_line1}<br />
              {order.address_line2 && <>{order.address_line2}<br /></>}
              {order.city}, {order.country}
            </address>
            <p className="mt-2 text-[13px] text-muted">{order.shipping_method}</p>
            {order.customer_notes && <p className="mt-3 rounded-md bg-soft px-3 py-2 text-[13px]">“{order.customer_notes}”</p>}
          </Panel>
          <Panel title="Payment (simulated)">
            <p className="text-[14px] font-semibold">{order.payment_method_label}</p>
            <p className="text-[13px] capitalize text-muted">{order.payment_status.replaceAll('_', ' ')}{order.payment_reference ? ` · ${order.payment_reference}` : ''}</p>
            <div className="mt-4 border-t border-line pt-4">
              <label htmlFor="refund" className="label">Record simulated refund</label>
              <div className="flex gap-2">
                <input id="refund" className="field h-11 min-h-0" inputMode="decimal" placeholder={`Up to ${money(Number(order.total) - Number(order.refunded_amount))}`} value={refund} onChange={(e) => setRefund(e.target.value)} />
                <SaveButton busy={busy === 'refund'} disabled={!refund} onClick={() => mutate('refund', `/admin/orders/${order.id}/refund`, 'POST', { amount: refund }, 'Simulated refund recorded').then(() => setRefund(''))}>Record</SaveButton>
              </div>
              <DemoNotice className="mt-3">Refunds are recorded for demonstration only — no money moves.</DemoNotice>
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}
