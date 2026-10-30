import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { DemoNotice, Skeleton } from '../../components/ui'
import { cx } from '../../lib/format'
import { api } from '../../services/api'
import type { AdminUser } from '../AdminApp'
import { Input, messageOf, PageHeader, Panel, SaveButton, TextArea, Toggle, useFlash } from '../shared'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Flash = ReturnType<typeof useFlash>['show']

const TABS = ['Store', 'WhatsApp', 'Shipping', 'Device models', 'Collections', 'Social & pages', 'Demo'] as const

function useSettingsGroup(key: string, flash: Flash) {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['admin', 'settings'], queryFn: () => api<Record<string, any>>('/admin/settings') })
  const [value, setValue] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (data) setValue(structuredClone(data[key] ?? {}))
  }, [data, key])
  const save = async (override?: any) => {
    setBusy(true)
    try {
      await api(`/admin/settings/${key}`, { method: 'PUT', body: override ?? value })
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
      qc.invalidateQueries({ queryKey: ['settings'] })
      flash('ok', 'Settings saved')
    } catch (e) {
      flash('error', messageOf(e))
    } finally {
      setBusy(false)
    }
  }
  return { value, setValue, save, busy }
}

function StoreTab({ flash }: { flash: Flash }) {
  const { value: v, setValue, save, busy } = useSettingsGroup('store', flash)
  if (!v) return <Skeleton className="h-64" />
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue({ ...v, [k]: e.target.value })
  return (
    <Panel title="Store information">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Store name" value={v.name ?? ''} onChange={set('name')} />
        <Input label="Tagline" value={v.tagline ?? ''} onChange={set('tagline')} />
        <TextArea label="Short description (footer)" className="sm:col-span-2" rows={2} value={v.description ?? ''} onChange={set('description')} />
        <Input label="Contact email" type="email" value={v.contact_email ?? ''} onChange={set('contact_email')} placeholder="Not set — add the client’s address" />
        <Input label="Demo badge label" value={v.demo_badge ?? ''} onChange={set('demo_badge')} />
        <TextArea label="Business information" className="sm:col-span-2" rows={2} value={v.business_info ?? ''} onChange={set('business_info')} />
        <p className="text-[13px] text-muted sm:col-span-2">Currency: USD. The logo is the official NOIRÉ artwork bundled with the site.</p>
      </div>
      <div className="mt-5 flex justify-end"><SaveButton busy={busy} onClick={() => save({ ...v, contact_email: v.contact_email || null })} /></div>
    </Panel>
  )
}

