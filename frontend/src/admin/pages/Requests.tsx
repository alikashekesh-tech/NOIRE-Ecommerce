import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { DemoNotice, Skeleton } from '../../components/ui'
import { cx, date, money } from '../../lib/format'
import { api } from '../../services/api'
import { Badge, messageOf, PageHeader, Panel, SaveButton, useFlash } from '../shared'

interface Req {
  id: number
  reference: string
  style: string | null
  colors: string | null
  personalization: string | null
  instructions: string | null
  name: string
  email: string
  phone: string | null
  status: string
  quoted_price: string | null
  internal_notes: string | null
  created_at: string
  product: { name: string; slug: string } | null
  device_model: string | null
  has_image: boolean
}

const STATUSES = ['new', 'reviewing', 'quoted', 'approved', 'rejected', 'completed']

function Detail({ req, onSaved, flash }: { req: Req; onSaved: () => void; flash: ReturnType<typeof useFlash>['show'] }) {
  const [form, setForm] = useState({ status: req.status, quoted_price: req.quoted_price ?? '', internal_notes: req.internal_notes ?? '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => setForm({ status: req.status, quoted_price: req.quoted_price ?? '', internal_notes: req.internal_notes ?? '' }), [req])
  const save = async () => {
    setBusy(true)
    try {
      await api(`/admin/custom-requests/${req.id}`, { method: 'PUT', body: { ...form, quoted_price: form.quoted_price || null } })
      flash('ok', `${req.reference} updated`)
      onSaved()
    } catch (e) {
      flash('error', messageOf(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Panel title={`${req.reference} · ${req.name}`} actions={<Badge value={req.status} />}>
      <dl className="grid gap-x-6 gap-y-3 text-[14px] sm:grid-cols-2">
        <div><dt className="text-[12px] text-muted">iPhone model</dt><dd>{req.device_model ?? '—'}</dd></div>
        <div><dt className="text-[12px] text-muted">Style</dt><dd>{req.style ?? '—'}</dd></div>
        <div><dt className="text-[12px] text-muted">Colours</dt><dd>{req.colors ?? '—'}</dd></div>
        <div><dt className="text-[12px] text-muted">Personalisation</dt><dd>{req.personalization ?? '—'}</dd></div>
        {req.product && <div><dt className="text-[12px] text-muted">Based on</dt><dd><a href={`/products/${req.product.slug}`} target="_blank" rel="noreferrer" className="underline">{req.product.name}</a></dd></div>}
        <div><dt className="text-[12px] text-muted">Contact</dt><dd>{req.email}{req.phone ? ` · ${req.phone}` : ''}</dd></div>
        <div className="sm:col-span-2"><dt className="text-[12px] text-muted">Idea</dt><dd className="whitespace-pre-line">{req.instructions ?? '—'}</dd></div>
      </dl>
      {req.has_image && (
        <div className="mt-4">
          <p className="mb-2 text-[12px] text-muted">Reference image (private)</p>
          <a href={`/api/v1/admin/custom-requests/${req.id}/image`} target="_blank" rel="noreferrer">
            <img src={`/api/v1/admin/custom-requests/${req.id}/image`} alt={`Reference for ${req.reference}`} className="max-h-72 rounded-lg border border-line object-contain" />
          </a>
        </div>
      )}
      <div className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
        <div>
          <label htmlFor="req-status" className="label">Status</label>
          <select id="req-status" className="field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="req-quote" className="label">Suggested quotation (USD)</label>
          <input id="req-quote" className="field" inputMode="decimal" value={form.quoted_price} onChange={(e) => setForm({ ...form, quoted_price: e.target.value })} placeholder="e.g. 95.00" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="req-notes" className="label">Internal notes</label>
          <textarea id="req-notes" className="field" rows={3} value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <DemoNotice className="flex-1">Saving records the quotation in the dashboard only — no reply is sent to the customer.</DemoNotice>
        <SaveButton busy={busy} onClick={save}>Save</SaveButton>
      </div>
    </Panel>
  )
}

export default function Requests() {
  const qc = useQueryClient()
  const flash = useFlash()
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'requests', status], queryFn: () => api<Req[]>(`/admin/custom-requests${status ? `?status=${status}` : ''}`) })
  const current = data?.find((r) => r.id === selected) ?? data?.[0]

  return (
    <>
      {flash.node}
      <PageHeader title="Custom requests" subtitle="“Create Your Own” submissions from the storefront." />
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="chip h-10" aria-pressed={!status} onClick={() => setStatus('')}>All</button>
        {STATUSES.map((s) => <button key={s} type="button" className="chip h-10 capitalize" aria-pressed={status === s} onClick={() => setStatus(s)}>{s}</button>)}
      </div>
      {isLoading ? (
        <Skeleton className="h-80" />
      ) : !data?.length ? (
        <Panel><p className="py-10 text-center text-muted">No requests{status ? ` with status “${status}”` : ''}.</p></Panel>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          <Panel padded={false}>
            <ul className="divide-y divide-line">
              {data.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setSelected(r.id)} className={cx('w-full px-5 py-4 text-left hover:bg-ivory', current?.id === r.id && 'bg-ivory')}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[14px] font-semibold">{r.name}</span>
                      <Badge value={r.status} />
                    </div>
                    <p className="mt-1 text-[13px] text-muted">{r.reference} · {r.style} · {r.device_model}</p>
                    <p className="text-[12px] text-muted">{date(r.created_at)}{r.quoted_price ? ` · quoted ${money(r.quoted_price)}` : ''}</p>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
          <div className="xl:col-span-2">{current && <Detail req={current} flash={flash.show} onSaved={() => qc.invalidateQueries({ queryKey: ['admin', 'requests'] })} />}</div>
        </div>
      )}
    </>
  )
}
