import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import logoDark from '../assets/brand/logo-noire-dark.png'
import logoLight from '../assets/brand/logo-noire-light.png'
import { cx, money } from '../lib/format'
import { useUi } from '../store/shop'
import { Icon } from './Icon'

/**
 * Official NOIRÉ wordmark (client artwork; the dark variant is a pixel recolour for light backgrounds).
 * Size it with a width class only — height is always automatic, so the 1080×520 aspect ratio can't distort.
 */
export function Logo({ tone = 'dark', className = 'w-20' }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    <img
      src={tone === 'dark' ? logoDark : logoLight}
      alt="NOIRÉ"
      width={1080}
      height={520}
      className={cx('block aspect-[1080/520] h-auto max-w-full shrink-0 select-none object-contain', className)}
      draggable={false}
    />
  )
}

export function Price({ price, compare, className }: { price: string; compare?: string | null; className?: string }) {
  const onSale = compare && Number(compare) > Number(price)
  return (
    <span className={cx('inline-flex items-baseline gap-2 tabular-nums', className)}>
      <span>{money(price)}</span>
      {onSale && (
        <s className="text-muted text-[0.9em]" aria-label={`Was ${money(compare)}`}>
          {money(compare)}
        </s>
      )}
    </span>
  )
}

/** Accessible modal panel: focus trap, Escape to close, scroll lock, returns focus. */
export function Sheet({
  open,
  onClose,
  title,
  side = 'right',
  children,
  footer,
  widthClass = 'w-full sm:max-w-md',
}: {
  open: boolean
  onClose: () => void
  title: string
  side?: 'right' | 'left' | 'bottom' | 'center'
  children: ReactNode
  footer?: ReactNode
  widthClass?: string
}) {
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const focusables = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])') ?? [])
    requestAnimationFrame(() => (focusables()[0] ?? panel.current)?.focus())
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const els = focusables()
        if (!els.length) return
        const first = els[0]
        const last = els[els.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null
  const position = {
    right: 'right-0 top-0 h-full animate-slide-in-right',
    left: 'left-0 top-0 h-full animate-slide-in-left',
    bottom: 'bottom-0 left-0 right-0 max-h-[88dvh] rounded-t-2xl animate-slide-up',
    center: 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[90dvh] rounded-2xl animate-fade-in w-[calc(100%-32px)]',
  }[side]

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-ink/45 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx('absolute flex flex-col bg-ivory shadow-lift outline-none', position, side !== 'bottom' && side !== 'center' && widthClass, side === 'center' && 'max-w-lg')}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <h2 id={titleId} className="font-display text-2xl">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="-mr-2 grid h-11 w-11 place-items-center rounded-full hover:bg-soft" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Toast() {
  const { toast } = useUi()
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex justify-center px-4 sm:bottom-8">
      {toast && (
        <div key={toast.id} className="animate-fade-up rounded-full bg-ink px-5 py-3 text-sm text-ivory shadow-lift">
          {toast.message}
        </div>
      )}
    </div>
  )
}

export function DemoNotice({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx('flex items-start gap-2 rounded-xl border border-dashed border-line-strong bg-soft px-4 py-3 text-[13px] leading-snug text-muted', className)}>
      <Icon name="info" size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

export function DemoBadge({ label = 'Demo Store' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-ink/60" aria-hidden="true" />
      {label}
    </span>
  )
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[12px] text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {item.to ? (
              <Link to={item.to} className="link-underline hover:text-ink">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function QuantityStepper({ value, onChange, max = 10, label = 'Quantity', size = 'md' }: { value: number; onChange: (v: number) => void; max?: number; label?: string; size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 'h-9' : 'h-12'
  return (
    <div className={cx('inline-flex items-center rounded-full border border-line bg-surface', h)} role="group" aria-label={label}>
      <button type="button" className={cx('grid place-items-center rounded-full hover:bg-soft disabled:opacity-30', size === 'sm' ? 'h-9 w-9' : 'h-12 w-12')} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease quantity">
        <Icon name="minus" size={16} />
      </button>
      <span className="min-w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className={cx('grid place-items-center rounded-full hover:bg-soft disabled:opacity-30', size === 'sm' ? 'h-9 w-9' : 'h-12 w-12')} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Icon name="plus" size={16} />
      </button>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-[var(--radius-card)] bg-soft', className)} aria-hidden="true" />
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)} aria-hidden="true" />
}

export function Seo({ title, description }: { title: string; description?: string | null }) {
  // React 19 hoists these into <head>.
  return (
    <>
      <title>{title.includes('NOIRÉ') ? title : `${title} — NOIRÉ`}</title>
      {description && <meta name="description" content={description} />}
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
    </>
  )
}

export function SectionHeading({ eyebrow, title, action, className }: { eyebrow?: string; title: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-12', className)}>
      <div>
        {eyebrow && <p className="eyebrow mb-3 text-muted">{eyebrow}</p>}
        <h2 className="heading-section">{title}</h2>
      </div>
      {action}
    </div>
  )
}