function WhatsAppTab({ flash }: { flash: Flash }) {
  const { value: v, setValue, save, busy } = useSettingsGroup('whatsapp', flash)
  if (!v) return <Skeleton className="h-64" />
  return (
    <Panel title="WhatsApp inquiries">
      <Toggle label="Enable WhatsApp buttons" description="Floating contact button, product inquiries and bag inquiries" checked={!!v.enabled} onChange={(x) => setValue({ ...v, enabled: x })} />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Input label="Business WhatsApp number" value={v.number ?? ''} onChange={(e) => setValue({ ...v, number: e.target.value })} placeholder="+961 …" hint="International format. Leave blank to show message previews instead of opening WhatsApp." />
        <Input label="Default general message" value={v.default_message ?? ''} onChange={(e) => setValue({ ...v, default_message: e.target.value })} />
      </div>
      <p className="label mt-6">Inquiry templates</p>
      <p className="mb-3 text-[12px] text-muted">Placeholders: {'{product} {variant} {model} {color} {sku} {url}'}</p>
      <div className="space-y-3">
        {(v.templates ?? []).map((t: any, i: number) => (
          <div key={i} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[200px_1fr]">
            <input className="field h-10 min-h-0" value={t.label} onChange={(e) => setValue({ ...v, templates: v.templates.map((x: any, j: number) => (j === i ? { ...x, label: e.target.value } : x)) })} aria-label="Template label" />
            <input className="field h-10 min-h-0" value={t.message} onChange={(e) => setValue({ ...v, templates: v.templates.map((x: any, j: number) => (j === i ? { ...x, message: e.target.value } : x)) })} aria-label="Template message" />
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end"><SaveButton busy={busy} onClick={() => save()} /></div>
    </Panel>
  )
}

function ShippingTab({ flash }: { flash: Flash }) {
  const { value: v, setValue, save, busy } = useSettingsGroup('shipping', flash)
  if (!v) return <Skeleton className="h-64" />
  const setMethod = (i: number, patch: any) => setValue({ ...v, methods: v.methods.map((m: any, j: number) => (j === i ? { ...m, ...patch } : m)) })
  return (
    <Panel title="Delivery (demo values)">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Free standard delivery threshold (USD)" inputMode="decimal" value={v.free_threshold ?? ''} onChange={(e) => setValue({ ...v, free_threshold: e.target.value === '' ? null : Number(e.target.value) })} />
        <Input label="Countries (comma-separated)" value={(v.countries ?? []).join(', ')} onChange={(e) => setValue({ ...v, countries: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} />
        <TextArea label="Delivery areas (one per line)" className="sm:col-span-2" rows={4} value={(v.areas ?? []).join('\n')} onChange={(e) => setValue({ ...v, areas: e.target.value.split('\n').map((s: string) => s.trim()).filter(Boolean) })} />
        <TextArea label="Delivery note (product pages)" className="sm:col-span-2" rows={2} value={v.delivery_note ?? ''} onChange={(e) => setValue({ ...v, delivery_note: e.target.value })} />
      </div>
      <p className="label mt-6">Methods</p>
      <div className="space-y-3">
        {v.methods.map((m: any, i: number) => (
          <div key={m.code} className="grid items-end gap-3 rounded-xl border border-line p-4 sm:grid-cols-[1fr_110px_1.4fr_auto]">
            <Input label="Name" value={m.name} onChange={(e) => setMethod(i, { name: e.target.value })} />
            <Input label="Fee (USD)" inputMode="decimal" value={m.fee} onChange={(e) => setMethod(i, { fee: e.target.value })} />
            <Input label="Estimate" value={m.estimate ?? ''} onChange={(e) => setMethod(i, { estimate: e.target.value })} />
            <div className="pb-1">
              <Toggle label="On" checked={!!m.enabled} onChange={(x) => setMethod(i, { enabled: x })} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end"><SaveButton busy={busy} onClick={() => save({ ...v, methods: v.methods.map((m: any) => ({ ...m, fee: Number(m.fee) })) })} /></div>
    </Panel>
  )
}

function DeviceModelsTab({ flash }: { flash: Flash }) {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['admin', 'device-models'], queryFn: () => api<any[]>('/admin/device-models') })
  const [draft, setDraft] = useState({ name: '', short_name: '', family: '' })
  const update = async (m: any, patch: any) => {
    try {
      await api(`/admin/device-models/${m.id}`, { method: 'PUT', body: { ...m, ...patch } })
      qc.invalidateQueries({ queryKey: ['admin', 'device-models'] })
      qc.invalidateQueries({ queryKey: ['settings'] })
      flash('ok', 'Device model updated')
    } catch (e) {
      flash('error', messageOf(e))
    }
  }
  const add = async () => {
    try {
      await api('/admin/device-models', { method: 'POST', body: { ...draft, sort_order: (data?.length ?? 0) + 1, is_active: true } })
      setDraft({ name: '', short_name: '', family: '' })
      qc.invalidateQueries({ queryKey: ['admin', 'device-models'] })
      qc.invalidateQueries({ queryKey: ['settings'] })
      flash('ok', 'Device model added')
    } catch (e) {
      flash('error', messageOf(e))
    }
  }
  return (
    <Panel title="Supported iPhone models" padded={false}>
      <ul className="divide-y divide-line">
        {data?.map((m) => (
          <li key={m.id} className="grid items-center gap-3 px-5 py-3 sm:grid-cols-[1fr_160px_140px_auto]">
            <input className="field h-10 min-h-0" defaultValue={m.name} onBlur={(e) => e.target.value !== m.name && update(m, { name: e.target.value })} aria-label="Model name" />
            <input className="field h-10 min-h-0" defaultValue={m.short_name} onBlur={(e) => e.target.value !== m.short_name && update(m, { short_name: e.target.value })} aria-label="Short name" />
            <span className="text-[13px] text-muted">{m.family}</span>
            <Toggle label={m.is_active ? 'Active' : 'Hidden'} checked={m.is_active} onChange={(x) => update(m, { is_active: x })} />
          </li>
        ))}
      </ul>
      <div className="grid items-end gap-3 border-t border-line p-5 sm:grid-cols-[1fr_160px_140px_auto]">
        <Input label="New model name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="iPhone 18 Air" />
        <Input label="Short name" value={draft.short_name} onChange={(e) => setDraft({ ...draft, short_name: e.target.value })} placeholder="18 Air" />
        <Input label="Family" value={draft.family} onChange={(e) => setDraft({ ...draft, family: e.target.value })} placeholder="iPhone 18" />
        <SaveButton onClick={add} disabled={!draft.name || !draft.short_name || !draft.family}>Add</SaveButton>
      </div>
      <p className="px-5 pb-4 text-[12px] text-muted">Planned demo catalogue entries — availability and physical specifications are not confirmed. Hidden models disappear from the storefront selectors.</p>
    </Panel>
  )
}

function CollectionsTab({ flash }: { flash: Flash }) {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['admin', 'collections'], queryFn: () => api<any[]>('/admin/collections') })
  const save = async (c: any, file?: File) => {
    const body = new FormData()
    ;['name', 'slug', 'tagline', 'description', 'sort_order'].forEach((k) => c[k] != null && body.append(k, String(c[k])))
    body.append('is_published', c.is_published ? '1' : '0')
    if (file) body.append('image', file)
    try {
      await api(`/admin/collections/${c.id}`, { method: 'POST', body })
      qc.invalidateQueries({ queryKey: ['admin', 'collections'] })
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['home'] })
      flash('ok', `${c.name} saved`)
    } catch (e) {
      flash('error', messageOf(e))
    }
  }
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {data?.map((c) => <CollectionCard key={c.id} c={c} onSave={save} />)}
    </div>
  )
}

function CollectionCard({ c, onSave }: { c: any; onSave: (c: any, f?: File) => void }) {
  const [v, setV] = useState(c)
  useEffect(() => setV(c), [c])
  return (
    <Panel title={`${c.name} · ${c.products_count} products`}>
      <div className="mb-4 aspect-[4/3] overflow-hidden rounded-lg bg-soft">{c.image_url && <img src={c.image_url} alt="" className="h-full w-full object-cover" />}</div>
      <div className="space-y-3">
        <Input label="Name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        <Input label="Tagline" value={v.tagline ?? ''} onChange={(e) => setV({ ...v, tagline: e.target.value })} />
        <TextArea label="Description" rows={3} value={v.description ?? ''} onChange={(e) => setV({ ...v, description: e.target.value })} />
        <Input label="Display order" type="number" value={v.sort_order} onChange={(e) => setV({ ...v, sort_order: Number(e.target.value) })} />
        <Toggle label="Published" checked={v.is_published} onChange={(x) => setV({ ...v, is_published: x })} />
        <div className="flex items-center justify-between gap-2">
          <label className="btn btn-outline btn-sm cursor-pointer">
            <Icon name="upload" size={16} /> Image
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && onSave(v, e.target.files[0])} />
          </label>
          <SaveButton onClick={() => onSave(v)}>Save</SaveButton>
        </div>
      </div>
    </Panel>
  )
}

