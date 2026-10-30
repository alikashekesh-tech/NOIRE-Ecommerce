import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Icon } from '../components/Icon'
import { DemoNotice, Seo, Spinner } from '../components/ui'
import { cx } from '../lib/format'
import { api, ApiError } from '../services/api'
import { useSettings } from '../services/queries'

const STYLES = ['Monogram', 'Embroidered florals', 'Pearl embellishment', 'Abstract painting', 'Beaded charm', 'Something else']

export default function CustomDesign() {
  const { data: settings } = useSettings()
  const [params] = useSearchParams()
  const [form, setForm] = useState({ device_model_id: '', style: '', colors: '', personalization: '', instructions: '', name: '', email: '', phone: '' })
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const v: Record<string, string> = {}
    if (!form.device_model_id) v.device_model_id = 'Please choose your iPhone model.'
    if (!form.style) v.style = 'Please choose a style.'
    if (!form.name.trim()) v.name = 'Please enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) v.email = 'Please enter a valid email.'
    if (file && file.size > 5 * 1024 * 1024) v.reference_image = 'Images must be 5 MB or smaller.'
    setErrors(v)
    if (Object.keys(v).length) return
    setBusy(true)
    const body = new FormData()
    Object.entries(form).forEach(([k, val]) => val && body.append(k, val))
    if (params.get('product')) body.append('product_id', params.get('product')!)
    if (file) body.append('reference_image', file)
    try {
      const res = await api<{ reference: string }>('/custom-requests', { method: 'POST', body })
      setDone(res.reference)
    } catch (err) {
      if (err instanceof ApiError) setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, m]) => [k, m[0]])))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="container-lux py-24 text-center">
        <Seo title="Request received" />
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ink text-ivory"><Icon name="check" size={26} /></span>
        <h1 className="heading-section mt-6">Your design request is in.</h1>
        <p className="mx-auto mt-4 max-w-md text-muted">
          Reference <strong className="text-ink">{done}</strong>. The NOIRÉ atelier will review your idea and prepare a quotation.
        </p>
        <DemoNotice className="mx-auto mt-8 max-w-md text-left">Demo: your request is stored in the admin dashboard. No email or WhatsApp reply is sent automatically.</DemoNotice>
        <Link to="/collections/handmade-creations" className="btn btn-primary mt-8">Explore handmade</Link>
      </div>
    )
  }

  const err = (k: string) => errors[k] && <p className="mt-1.5 text-[13px] text-danger">{errors[k]}</p>
  return (
    <div className="container-lux py-10 md:py-16">
      <Seo title="Create Your Own Case" description="Request a personalised, handmade NOIRÉ case." />
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="lg:sticky lg:top-32 lg:col-span-5 lg:self-start">
          <p className="eyebrow mb-4 text-muted">The Atelier</p>
          <h1 className="heading-section">Create Your Own Case</h1>
          <p className="mt-5 max-w-md text-ink/75">Tell us about the piece you imagine — initials, florals, pearls or something entirely yours. We’ll review your request and reply with a design proposal and quotation.</p>
          <ol className="mt-10 space-y-6">
            {['Share your idea and an optional inspiration image.', 'The atelier reviews it and prepares a quotation.', 'Approve the design — your case is made by hand.'].map((s, i) => (
              <li key={s} className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink font-display text-lg">{i + 1}</span>
                <p className="pt-1.5 text-[15px]">{s}</p>
              </li>
            ))}
          </ol>
        </div>
        <form onSubmit={submit} noValidate className="card space-y-6 p-5 sm:p-6 md:p-8 lg:col-span-7">
          <div>
            <p className="label">iPhone model</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="iPhone model">
              {settings?.device_models.map((m) => (
                <button key={m.id} type="button" role="radio" aria-checked={form.device_model_id === String(m.id)} className="chip" onClick={() => setForm({ ...form, device_model_id: String(m.id) })}>
                  {m.name}
                </button>
              ))}
            </div>
            {err('device_model_id')}
          </div>
          <div>
            <p className="label">Preferred style</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Preferred style">
              {STYLES.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={form.style === s} className="chip" onClick={() => setForm({ ...form, style: s })}>
                  {s}
                </button>
              ))}
            </div>
            {err('style')}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="colors" className="label">Preferred colours</label>
              <input id="colors" className="field" value={form.colors} onChange={set('colors')} placeholder="e.g. ivory and charcoal" />
            </div>
            <div>
              <label htmlFor="personalization" className="label">Name or initials</label>
              <input id="personalization" className="field" maxLength={40} value={form.personalization} onChange={set('personalization')} />
            </div>
          </div>
          <div>
            <label htmlFor="instructions" className="label">Describe your idea</label>
            <textarea id="instructions" className="field" maxLength={1500} value={form.instructions} onChange={set('instructions')} />
          </div>
          <div>
            <label htmlFor="reference_image" className="label">Inspiration image <span className="font-normal text-muted">(optional · JPG, PNG or WebP, up to 5 MB)</span></label>
            <label htmlFor="reference_image" className={cx('flex cursor-pointer items-center gap-3 rounded-xl border border-dashed bg-ivory px-4 py-4 text-[14px]', file ? 'border-ink' : 'border-line-strong')}>
              <Icon name="upload" size={18} />
              {file ? file.name : 'Choose an image'}
            </label>
            <input id="reference_image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {err('reference_image')}
          </div>
          <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="label">Name</label>
              <input id="name" className="field" autoComplete="name" value={form.name} onChange={set('name')} aria-invalid={!!errors.name} />
              {err('name')}
            </div>
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input id="email" type="email" className="field" autoComplete="email" value={form.email} onChange={set('email')} aria-invalid={!!errors.email} />
              {err('email')}
            </div>
            <div>
              <label htmlFor="phone" className="label">Phone <span className="font-normal text-muted">(optional)</span></label>
              <input id="phone" type="tel" className="field" autoComplete="tel" value={form.phone} onChange={set('phone')} />
              {err('phone')}
            </div>
          </div>
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? <Spinner /> : 'Submit design request'}
          </button>
          <p className="text-center text-[12px] text-muted">Demo: requests are stored for the admin to review. No reply is sent automatically.</p>
        </form>
      </div>
    </div>
  )
}
