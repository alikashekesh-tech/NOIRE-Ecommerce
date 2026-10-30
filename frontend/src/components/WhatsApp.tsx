import { useState } from 'react'
import { buildMessage, whatsappLink, type InquiryContext } from '../lib/whatsapp'
import { useSettings } from '../services/queries'
import { ChatGlyph, Icon } from './Icon'
import { Sheet } from './ui'

/**
 * Opens WhatsApp with a prefilled message. When no business number is configured
 * (demo default), shows a preview of the exact message instead of guessing a contact.
 */
export function useWhatsApp() {
  const { data: settings } = useSettings()
  const [preview, setPreview] = useState<string | null>(null)
  const enabled = settings?.whatsapp.enabled ?? false

  const send = (message: string) => {
    const link = whatsappLink(settings?.whatsapp.number, message)
    if (link) window.open(link, '_blank', 'noopener,noreferrer')
    else setPreview(message)
  }

  const previewSheet = (
    <Sheet open={preview !== null} onClose={() => setPreview(null)} title="WhatsApp preview" side="center">
      <p className="mb-4 text-sm text-muted">
        The business WhatsApp number hasn’t been configured for this demo yet, so instead of opening a chat we’re showing the exact message a customer would send.
      </p>
      <div className="rounded-2xl rounded-tr-sm bg-[#E7F3E2] p-4 text-[14px] leading-relaxed whitespace-pre-line text-ink" data-testid="whatsapp-preview">
        {preview}
      </div>
      <p className="mt-4 text-[12px] text-muted">Set the number in Admin → Settings → WhatsApp to open real conversations.</p>
      <button
        type="button"
        className="btn btn-outline btn-sm mt-5"
        onClick={() => {
          navigator.clipboard?.writeText(preview ?? '')
        }}
      >
        Copy message
      </button>
    </Sheet>
  )

  return { enabled, settings, send, previewSheet }
}

export function WhatsAppFab() {
  const { enabled, settings, send, previewSheet } = useWhatsApp()
  if (!enabled) return null
  return (
    <>
      <button
        type="button"
        onClick={() => send(settings?.whatsapp.default_message || 'Hello NOIRÉ!')}
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-40 grid h-13 w-13 place-items-center rounded-full bg-ink text-ivory shadow-lift transition hover:scale-105 max-lg:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:right-6"
        aria-label="Chat with NOIRÉ on WhatsApp"
        data-fab="whatsapp"
      >
        <ChatGlyph size={24} />
      </button>
      {previewSheet}
    </>
  )
}

export function ProductInquiry({ ctx }: { ctx: InquiryContext }) {
  const { enabled, settings, send, previewSheet } = useWhatsApp()
  const [open, setOpen] = useState(false)
  if (!enabled) return null
  const templates = settings?.whatsapp.templates ?? []

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-outline w-full" aria-haspopup="dialog">
        <ChatGlyph size={18} /> Ask About This Product
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Ask about this product" side="bottom">
        <p className="mb-4 text-sm text-muted">
          Choose a question — we’ll prepare a WhatsApp message with <strong className="font-semibold text-ink">{ctx.product}</strong>
          {ctx.model ? `, ${ctx.model}` : ''}
          {ctx.color ? `, ${ctx.color}` : ''}.
        </p>
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {templates.map((t) => (
            <li key={t.key}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-4 text-left text-[15px] hover:bg-soft"
                onClick={() => {
                  setOpen(false)
                  send(buildMessage(t, ctx))
                }}
              >
                {t.label}
                <Icon name="chevronRight" size={18} className="text-muted" />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
      {previewSheet}
    </>
  )
}