function SocialPagesTab({ flash }: { flash: Flash }) {
  const social = useSettingsGroup('social', flash)
  const pages = useSettingsGroup('pages', flash)
  if (!social.value || !pages.value) return <Skeleton className="h-64" />
  return (
    <div className="space-y-4">
      <Panel title="Social links">
        <div className="grid gap-4 sm:grid-cols-3">
          {['instagram', 'tiktok', 'facebook'].map((k) => (
            <Input key={k} label={k[0].toUpperCase() + k.slice(1)} placeholder="https://…" value={social.value[k] ?? ''} onChange={(e) => social.setValue({ ...social.value, [k]: e.target.value })} />
          ))}
        </div>
        <div className="mt-4 flex justify-end"><SaveButton busy={social.busy} onClick={() => social.save(Object.fromEntries(Object.entries(social.value).map(([k, x]) => [k, x || null])))} /></div>
      </Panel>
      <Panel title="Policy & content pages">
        <div className="space-y-5">
          {Object.entries(pages.value).map(([slug, p]: [string, any]) => (
            <div key={slug} className="grid gap-3 border-b border-line pb-5 last:border-0">
              <Input label={`Title · /pages/${slug}`} value={p.title} onChange={(e) => pages.setValue({ ...pages.value, [slug]: { ...p, title: e.target.value } })} />
              <TextArea label="Body" rows={4} value={p.body} onChange={(e) => pages.setValue({ ...pages.value, [slug]: { ...p, body: e.target.value } })} />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end"><SaveButton busy={pages.busy} onClick={() => pages.save()} /></div>
      </Panel>
    </div>
  )
}

function DemoTab({ user, flash }: { user: AdminUser; flash: Flash }) {
  const qc = useQueryClient()
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const reset = async () => {
    setBusy(true)
    try {
      await api('/admin/demo/reset', { method: 'POST', body: { confirm: confirmText } })
      flash('ok', 'Demo data reset')
      qc.clear()
      window.location.href = '/admin'
    } catch (e) {
      flash('error', messageOf(e))
      setBusy(false)
    }
  }
  return (
    <Panel title="Demonstration mode">
      <p className="text-[14px]">Demo mode is <strong>{user.demo_mode ? 'on' : 'off'}</strong>: payments are simulated, no emails or WhatsApp messages are sent, orders are flagged as demo and pages are not indexed.</p>
      <div className="mt-6 rounded-xl border border-danger/30 bg-danger/5 p-5">
        <p className="font-semibold">Reset demo data</p>
        <p className="mt-1 text-[13px] text-muted">Erases every product, order, request and upload in the NOIRÉ demo database and restores the original sample catalogue. Your session will end.</p>
        {user.allow_web_reset ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <input className="field h-11 min-h-0 max-w-[200px]" placeholder="Type RESET" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} aria-label="Type RESET to confirm" />
            <button type="button" className={cx('btn btn-sm h-11 bg-danger text-white', confirmText !== 'RESET' && 'opacity-40')} disabled={confirmText !== 'RESET' || busy} onClick={reset}>
              {busy ? 'Resetting…' : 'Reset demo data'}
            </button>
          </div>
        ) : (
          <DemoNotice className="mt-4">Web reset is disabled. Run <code>php artisan noire:demo-reset</code> on the server.</DemoNotice>
        )}
      </div>
    </Panel>
  )
}

export default function Settings({ user }: { user: AdminUser }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Store')
  const flash = useFlash()
  return (
    <>
      {flash.node}
      <PageHeader title="Settings" subtitle="Store configuration for the demonstration." />
      <div className="-mx-4 mb-5 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
        <div className="flex gap-2" role="tablist">
          {TABS.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={cx('chip h-10 whitespace-nowrap', tab === t && 'is-active')} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      {tab === 'Store' && <StoreTab flash={flash.show} />}
      {tab === 'WhatsApp' && <WhatsAppTab flash={flash.show} />}
      {tab === 'Shipping' && <ShippingTab flash={flash.show} />}
      {tab === 'Device models' && <DeviceModelsTab flash={flash.show} />}
      {tab === 'Collections' && <CollectionsTab flash={flash.show} />}
      {tab === 'Social & pages' && <SocialPagesTab flash={flash.show} />}
      {tab === 'Demo' && <DemoTab user={user} flash={flash.show} />}
    </>
  )
}
