import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router'
import { Icon } from '../components/Icon'
import { DemoNotice, Seo, Skeleton } from '../components/ui'
import { date, money, STATUS_LABELS } from '../lib/format'
import { api } from '../services/api'

interface Confirmation {
  number: string
  status: string
  is_demo: boolean
  placed_at: string
  payment_method: string
  payment_status: string
  payment_reference: string | null
  customer: { name: string; email: string; phone: string; address: string[] }
  shipping_method: string
  items: { product_name: string; sku: string; device_model: string | null; color_name: string | null; image_url: string | null; unit_price: string; quantity: number; line_total: string; customization: Record<string, string> | null; components: { name: string }[] | null }[]
  subtotal: string
  shipping_total: string
  total: string
}

export default function OrderConfirmation() {
  const { number } = useParams()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', number, token],
    queryFn: () => api<Confirmation>(`/orders/${number}?token=${encodeURIComponent(token)}`),
    retry: false,
  })

  if (isLoading) return <div className="container-lux py-20"><Skeleton className="h-96" /></div>
  if (error || !order) {
    return (
      <div className="container-lux py-32 text-center">
        <h1 className="heading-section">Order not found</h1>
        <p className="mt-4 text-muted">This confirmation link is invalid or has expired.</p>
        <Link to="/" className="btn btn-primary mt-8">Return home</Link>
      </div>
    )
  }

  return (
    <div className="container-lux py-12 md:py-20">
      <Seo title={`Order ${order.number}`} />
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ink text-ivory"><Icon name="check" size={26} /></span>
          <p className="eyebrow mt-6 text-muted">Demo order confirmed</p>
          <h1 className="heading-section mt-3">Thank you, {order.customer.name.split(' ')[0]}.</h1>
          <p className="mt-4 text-muted">
            Your demonstration order <strong className="font-semibold text-ink" data-testid="order-number">{order.number}</strong> has been recorded.
          </p>
        </div>

        <DemoNotice className="mx-auto mt-8 max-w-xl">This is a simulated order for presentation purposes. No payment has been taken, no confirmation email has been sent and nothing will be shipped.</DemoNotice>

        <div className="card mt-10 grid gap-6 p-6 sm:grid-cols-3 md:p-8">
          <div>
            <p className="eyebrow text-muted">Status</p>
            <p className="mt-2 font-semibold">{STATUS_LABELS[order.status] ?? order.status} <span className="font-normal text-muted">(simulated)</span></p>
            <p className="text-[13px] text-muted">{date(order.placed_at, { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
          <div>
            <p className="eyebrow text-muted">Payment</p>
            <p className="mt-2 font-semibold">{order.payment_method}</p>
            <p className="text-[13px] text-muted">{order.payment_status === 'paid_simulated' ? `Approved (simulated) · ${order.payment_reference}` : 'Due on delivery (simulated)'}</p>
          </div>
          <div>
            <p className="eyebrow text-muted">Delivery</p>
            <p className="mt-2 font-semibold">{order.shipping_method}</p>
            <p className="text-[13px] text-muted">{order.customer.address.join(', ')}</p>
          </div>
        </div>

        <div className="card mt-6 p-6 md:p-8">
          <h2 className="mb-2 font-display text-2xl">Items</h2>
          <ul className="divide-y divide-line">
            {order.items.map((item, i) => (
              <li key={i} className="flex gap-4 py-4">
                {item.image_url && <img src={item.image_url} alt="" className="aspect-[4/5] w-16 rounded-md object-cover" />}
                <div className="flex-1 text-[14px]">
                  <p className="font-semibold">{item.product_name}</p>
                  <p className="text-muted">{[item.device_model, item.color_name].filter(Boolean).join(' · ')} · Qty {item.quantity}</p>
                  {item.components && <p className="text-[13px] text-muted">Includes {item.components.map((c) => c.name).join(' + ')}</p>}
                  {item.customization?.text && <p className="text-[13px] text-muted">Personalisation: “{item.customization.text}”</p>}
                  <p className="text-[11px] uppercase tracking-wider text-muted">SKU {item.sku}</p>
                </div>
                <p className="font-semibold tabular-nums">{money(item.line_total)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-2 space-y-2 border-t border-line pt-4 text-[14px]">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>{Number(order.shipping_total) ? money(order.shipping_total) : 'Free'}</dd></div>
            <div className="flex justify-between pt-2 text-[17px] font-semibold"><dt>Total</dt><dd>{money(order.total)}</dd></div>
          </dl>
        </div>
        <div className="mt-10 text-center">
          <Link to="/shop" className="btn btn-primary">Continue shopping</Link>
        </div>
      </div>
    </div>
  )
}
