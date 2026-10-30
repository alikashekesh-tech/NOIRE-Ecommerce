import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Icon } from '../../components/Icon'
import { Sheet, Skeleton } from '../../components/ui'
import { cx, money } from '../../lib/format'
import { api } from '../../services/api'
import { Badge, errorsOf, Input, messageOf, PageHeader, Panel, SaveButton, TextArea, Toggle, useFlash } from '../shared'

interface AdminVariant {
  id: number
  sku: string
  device_model_id: number | null
  device_model: string | null
  color_name: string
  color_hex: string
  price: string
  compare_at_price: string | null
  stock: number
  low_stock_threshold: number
  is_active: boolean
  available: number
  components: { variant_id: number; sku: string; name: string; label: string; stock: number; price: string; quantity: number }[]
}
interface AdminMedia {
  id: number
  type: string
  url: string
  alt: string | null
  color_name: string | null
  is_primary: boolean
  sort_order: number
}
interface AdminProduct {
  id: number
  name: string
  slug: string
  type: 'case' | 'power_bank' | 'bundle'
  status: 'draft' | 'published' | 'archived'
  short_description: string | null
  description: string | null
  material: string | null
  care_instructions: string | null
  specs: Record<string, string> | null
  video_url: string | null
  is_featured: boolean
  is_bestseller: boolean
  is_new_arrival: boolean
  is_handmade: boolean
  is_limited_edition: boolean
  is_customizable: boolean
  production_days_min: number | null
  production_days_max: number | null
  seo_title: string | null
  seo_description: string | null
  collection_ids: number[]
  matching_ids: number[]
  variants: AdminVariant[]
  media: AdminMedia[]
  storefront_url: string
  deleted_at: string | null
}
interface DeviceModel { id: number; name: string; short_name: string; is_active: boolean }
interface CollectionRow { id: number; name: string }

const blank = {
  name: '', slug: '', type: 'case', status: 'draft', short_description: '', description: '', material: '', care_instructions: '',
  specs: {} as Record<string, string>, video_url: '', is_featured: false, is_bestseller: false, is_new_arrival: true, is_handmade: false,
  is_limited_edition: false, is_customizable: false, production_days_min: null as number | null, production_days_max: null as number | null,
  seo_title: '', seo_description: '', collection_ids: [] as number[], matching_ids: [] as number[],
}
type FormState = typeof blank

function useLookups() {
  const models = useQuery({ queryKey: ['admin', 'device-models'], queryFn: () => api<DeviceModel[]>('/admin/device-models') })
  const collections = useQuery({ queryKey: ['admin', 'collections'], queryFn: () => api<CollectionRow[]>('/admin/collections') })
  return { models: models.data ?? [], collections: collections.data ?? [] }
}

// ---------------------------------------------------------------- variants

