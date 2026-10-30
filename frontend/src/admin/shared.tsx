import { useState, type ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { Spinner } from '../components/ui'
import { cx, money, STATUS_LABELS } from '../lib/format'
import { ApiError } from '../services/api'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
      <div>
        <h1 className="font-display text-[34px] leading-tight md:text-[40px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({ title, children, actions, className, padded = true }: { title?: string; children: ReactNode; actions?: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cx('card overflow-hidden', className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-[14px] font-semibold">{title}</h2>
          {actions}
        </div>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  )
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-soft text-ink border-line-strong',
  confirmed: 'bg-surface text-ink border-ink/40',
  preparing: 'bg-surface text-ink border-ink/40',
  shipped: 'bg-ink/85 text-ivory border-transparent',
  delivered: 'bg-ink text-ivory border-transparent',
  cancelled: 'bg-surface text-danger border-danger/40 line-through decoration-1',
  published: 'bg-ink text-ivory border-transparent',
  draft: 'bg-soft text-ink border-line-strong',
  archived: 'bg-surface text-muted border-line',
  new: 'bg-ink text-ivory border-transparent',
  reviewing: 'bg-soft text-ink border-line-strong',
  quoted: 'bg-surface text-ink border-ink/40',
  approved: 'bg-ink/85 text-ivory border-transparent',
  rejected: 'bg-surface text-danger border-danger/40',
  completed: 'bg-ink text-ivory border-transparent',
  out: 'bg-surface text-danger border-danger/40',
  low: 'bg-soft text-ink border-ink/40',
  ok: 'bg-surface text-success border-success/30',
}

export function Badge({ value, label }: { value: string; label?: string }) {
  return <span className={cx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize', STATUS_STYLE[value] ?? 'bg-soft border-line')}>{label ?? STATUS_LABELS[value] ?? value.replaceAll('_', ' ')}</span>
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 font-display text-[34px] leading-none tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-[12px] text-muted">{hint}</p>}
    </div>
  )
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span>
        <span className="block text-[14px] font-medium">{label}</span>
        {description && <span className="block text-[12px] text-muted">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-line-strong transition peer-checked:bg-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink peer-focus-visible:ring-offset-2" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

export function Input({ label, error, hint, className, ...props }: { label: string; error?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id ?? props.name ?? label.toLowerCase().replace(/\W+/g, '-')
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input id={id} className="field" aria-invalid={!!error || undefined} {...props} />
      {hint && !error && <p className="mt-1 text-[12px] text-muted">{hint}</p>}
      {error && <p className="mt-1 text-[12px] text-danger">{error}</p>}
    </div>
  )
}

export function TextArea({ label, error, className, ...props }: { label: string; error?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = props.id ?? props.name ?? label.toLowerCase().replace(/\W+/g, '-')
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <textarea id={id} className="field" aria-invalid={!!error || undefined} {...props} />
      {error && <p className="mt-1 text-[12px] text-danger">{error}</p>}
    </div>
  )
}

export function Pagination({ meta, onPage }: { meta?: { current_page: number; last_page: number; total: number }; onPage: (p: number) => void }) {
  if (!meta || meta.last_page <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[13px]">
      <span className="text-muted">
        Page {meta.current_page} of {meta.last_page} · {meta.total} total
      </span>
      <div className="flex gap-2">
        <button type="button" className="chip h-9" disabled={meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)}>
          Previous
        </button>
        <button type="button" className="chip h-9" disabled={meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)}>
          Next
        </button>
      </div>
    </div>
  )
}

export function SaveButton({ busy, children = 'Save changes', className, ...props }: { busy?: boolean; children?: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cx('btn btn-primary btn-sm h-11', className)} disabled={busy || props.disabled} {...props}>
      {busy ? <Spinner /> : children}
    </button>
  )
}

/** Normalises API validation errors into { field: message }. */
export function errorsOf(e: unknown): Record<string, string> {
  return e instanceof ApiError ? Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]])) : {}
}

export function messageOf(e: unknown): string {
  if (e instanceof ApiError) return Object.values(e.errors)[0]?.[0] ?? e.message
  return 'Something went wrong.'
}

export function useFlash() {
  const [flash, setFlash] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const show = (type: 'ok' | 'error', text: string) => {
    setFlash({ type, text })
    window.setTimeout(() => setFlash(null), 3500)
  }
  const node = flash && (
    <div role="status" className={cx('fixed bottom-6 right-6 z-[90] flex items-center gap-2 rounded-full px-5 py-3 text-[14px] shadow-lift animate-fade-up', flash.type === 'ok' ? 'bg-ink text-ivory' : 'bg-danger text-white')}>
      <Icon name={flash.type === 'ok' ? 'check' : 'info'} size={16} />
      {flash.text}
    </div>
  )
  return { show, node }
}

/** 30-day revenue — single series, so no legend; hover tooltip per bar; a table for screen readers. */
export function RevenueChart({ data }: { data: { date: string; revenue: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 720
  const H = 220
  const pad = { l: 44, r: 8, t: 12, b: 26 }
  const max = Math.max(50, ...data.map((d) => d.revenue))
  const nice = Math.ceil(max / 50) * 50
  const bw = (W - pad.l - pad.r) / data.length
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / nice)
  const ticks = [0, nice / 2, nice]

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Demo revenue per day, last 30 days">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#E5E1DA" strokeWidth={1} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#716D68">
              ${t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const h = Math.max(0, H - pad.b - y(d.revenue))
          const x = pad.l + i * bw + 1
          const w = Math.max(2, bw - 2)
          const r = Math.min(4, w / 2, h)
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x},${H - pad.b} V${H - pad.b - h + r} Q${x},${H - pad.b - h} ${x + r},${H - pad.b - h} H${x + w - r} Q${x + w},${H - pad.b - h} ${x + w},${H - pad.b - h + r} V${H - pad.b} Z`}
                  fill="#17181C"
                  opacity={hover === null || hover === i ? 1 : 0.35}
                />
              )}
              {i % 7 === 0 && (
                <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="#716D68">
                  {new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </text>
              )}
            </g>
          )
        })}
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="#CFC9BF" />
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 rounded-lg bg-ink px-3 py-2 text-[12px] text-ivory shadow-lift" style={{ left: `clamp(0px, calc(${((pad.l + hover * bw) / W) * 100}% - 40px), calc(100% - 120px))` }}>
          <p className="text-ivory/70">{new Date(data[hover].date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          <p className="font-semibold">{money(data[hover].revenue)}</p>
        </div>
      )}
      <table className="sr-only">
        <caption>Demo revenue per day</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th>{d.date}</th>
              <td>{money(d.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
