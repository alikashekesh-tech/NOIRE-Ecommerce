import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Icon } from '../components/Icon'
import { DemoBadge, DemoNotice, Seo, Spinner } from '../components/ui'
import { cx, money } from '../lib/format'
import { api, ApiError } from '../services/api'
import { useQuote, useSettings } from '../services/queries'
import { cart, useCartItems } from '../store/shop'

type Form = {
  first_name: string
  last_name: string
  email: string
  phone: string
  country: string
  city: string
  address_line1: string
  address_line2: string
  notes: string
}

const empty: Form = { first_name: '', last_name: '', email: '', phone: '', country: 'Lebanon', city: '', address_line1: '', address_line2: '', notes: '' }

function validate(f: Form): Record<string, string> {
  const e: Record<string, string> = {}
  if (!f.first_name.trim()) e.first_name = 'Please enter your first name.'
  if (!f.last_name.trim()) e.last_name = 'Please enter your last name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Please enter a valid email address.'
  if (!/^[+0-9 ()-]{6,30}$/.test(f.phone)) e.phone = 'Please enter a valid phone number.'
  if (!f.city) e.city = 'Please choose your area.'
  if (!f.address_line1.trim()) e.address_line1 = 'Please enter your address.'
  return e
}

function Field({ id, label, error, children, optional }: { id: string; label: string; error?: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export default function Checkout() {
  const items = useCartItems()
  const { data: settings } = useSettings()
  const [shipping, setShipping] = useState<string | null>(null)
  const { data: quote, isFetching } = useQuote(items, shipping)
  const [form, setForm] = useState<Form>(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [payment, setPayment] = useState<'demo_cod' | 'demo_card'>('demo_cod')
  const [simulated, setSimulated] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className="container-lux py-32 text-center">
        <h1 className="heading-section">Your bag is empty</h1>
        <Link to="/shop" className="btn btn-primary mt-8">
          Shop the Collection
        </Link>
      </div>
    )
  }

  const bind = (k: keyof Form) => ({
    id: k,
    name: k,
    value: form[k],
    'aria-invalid': !!errors[k] || undefined,
    'aria-describedby': errors[k] ? `${k}-error` : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value }),
  })
  const selectedShipping = shipping ?? quote?.shipping_method

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const v = validate(form)
    if (payment === 'demo_card' && !simulated) v.simulate_payment = 'Please confirm the simulated payment.'
    setErrors(v)
    if (Object.keys(v).length) {
      document.getElementById(Object.keys(v)[0])?.focus()
      return
    }
    setSubmitting(true)
    try {
      const res = await api<{ number: string; token: string }>('/checkout', {
        method: 'POST',
        body: {
          ...form,
          items: items.map(({ variant_id, quantity, customization }) => ({ variant_id, quantity, customization })),
          shipping_method: selectedShipping,
          payment_method: payment,
          simulate_payment: payment === 'demo_card' ? simulated : undefined,
        },
      })
      cart.clear()
      navigate(`/order/${res.number}?token=${res.token}`, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, m]) => [k, m[0]])))
        setFormError(err.errors.items?.[0] ?? err.message)
      } else setFormError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-lux py-10 md:py-14">
      <Seo title="Checkout" />
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/cart" className="inline-flex items-center gap-2 text-[13px] text-muted hover:text-ink">
            <Icon name="arrowLeft" size={16} /> Back to bag
          </Link>
          <h1 className="heading-section mt-3">Checkout</h1>
        </div>
        <DemoBadge label="Demo Store · Simulated checkout" />
      </div>

      <form onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-12">
        <div className="space-y-10 lg:col-span-7">
          <section aria-labelledby="contact-h">
            <h2 id="contact-h" className="mb-5 font-display text-2xl">
              1. Contact
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="first_name" label="First name" error={errors.first_name}>
                <input className="field" autoComplete="given-name" {...bind('first_name')} />
              </Field>
              <Field id="last_name" label="Last name" error={errors.last_name}>
                <input className="field" autoComplete="family-name" {...bind('last_name')} />
              </Field>
              <Field id="email" label="Email" error={errors.email}>
                <input className="field" type="email" autoComplete="email" {...bind('email')} />
              </Field>
              <Field id="phone" label="Phone number" error={errors.phone}>
                <input className="field" type="tel" autoComplete="tel" placeholder="+961 …" {...bind('phone')} />
              </Field>
            </div>
          </section>

          <section aria-labelledby="delivery-h">
            <h2 id="delivery-h" className="mb-5 font-display text-2xl">
              2. Delivery
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="country" label="Country" error={errors.country}>
                <select className="field" autoComplete="country-name" {...bind('country')}>
                  {(settings?.shipping.countries ?? ['Lebanon']).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field id="city" label="City / area" error={errors.city}>
                <select className="field" {...bind('city')}>
                  <option value="">Select…</option>
                  {settings?.shipping.areas.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field id="address_line1" label="Address" error={errors.address_line1}>
                  <input className="field" autoComplete="address-line1" placeholder="Street, building" {...bind('address_line1')} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field id="address_line2" label="Apartment, floor, landmark" optional>
                  <input className="field" autoComplete="address-line2" {...bind('address_line2')} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field id="notes" label="Order notes" optional>
                  <textarea className="field min-h-20" maxLength={500} {...bind('notes')} />
                </Field>
              </div>
            </div>

            <fieldset className="mt-6">
              <legend className="label">Delivery method</legend>
              <div className="space-y-2">
                {quote?.shipping_options.map((o) => (
                  <label key={o.code} className={cx('flex cursor-pointer items-center gap-4 rounded-xl border bg-surface p-4 transition', selectedShipping === o.code ? 'border-ink' : 'border-line')}>
                    <input type="radio" name="shipping" className="h-4 w-4 accent-ink" checked={selectedShipping === o.code} onChange={() => setShipping(o.code)} />
                    <span className="flex-1">
                      <span className="block text-[14px] font-semibold">{o.name}</span>
                      <span className="block text-[13px] text-muted">{o.estimate}</span>
                    </span>
                    <span className="text-[14px] font-semibold tabular-nums">{o.is_free ? 'Free' : money(o.fee)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <section aria-labelledby="payment-h">
            <h2 id="payment-h" className="mb-5 font-display text-2xl">
              3. Payment <span className="ml-2 align-middle font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Simulated</span>
            </h2>
            <div className="space-y-2">
              {(
                [
                  ['demo_cod', 'Demo Cash on Delivery', 'Pay when your order arrives (simulated — no payment is collected).'],
                  ['demo_card', 'Simulated Card Payment', 'No card details are requested. Confirm the simulated payment below.'],
                ] as const
              ).map(([value, title, hint]) => (
                <label key={value} className={cx('flex cursor-pointer items-start gap-4 rounded-xl border bg-surface p-4 transition', payment === value ? 'border-ink' : 'border-line')}>
                  <input type="radio" name="payment" className="mt-1 h-4 w-4 accent-ink" checked={payment === value} onChange={() => setPayment(value)} />
                  <span>
                    <span className="block text-[14px] font-semibold">{title}</span>
                    <span className="block text-[13px] text-muted">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {payment === 'demo_card' && (
              <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-soft p-4">
                <button type="button" id="simulate_payment" onClick={() => setSimulated(true)} className={cx('btn w-full', simulated ? 'btn-outline' : 'btn-primary')} aria-pressed={simulated}>
                  {simulated ? (
                    <>
                      <Icon name="check" size={18} /> Simulated payment approved
                    </>
                  ) : (
                    'Simulate Successful Payment'
                  )}
                </button>
                {errors.simulate_payment && <p className="mt-2 text-[13px] text-danger">{errors.simulate_payment}</p>}
              </div>
            )}
            <DemoNotice className="mt-4">This is a demonstration checkout. No money is charged, no card data is collected and no order will be delivered.</DemoNotice>
          </section>
        </div>

        <aside className="lg:col-span-5">
          <div className="card p-6 lg:sticky lg:top-28">
            <h2 className="mb-4 font-display text-2xl">Order summary</h2>
            <ul className="divide-y divide-line">
              {quote?.lines.map((l) =>
                l.product ? (
                  <li key={l.key} className="flex gap-3 py-3">
                    <div className="relative w-14 shrink-0">
                      {l.product.image && <img src={l.product.image} alt="" className="aspect-[4/5] w-full rounded-md object-cover" />}
                      <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[10px] font-bold text-ivory">{l.quantity}</span>
                    </div>
                    <div className="min-w-0 flex-1 text-[13px]">
                      <p className="font-semibold">{l.product.name}</p>
                      <p className="text-muted">{[l.device_model, l.color_name].filter(Boolean).join(' · ')}</p>
                      {l.customization?.text && <p className="text-muted">“{l.customization.text}”</p>}
                      {l.issues.length > 0 && <p className="text-danger">{l.issues.join(' · ')}</p>}
                    </div>
                    <p className="text-[13px] font-semibold tabular-nums">{money(l.line_total)}</p>
                  </li>
                ) : null,
              )}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[14px]">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{money(quote?.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Delivery</dt>
                <dd className="tabular-nums">{quote && Number(quote.shipping_total) === 0 ? 'Free' : money(quote?.shipping_total)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-[17px] font-semibold">
                <dt>Total</dt>
                <dd className="flex items-center gap-2 tabular-nums">
                  {isFetching && <Spinner className="text-muted" />}
                  {money(quote?.total)}
                </dd>
              </div>
            </dl>
            {formError && (
              <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-[13px] text-danger">
                {formError}
              </p>
            )}
            <button type="submit" className="btn btn-primary mt-6 w-full" disabled={submitting || !quote?.can_checkout} data-testid="place-order">
              {submitting ? <Spinner /> : 'Place demo order'}
            </button>
            {!quote?.can_checkout && quote && <p className="mt-2 text-[13px] text-danger">Some items need attention in your bag.</p>}
            <p className="mt-3 text-center text-[12px] text-muted">Prices and stock are re-verified by the store when you place the order.</p>
          </div>
        </aside>
      </form>
    </div>
  )
}