function VariantRow({ v, product, models, onSaved, flash }: { v: AdminVariant; product: AdminProduct; models: DeviceModel[]; onSaved: () => void; flash: ReturnType<typeof useFlash>['show'] }) {
  const [row, setRow] = useState(v)
  const [busy, setBusy] = useState(false)
  const [components, setComponents] = useState(false)
  useEffect(() => setRow(v), [v])
  const dirty = JSON.stringify(row) !== JSON.stringify(v)
  const isBundle = product.type === 'bundle'

  const save = async () => {
    setBusy(true)
    try {
      await api(`/admin/variants/${v.id}`, {
        method: 'PUT',
        body: { ...row, stock: isBundle ? undefined : Number(row.stock), compare_at_price: row.compare_at_price || null, low_stock_threshold: Number(row.low_stock_threshold) },
      })
      flash('ok', `Saved ${row.sku}`)
      onSaved()
    } catch (e) {
      flash('error', messageOf(e))
    } finally {
      setBusy(false)
    }
  }
  const remove = async () => {
    if (!confirm(`Delete variant ${v.sku}? Past orders keep their snapshot.`)) return
    try {
      await api(`/admin/variants/${v.id}`, { method: 'DELETE' })
      onSaved()
    } catch (e) {
      flash('error', messageOf(e))
    }
  }
  const cell = 'field h-10 min-h-0 px-2.5 py-0 text-[13px]'

  return (
    <tr className={cx('align-middle', !row.is_active && 'opacity-60')}>
      <td className="px-2 py-2">
        <select className={cell} value={row.device_model_id ?? ''} onChange={(e) => setRow({ ...row, device_model_id: e.target.value ? Number(e.target.value) : null })} aria-label="Device model">
          <option value="">Any / not model-specific</option>
          {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-1.5">
          <input type="color" value={row.color_hex} onChange={(e) => setRow({ ...row, color_hex: e.target.value.toUpperCase() })} className="h-10 w-10 shrink-0 cursor-pointer rounded-md border border-line bg-white p-1" aria-label="Colour swatch" />
          <input className={cell} value={row.color_name} onChange={(e) => setRow({ ...row, color_name: e.target.value })} aria-label="Colour name" />
        </div>
      </td>
      <td className="px-2 py-2"><input className={cx(cell, 'font-mono uppercase')} value={row.sku} onChange={(e) => setRow({ ...row, sku: e.target.value })} aria-label="SKU" /></td>
      <td className="px-2 py-2"><input className={cell} inputMode="decimal" value={row.price} onChange={(e) => setRow({ ...row, price: e.target.value })} aria-label="Price" /></td>
      <td className="px-2 py-2"><input className={cell} inputMode="decimal" placeholder="—" value={row.compare_at_price ?? ''} onChange={(e) => setRow({ ...row, compare_at_price: e.target.value })} aria-label="Compare-at price" /></td>
      <td className="px-2 py-2">
        {isBundle ? (
          <button type="button" className="chip h-10 text-[12px]" onClick={() => setComponents(true)}>
            {v.available} sets · {v.components.length} parts
          </button>
        ) : (
          <input className={cx(cell, 'w-20', row.stock === 0 && 'text-danger')} type="number" min={0} value={row.stock} onChange={(e) => setRow({ ...row, stock: Number(e.target.value) })} aria-label="Stock" />
        )}
      </td>
      <td className="px-2 py-2 text-center">
        <input type="checkbox" className="h-4 w-4 accent-ink" checked={row.is_active} onChange={(e) => setRow({ ...row, is_active: e.target.checked })} aria-label="Active" />
      </td>
      <td className="whitespace-nowrap px-2 py-2 text-right">
        <SaveButton busy={busy} disabled={!dirty} onClick={save} className="h-10 px-4">Save</SaveButton>
        <button type="button" className="ml-1 inline-grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-soft hover:text-danger" onClick={remove} aria-label={`Delete ${v.sku}`}>
          <Icon name="trash" size={16} />
        </button>
        {isBundle && <BundleComponents open={components} onClose={() => setComponents(false)} variant={v} onSaved={onSaved} flash={flash} />}
      </td>
    </tr>
  )
}

function BundleComponents({ open, onClose, variant, onSaved, flash }: { open: boolean; onClose: () => void; variant: AdminVariant; onSaved: () => void; flash: ReturnType<typeof useFlash>['show'] }) {
  const [items, setItems] = useState(variant.components)
  const [q, setQ] = useState('')
  const { data: results } = useQuery({
    queryKey: ['admin', 'variant-search', q],
    queryFn: () => api<{ id: number; sku: string; name: string; label: string; stock: number; price: string }[]>(`/admin/variant-search?q=${encodeURIComponent(q)}`),
    enabled: open && q.length > 1,
  })
  useEffect(() => setItems(variant.components), [variant, open])
  const save = async () => {
    try {
      await api(`/admin/variants/${variant.id}/components`, { method: 'PUT', body: { components: items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity })) } })
      flash('ok', 'Set components saved')
      onSaved()
      onClose()
    } catch (e) {
      flash('error', messageOf(e))
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title={`Set components · ${variant.sku}`} footer={<SaveButton onClick={save} className="w-full">Save components</SaveButton>}>
      <p className="mb-4 text-[13px] text-muted">A matching set holds no stock of its own — checkout deducts each component below. Available sets = the lowest component stock.</p>
      <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
        {items.map((c) => (
          <li key={c.variant_id} className="flex items-center gap-3 p-3 text-[13px]">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{c.name}</p>
              <p className="text-muted">{c.sku} · {c.label} · stock {c.stock}</p>
            </div>
            <input type="number" min={1} max={5} className="field h-9 min-h-0 w-16 py-0" value={c.quantity} onChange={(e) => setItems(items.map((i) => (i.variant_id === c.variant_id ? { ...i, quantity: Number(e.target.value) } : i)))} aria-label="Quantity" />
            <button type="button" onClick={() => setItems(items.filter((i) => i.variant_id !== c.variant_id))} className="grid h-9 w-9 place-items-center rounded-full hover:bg-soft" aria-label="Remove component">
              <Icon name="close" size={16} />
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="p-4 text-[13px] text-muted">No components yet.</li>}
      </ul>
      <label className="label mt-6" htmlFor="comp-search">Add a component variant</label>
      <input id="comp-search" className="field" placeholder="Search by product name or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="mt-2 max-h-64 overflow-y-auto">
        {results?.filter((r) => !items.some((i) => i.variant_id === r.id)).map((r) => (
          <li key={r.id}>
            <button type="button" className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] hover:bg-soft" onClick={() => setItems([...items, { variant_id: r.id, sku: r.sku, name: r.name, label: r.label, stock: r.stock, price: r.price, quantity: 1 }])}>
              <span><span className="font-semibold">{r.name}</span> <span className="text-muted">· {r.label}</span></span>
              <span className="text-muted">{r.sku}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

function VariantGenerator({ product, models, onDone, flash }: { product: AdminProduct; models: DeviceModel[]; onDone: () => void; flash: ReturnType<typeof useFlash>['show'] }) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<number[]>([])
  const [colors, setColors] = useState([{ name: 'Charcoal', hex: '#17181C' }])
  const [price, setPrice] = useState('45.00')
  const [stock, setStock] = useState('10')
  const [prefix, setPrefix] = useState('')
  const [busy, setBusy] = useState(false)
  const modelSpecific = product.type !== 'power_bank'
  useEffect(() => setPrefix(`NR-${product.slug.split('-').map((w) => w[0]).join('').toUpperCase().slice(0, 4)}`), [product.slug])

  const code = (m?: DeviceModel) => (m ? m.short_name.replace(/\s*Pro Max/, 'PM').replace(/\s*Pro/, 'P').replace(/\s+/g, '') : '')
  const combos = (modelSpecific ? (picked.length ? picked : []) : [null]).flatMap((mid) => colors.filter((c) => c.name.trim()).map((c) => ({ mid, c })))

  const run = async () => {
    setBusy(true)
    let ok = 0
    const failed: string[] = []
    for (const { mid, c } of combos) {
      const m = models.find((x) => x.id === mid)
      const sku = [prefix, code(m), c.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()].filter(Boolean).join('-')
      try {
        await api(`/admin/products/${product.id}/variants`, { method: 'POST', body: { device_model_id: mid, color_name: c.name, color_hex: c.hex, sku, price, stock: Number(stock), is_active: true } })
        ok++
      } catch (e) {
        failed.push(`${sku}: ${messageOf(e)}`)
      }
    }
    setBusy(false)
    flash(failed.length ? 'error' : 'ok', failed.length ? `${ok} created, ${failed.length} skipped (${failed[0]})` : `${ok} variants created`)
    onDone()
    if (!failed.length) setOpen(false)
  }

  return (
    <>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>
        <Icon name="plus" size={16} /> Add variants
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Add variants" footer={<SaveButton busy={busy} disabled={!combos.length} onClick={run} className="w-full">Create {combos.length} variant{combos.length === 1 ? '' : 's'}</SaveButton>}>
        <div className="space-y-5">
          {modelSpecific && (
            <div>
              <p className="label">iPhone models</p>
              <div className="flex flex-wrap gap-2">
                {models.map((m) => (
                  <button key={m.id} type="button" className="chip" aria-pressed={picked.includes(m.id)} onClick={() => setPicked(picked.includes(m.id) ? picked.filter((i) => i !== m.id) : [...picked, m.id])}>
                    {m.short_name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="label">Colours</p>
            <div className="space-y-2">
              {colors.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input type="color" value={c.hex} onChange={(e) => setColors(colors.map((x, j) => (j === i ? { ...x, hex: e.target.value.toUpperCase() } : x)))} className="h-12 w-12 rounded-lg border border-line bg-white p-1" aria-label="Colour" />
                  <input className="field" value={c.name} onChange={(e) => setColors(colors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label="Colour name" />
                  <button type="button" className="grid h-12 w-12 shrink-0 place-items-center rounded-full hover:bg-soft" onClick={() => setColors(colors.filter((_, j) => j !== i))} aria-label="Remove colour"><Icon name="close" size={16} /></button>
                </div>
              ))}
              <button type="button" className="text-[13px] underline underline-offset-4" onClick={() => setColors([...colors, { name: '', hex: '#EFE8DC' }])}>+ Add colour</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Price (USD)" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
            <Input label={product.type === 'bundle' ? 'Stock (n/a)' : 'Initial stock'} value={stock} onChange={(e) => setStock(e.target.value)} type="number" min={0} disabled={product.type === 'bundle'} />
            <Input label="SKU prefix" value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} />
          </div>
          <p className="text-[12px] text-muted">Duplicate model/colour combinations and SKUs are rejected by the server.{product.type === 'bundle' && ' After creating set variants, assign their components.'}</p>
        </div>
      </Sheet>
    </>
  )
}

// ------------------------------------------------------------------- media

function MediaManager({ product, onChange, flash }: { product: AdminProduct; onChange: () => void; flash: ReturnType<typeof useFlash>['show'] }) {
  const [files, setFiles] = useState<File[]>([])
  const [color, setColor] = useState('')
  const [busy, setBusy] = useState(false)
  const previews = files.map((f) => URL.createObjectURL(f))
  useEffect(() => () => previews.forEach(URL.revokeObjectURL))
  const colors = [...new Set(product.variants.map((v) => v.color_name))]

  const upload = async () => {
    setBusy(true)
    const body = new FormData()
    files.forEach((f) => body.append('images[]', f))
    if (color) body.append('color_name', color)
    try {
      await api(`/admin/products/${product.id}/media`, { method: 'POST', body })
      setFiles([])
      flash('ok', 'Images uploaded')
      onChange()
    } catch (e) {
      flash('error', messageOf(e))
    } finally {
      setBusy(false)
    }
  }
  const update = async (m: AdminMedia, patch: Partial<AdminMedia>) => {
    await api(`/admin/media/${m.id}`, { method: 'PUT', body: { alt: m.alt, color_name: m.color_name, ...patch } }).catch((e) => flash('error', messageOf(e)))
    onChange()
  }
  const move = async (index: number, dir: -1 | 1) => {
    const ids = product.media.map((m) => m.id)
    const j = index + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[index], ids[j]] = [ids[j], ids[index]]
    await api(`/admin/products/${product.id}/media/order`, { method: 'PUT', body: { ids } })
    onChange()
  }
  const remove = async (m: AdminMedia) => {
    if (!confirm('Remove this image?')) return
    await api(`/admin/media/${m.id}`, { method: 'DELETE' })
    onChange()
  }

  return (
    <Panel title={`Media (${product.media.length})`}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {product.media.map((m, i) => (
          <figure key={m.id} className="group relative overflow-hidden rounded-xl border border-line bg-soft">
            {m.type === 'image' ? <img src={m.url} alt={m.alt ?? ''} className="aspect-[4/5] w-full object-cover" loading="lazy" /> : <div className="grid aspect-[4/5] place-items-center p-3 text-center text-[12px]">Video link<br />{m.url}</div>}
            {m.is_primary && <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-ivory">Primary</span>}
            <figcaption className="space-y-1.5 border-t border-line bg-surface p-2">
              <select className="field h-8 min-h-0 px-2 py-0 text-[12px]" value={m.color_name ?? ''} onChange={(e) => update(m, { color_name: e.target.value || null })} aria-label="Show for colour">
                <option value="">All colours</option>
                {colors.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input className="field h-8 min-h-0 px-2 py-0 text-[12px]" defaultValue={m.alt ?? ''} placeholder="Alt text" onBlur={(e) => e.target.value !== (m.alt ?? '') && update(m, { alt: e.target.value })} aria-label="Alt text" />
              <div className="flex items-center justify-between">
                <div className="flex">
                  <button type="button" className="grid h-8 w-8 place-items-center rounded-full hover:bg-soft disabled:opacity-30" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier"><Icon name="arrowLeft" size={14} /></button>
                  <button type="button" className="grid h-8 w-8 place-items-center rounded-full hover:bg-soft disabled:opacity-30" onClick={() => move(i, 1)} disabled={i === product.media.length - 1} aria-label="Move later"><Icon name="arrowRight" size={14} /></button>
                </div>
                {!m.is_primary && <button type="button" className="text-[11px] underline" onClick={() => update(m, { is_primary: true })}>Set primary</button>}
                <button type="button" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-soft hover:text-danger" onClick={() => remove(m)} aria-label="Remove image"><Icon name="trash" size={14} /></button>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-line-strong bg-ivory p-4">
        <label className="flex cursor-pointer flex-col items-center gap-2 py-4 text-center text-[14px]">
          <Icon name="upload" size={22} />
          <span className="font-semibold">Upload images</span>
          <span className="text-[12px] text-muted">JPG, PNG or WebP · up to 8 MB · 1200×1500 px (4:5) recommended</span>
          <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setFiles([...(e.target.files ?? [])])} data-testid="media-input" />
        </label>
        {files.length > 0 && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => <img key={i} src={src} alt="" className="h-20 w-16 rounded-md object-cover" />)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select className="field h-10 min-h-0 w-auto py-0 text-[13px]" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Assign to colour">
                <option value="">All colours</option>
                {colors.map((c) => <option key={c}>{c}</option>)}
              </select>
              <SaveButton busy={busy} onClick={upload}>Upload {files.length} image{files.length > 1 ? 's' : ''}</SaveButton>
              <button type="button" className="text-[13px] underline" onClick={() => setFiles([])}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}

// -------------------------------------------------------------------- page

function MatchingPicker({ value, onChange, selfId }: { value: number[]; onChange: (ids: number[]) => void; selfId?: number }) {
  const [q, setQ] = useState('')
  const { data } = useQuery({ queryKey: ['admin', 'products', { q, all: 1 }], queryFn: () => api<{ data: { id: number; name: string; type: string }[] }>(`/admin/products?q=${encodeURIComponent(q)}`) })
  const { data: selected } = useQuery({
    queryKey: ['admin', 'products-selected', value],
    queryFn: () => Promise.all(value.map((id) => api<{ id: number; name: string; type: string }>(`/admin/products/${id}`))),
    enabled: value.length > 0,
  })
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {(selected ?? []).filter((p) => value.includes(p.id)).map((p) => (
          <span key={p.id} className="chip is-active gap-2">
            {p.name}
            <button type="button" onClick={() => onChange(value.filter((v) => v !== p.id))} aria-label={`Remove ${p.name}`}><Icon name="close" size={14} /></button>
          </span>
        ))}
        {value.length === 0 && <p className="text-[13px] text-muted">No matching products linked.</p>}
      </div>
      <input className="field h-10 min-h-0" placeholder="Search products to link…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products to link" />
      <ul className="mt-2 max-h-48 overflow-y-auto">
        {data?.data.filter((p) => p.id !== selfId && !value.includes(p.id)).slice(0, 8).map((p) => (
          <li key={p.id}>
            <button type="button" className="flex w-full justify-between rounded-lg px-3 py-2 text-left text-[13px] hover:bg-soft" onClick={() => onChange([...value, p.id])}>
              {p.name} <span className="text-muted">{p.type.replace('_', ' ')}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ProductEditor() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const qc = useQueryClient()
  const flash = useFlash()
  const { models, collections } = useLookups()
  const { data: product, refetch, isLoading } = useQuery({ queryKey: ['admin', 'product', id], queryFn: () => api<AdminProduct>(`/admin/products/${id}`), enabled: !isNew })
  const [form, setForm] = useState<FormState>(blank)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [specRows, setSpecRows] = useState<[string, string][]>([])

  useEffect(() => {
    if (!product) return
    const next = Object.fromEntries(Object.keys(blank).map((k) => [k, (product as unknown as Record<string, unknown>)[k] ?? (blank as Record<string, unknown>)[k]])) as FormState
    setForm(next)
    setSpecRows(Object.entries(product.specs ?? {}))
  }, [product])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))
  const refresh = () => {
    refetch()
    qc.invalidateQueries({ queryKey: ['admin', 'products'] })
  }

  const save = async (e?: FormEvent) => {
    e?.preventDefault()
    setBusy(true)
    setErrors({})
    const body = { ...form, specs: Object.fromEntries(specRows.filter(([k, v]) => k.trim() && v.trim())), video_url: form.video_url || null }
    try {
      const saved = await api<AdminProduct>(isNew ? '/admin/products' : `/admin/products/${id}`, { method: isNew ? 'POST' : 'PUT', body })
      flash.show('ok', isNew ? 'Product created — now add variants and images' : 'Product saved')
      qc.invalidateQueries({ queryKey: ['admin', 'products'] })
      qc.invalidateQueries({ queryKey: ['product', saved.slug] })
      if (isNew) navigate(`/admin/products/${saved.id}`, { replace: true })
      else refetch()
    } catch (err) {
      setErrors(errorsOf(err))
      flash.show('error', messageOf(err))
    } finally {
      setBusy(false)
    }
  }
  const duplicate = async () => {
    const copy = await api<AdminProduct>(`/admin/products/${id}/duplicate`, { method: 'POST' })
    flash.show('ok', 'Duplicated as draft')
    navigate(`/admin/products/${copy.id}`)
  }
  const destroy = async () => {
    if (!confirm('Remove this product from the store? It will be archived and hidden; past orders are unaffected.')) return
    await api(`/admin/products/${id}`, { method: 'DELETE' })
    qc.invalidateQueries({ queryKey: ['admin', 'products'] })
    navigate('/admin/products')
  }

  if (!isNew && (isLoading || !product)) return <Skeleton className="h-96" />

  return (
    <>
      {flash.node}
      <Link to="/admin/products" className="mb-4 inline-flex items-center gap-2 text-[13px] text-muted hover:text-ink"><Icon name="arrowLeft" size={16} /> Products</Link>
      <PageHeader
        title={isNew ? 'New product' : product!.name}
        subtitle={isNew ? 'Start with the essentials — variants and images come next.' : undefined}
        actions={
          !isNew && (
            <>
              <Badge value={product!.status} />
              {product!.status === 'published' && <a href={product!.storefront_url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><Icon name="eye" size={16} /> View</a>}
              <button type="button" className="btn btn-outline btn-sm" onClick={duplicate}>Duplicate</button>
              <button type="button" className="btn btn-outline btn-sm text-danger" onClick={destroy}>Delete</button>
            </>
          )
        }
      />

      <form onSubmit={save} className="grid gap-4 xl:grid-cols-3" noValidate>
        <div className="space-y-4 xl:col-span-2">
          <Panel title="Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Product name" name="name" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} required className="sm:col-span-2" />
              <Input label="URL slug" name="slug" value={form.slug} onChange={(e) => set('slug', e.target.value)} error={errors.slug} hint="Leave blank to generate from the name." />
              <Input label="Material" name="material" value={form.material ?? ''} onChange={(e) => set('material', e.target.value)} error={errors.material} />
              <TextArea label="Short description" name="short_description" className="sm:col-span-2" rows={2} value={form.short_description ?? ''} onChange={(e) => set('short_description', e.target.value)} error={errors.short_description} />
              <TextArea label="Description" name="description" className="sm:col-span-2" rows={6} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} error={errors.description} />
              <TextArea label="Care instructions" name="care_instructions" className="sm:col-span-2" rows={2} value={form.care_instructions ?? ''} onChange={(e) => set('care_instructions', e.target.value)} />
              <Input label="Product video URL (optional)" name="video_url" className="sm:col-span-2" placeholder="https://…" value={form.video_url ?? ''} onChange={(e) => set('video_url', e.target.value)} error={errors.video_url} />
            </div>
          </Panel>

          <Panel title="Specifications">
            <div className="space-y-2">
              {specRows.map(([k, v], i) => (
                <div key={i} className="flex gap-2">
                  <input className="field h-10 min-h-0 w-1/3" placeholder="Label (e.g. Capacity)" value={k} onChange={(e) => setSpecRows(specRows.map((r, j) => (j === i ? [e.target.value, r[1]] : r)))} aria-label="Specification label" />
                  <input className="field h-10 min-h-0" placeholder="Value" value={v} onChange={(e) => setSpecRows(specRows.map((r, j) => (j === i ? [r[0], e.target.value] : r)))} aria-label="Specification value" />
                  <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-soft" onClick={() => setSpecRows(specRows.filter((_, j) => j !== i))} aria-label="Remove row"><Icon name="close" size={16} /></button>
                </div>
              ))}
              <button type="button" className="text-[13px] underline underline-offset-4" onClick={() => setSpecRows([...specRows, ['', '']])}>+ Add specification</button>
            </div>
          </Panel>

          {!isNew && product && (
            <Panel
              title={`Variants (${product.variants.length})`}
              padded={false}
              actions={<VariantGenerator product={product} models={models} onDone={refresh} flash={flash.show} />}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-[13px]">
                  <thead className="text-left text-[11px] uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-3 py-3 font-semibold">Device model</th>
                      <th className="px-3 py-3 font-semibold">Colour</th>
                      <th className="px-3 py-3 font-semibold">SKU</th>
                      <th className="px-3 py-3 font-semibold">Price</th>
                      <th className="px-3 py-3 font-semibold">Compare at</th>
                      <th className="px-3 py-3 font-semibold">{product.type === 'bundle' ? 'Components' : 'Stock'}</th>
                      <th className="px-3 py-3 font-semibold">Active</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {product.variants.map((v) => <VariantRow key={v.id} v={v} product={product} models={models} onSaved={refresh} flash={flash.show} />)}
                    {product.variants.length === 0 && (
                      <tr><td colSpan={8} className="px-5 py-8 text-center text-muted">No variants yet. Add at least one to make the product purchasable.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {product.variants.length > 0 && <p className="border-t border-line px-5 py-3 text-[12px] text-muted">Prices in USD. Stock edits are logged as inventory adjustments. Range: {money(Math.min(...product.variants.map((v) => Number(v.price))))} – {money(Math.max(...product.variants.map((v) => Number(v.price))))}</p>}
            </Panel>
          )}

          {!isNew && product && <MediaManager product={product} onChange={refresh} flash={flash.show} />}
        </div>

        <div className="space-y-4">
          <Panel title="Publishing">
            <div className="space-y-4">
              <div>
                <label htmlFor="status" className="label">Status</label>
                <select id="status" className="field" value={form.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="draft">Draft — hidden</option>
                  <option value="published">Published — visible in store</option>
                  <option value="archived">Archived — hidden</option>
                </select>
              </div>
              <div>
                <label htmlFor="type" className="label">Product type</label>
                <select id="type" className="field" value={form.type} onChange={(e) => set('type', e.target.value)} disabled={!isNew && (product?.variants.length ?? 0) > 0}>
                  <option value="case">Phone case</option>
                  <option value="power_bank">Power bank</option>
                  <option value="bundle">Matching set (bundle)</option>
                </select>
              </div>
              <SaveButton busy={busy} type="submit" className="w-full">{isNew ? 'Create product' : 'Save changes'}</SaveButton>
            </div>
          </Panel>

          <Panel title="Collections">
            <div className="flex flex-wrap gap-2">
              {collections.map((c) => (
                <button key={c.id} type="button" className="chip" aria-pressed={form.collection_ids.includes(c.id)} onClick={() => set('collection_ids', form.collection_ids.includes(c.id) ? form.collection_ids.filter((i) => i !== c.id) : [...form.collection_ids, c.id])}>
                  {c.name}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Merchandising">
            <div className="divide-y divide-line">
              <Toggle label="Featured" checked={form.is_featured} onChange={(v) => set('is_featured', v)} />
              <Toggle label="Best seller label" description="Sample merchandising label" checked={form.is_bestseller} onChange={(v) => set('is_bestseller', v)} />
              <Toggle label="New arrival" checked={form.is_new_arrival} onChange={(v) => set('is_new_arrival', v)} />
              <Toggle label="Limited edition" checked={form.is_limited_edition} onChange={(v) => set('is_limited_edition', v)} />
              <Toggle label="Handmade" checked={form.is_handmade} onChange={(v) => set('is_handmade', v)} />
              <Toggle label="Customisable" description="Shows personalisation fields" checked={form.is_customizable} onChange={(v) => set('is_customizable', v)} />
            </div>
            {form.is_handmade && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Input label="Production min (days)" type="number" min={1} value={form.production_days_min ?? ''} onChange={(e) => set('production_days_min', e.target.value ? Number(e.target.value) : null)} />
                <Input label="Production max (days)" type="number" min={1} value={form.production_days_max ?? ''} onChange={(e) => set('production_days_max', e.target.value ? Number(e.target.value) : null)} error={errors.production_days_max} />
              </div>
            )}
          </Panel>

          <Panel title="Matching products">
            <MatchingPicker value={form.matching_ids} onChange={(ids) => set('matching_ids', ids)} selfId={product?.id} />
          </Panel>

          <Panel title="SEO">
            <div className="space-y-4">
              <Input label="SEO title" value={form.seo_title ?? ''} onChange={(e) => set('seo_title', e.target.value)} />
              <TextArea label="Meta description" rows={3} value={form.seo_description ?? ''} onChange={(e) => set('seo_description', e.target.value)} />
            </div>
          </Panel>
        </div>
      </form>
    </>
  )
}
