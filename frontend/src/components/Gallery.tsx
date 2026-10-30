import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../lib/format'
import type { MediaItem } from '../types'
import { Icon } from './Icon'

/** Scroll-snap track helpers shared by the inline gallery and the lightbox. */
function useTrack(initial = 0) {
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(initial)
  const go = useCallback((i: number, smooth = true) => {
    setIndex(i)
    const el = ref.current
    if (el) el.scrollTo({ left: el.clientWidth * i, behavior: smooth ? 'smooth' : 'instant' })
  }, [])
  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== index) setIndex(i)
  }
  return { ref, index, go, onScroll }
}

function Lightbox({ images, start, name, onClose }: { images: MediaItem[]; start: number; name: string; onClose: () => void }) {
  const { ref, index, go, onScroll } = useTrack(start)
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => go(start, false))
    closeBtn.current?.focus()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [go, start])

  useEffect(() => setZoom(null), [index])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && index < images.length - 1) go(index + 1)
      if (e.key === 'ArrowLeft' && index > 0) go(index - 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, images.length, go, onClose])

  // Desktop: click toggles a 2× zoom centred on the pointer. Touch devices use native pinch-zoom.
  const toggleZoom = (e: MouseEvent<HTMLImageElement>) => {
    if (zoom) return setZoom(null)
    const r = e.currentTarget.getBoundingClientRect()
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${name} image gallery`} className="fixed inset-0 z-[85] flex animate-fade-in flex-col bg-ivory">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <p className="text-[13px] text-muted tabular-nums" aria-live="polite">
          {index + 1} / {images.length}
        </p>
        <button ref={closeBtn} type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-surface hover:border-ink" aria-label="Close gallery">
          <Icon name="close" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={ref} onScroll={onScroll} className="flex h-full snap-x snap-mandatory overflow-x-auto scrollbar-none">
          {images.map((m, i) => (
            <div key={m.id} className="flex h-full w-full shrink-0 snap-center items-center justify-center overflow-hidden px-4 pb-4 sm:px-16">
              <img
                src={m.url}
                alt={m.alt || name}
                onClick={toggleZoom}
                draggable={false}
                className={cx('max-h-full max-w-full touch-pinch-zoom select-none object-contain transition-transform duration-300 ease-out', zoom && i === index ? 'cursor-zoom-out' : 'cursor-zoom-in')}
                style={zoom && i === index ? { transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
              />
            </div>
          ))}
        </div>
        {index > 0 && (
          <button type="button" onClick={() => go(index - 1)} className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface/90 hover:border-ink sm:grid" aria-label="Previous image">
            <Icon name="arrowLeft" />
          </button>
        )}
        {index < images.length - 1 && (
          <button type="button" onClick={() => go(index + 1)} className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface/90 hover:border-ink sm:grid" aria-label="Next image">
            <Icon name="arrowRight" />
          </button>
        )}
      </div>

      <div className="flex justify-center gap-2 overflow-x-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 scrollbar-none">
        {images.map((m, i) => (
          <button key={m.id} type="button" onClick={() => go(i)} aria-label={`Show image ${i + 1}`} aria-current={i === index} className={cx('w-12 shrink-0 overflow-hidden rounded-md border transition sm:w-14', i === index ? 'border-ink' : 'border-transparent opacity-60 hover:opacity-100')}>
            <img src={m.url} alt="" className="aspect-[4/5] w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
    </div>,
    document.body,
  )
}

export function Gallery({ media, activeColor, name }: { media: MediaItem[]; activeColor: string | null; name: string }) {
  const images = media.filter((m) => m.type === 'image')
  const video = media.find((m) => m.type === 'video')
  const { ref, index, go, onScroll } = useTrack()
  const [lightbox, setLightbox] = useState<number | null>(null)

  // Jump to the image for the selected colour.
  useEffect(() => {
    const i = images.findIndex((m) => m.color_name === activeColor)
    if (i >= 0) go(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeColor])

  return (
    <div className="lg:grid lg:grid-cols-[84px_minmax(0,1fr)] lg:gap-4">
      <div className="hidden flex-col gap-3 lg:flex" role="tablist" aria-label="Product images">
        {images.map((m, i) => (
          <button key={m.id} type="button" role="tab" aria-selected={index === i} aria-label={`Image ${i + 1}`} onClick={() => go(i)} className={cx('overflow-hidden rounded-lg border transition', index === i ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100')}>
            <img src={m.url} alt="" className="aspect-[4/5] w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
      <div className="min-w-0">
        <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-soft">
          <div ref={ref} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none lg:overflow-hidden">
            {images.map((m, i) => (
              <button key={m.id} type="button" onClick={() => setLightbox(i)} className="group block aspect-[4/5] w-full shrink-0 cursor-zoom-in snap-center overflow-hidden" aria-label={`Open image ${i + 1} of ${images.length} full screen`}>
                <img
                  src={m.url}
                  alt={m.alt || name}
                  width={m.width ?? 1200}
                  height={m.height ?? 1500}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  fetchPriority={i === 0 ? 'high' : undefined}
                  className="h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.015]"
                />
              </button>
            ))}
          </div>
          <span className="pointer-events-none absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-ivory/85 text-ink backdrop-blur" aria-hidden="true">
            <Icon name="plus" size={16} />
          </span>
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
            {images.map((m, i) => (
              <span key={m.id} className={cx('h-1.5 rounded-full bg-ink transition-all', i === index ? 'w-5' : 'w-1.5 opacity-30')} />
            ))}
          </div>
        </div>
        {/* Mobile thumbnails */}
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none lg:hidden" aria-label="Product images">
            {images.map((m, i) => (
              <button key={m.id} type="button" onClick={() => go(i)} aria-label={`Image ${i + 1}`} aria-current={index === i} className={cx('w-14 shrink-0 overflow-hidden rounded-md border transition', index === i ? 'border-ink' : 'border-transparent opacity-70')}>
                <img src={m.url} alt="" className="aspect-[4/5] w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
        {video && (
          <a href={video.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-[13px] underline underline-offset-4">
            <Icon name="external" size={14} /> Watch product video
          </a>
        )}
      </div>
      {lightbox !== null && <Lightbox images={images} start={lightbox} name={name} onClose={() => setLightbox(null)} />}
    </div>
  )
}
