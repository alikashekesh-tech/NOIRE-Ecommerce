import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Skeleton } from '../../components/ui'
import { api } from '../../services/api'
import { Input, messageOf, PageHeader, Panel, SaveButton, TextArea, Toggle, useFlash } from '../shared'

type Home = {
  announcement: { enabled: boolean; text: string; link_label?: string; link_url?: string }
  hero: Record<string, string>
  handmade_story: Record<string, string>
  complete_the_look: Record<string, string>
  sections: Record<string, boolean>
  featured_product_ids: number[]
}

const SECTION_LABELS: Record<string, string> = {
  models: 'Shop by iPhone model',
  collections: 'Shop by collection',
  bestsellers: 'Best sellers',
  complete_the_look: 'Complete the look',
  handmade_story: 'Handmade story',
  new_arrivals: 'New arrivals',
  newsletter: 'Newsletter',
}

function ImageField({ label, value, onChange, flash }: { label: string; value?: string; onChange: (url: string) => void; flash: ReturnType<typeof useFlash>['show'] }) {
  const [busy, setBusy] = useState(false)
  const upload = async (file: File) => {
    setBusy(true)
    const body = new FormData()
    body.append('image', file)
    try {
      const res = await api<{ url: string }>('/admin/settings/hero-image', { method: 'POST', body })
      onChange(res.url)
      flash('ok', 'Image uploaded — remember to save')
    } catch (e) {
      flash('error', messageOf(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex items-center gap-3">
        <div className="h-20 w-32 overflow-hidden rounded-lg border border-line bg-soft">{value && <img src={value} alt="" className="h-full w-full object-cover" />}</div>
        <label className="btn btn-outline btn-sm cursor-pointer">
          <Icon name="upload" size={16} /> {busy ? 'Uploading…' : 'Replace'}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      </div>
    </div>
  )
}

export default function Homepage() {
  const qc = useQueryClient()
  const flash = useFlash()
  const { data } = useQuery({ queryKey: ['admin', 'settings'], queryFn: () => api<Record<string, unknown>>('/admin/settings') })
  const { data: bundles } = useQuery({ queryKey: ['admin', 'products', { type: 'bundle' }], queryFn: () => api<{ data: { id: number; name: string; slug: string }[] }>('/admin/products?type=bundle&status=published') })
  const [home, setHome] = useState<Home | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (data?.homepage) setHome(structuredClone(data.homepage as Home))
  }, [data])

  if (!home) return <Skeleton className="h-96" />
  const patch = <K extends keyof Home>(k: K, v: Partial<Home[K]>) => setHome({ ...home, [k]: { ...(home[k] as object), ...v } })

  const save = async () => {
    setBusy(true)
    try {
      await api('/admin/settings/homepage', { method: 'PUT', body: home })
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['home'] })
      flash.show('ok', 'Homepage updated — live on the storefront')
    } catch (e) {
      flash.show('error', messageOf(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {flash.node}
      <PageHeader
        title="Homepage"
        subtitle="Edit campaign content. Changes are live as soon as you save."
        actions={
          <>
            <a href="/" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><Icon name="eye" size={16} /> Preview</a>
            <SaveButton busy={busy} onClick={save}>Save homepage</SaveButton>
          </>
        }
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Panel title="Announcement bar">
            <Toggle label="Show announcement bar" checked={home.announcement.enabled} onChange={(v) => patch('announcement', { enabled: v })} />
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <Input label="Text" name="announcement-text" className="sm:col-span-3" value={home.announcement.text} onChange={(e) => patch('announcement', { text: e.target.value })} maxLength={120} />
              <Input label="Link label (optional)" value={home.announcement.link_label ?? ''} onChange={(e) => patch('announcement', { link_label: e.target.value })} />
              <Input label="Link path" value={home.announcement.link_url ?? ''} onChange={(e) => patch('announcement', { link_url: e.target.value })} placeholder="/collections/…" className="sm:col-span-2" />
            </div>
          </Panel>

          <Panel title="Hero">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Eyebrow" value={home.hero.eyebrow ?? ''} onChange={(e) => patch('hero', { eyebrow: e.target.value })} />
              <Input label="Heading" value={home.hero.title ?? ''} onChange={(e) => patch('hero', { title: e.target.value })} />
              <TextArea label="Description" className="sm:col-span-2" rows={2} value={home.hero.description ?? ''} onChange={(e) => patch('hero', { description: e.target.value })} />
              <Input label="Primary button" value={home.hero.primary_label ?? ''} onChange={(e) => patch('hero', { primary_label: e.target.value })} />
              <Input label="Primary link" value={home.hero.primary_url ?? ''} onChange={(e) => patch('hero', { primary_url: e.target.value })} />
              <Input label="Secondary button" value={home.hero.secondary_label ?? ''} onChange={(e) => patch('hero', { secondary_label: e.target.value })} />
              <Input label="Secondary link" value={home.hero.secondary_url ?? ''} onChange={(e) => patch('hero', { secondary_url: e.target.value })} />
              <ImageField label="Desktop image (1920×1080+)" value={home.hero.image_desktop} onChange={(url) => patch('hero', { image_desktop: url })} flash={flash.show} />
              <ImageField label="Mobile image (900×1200)" value={home.hero.image_mobile} onChange={(url) => patch('hero', { image_mobile: url })} flash={flash.show} />
            </div>
          </Panel>

          <Panel title="Handmade story">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Eyebrow" value={home.handmade_story.eyebrow ?? ''} onChange={(e) => patch('handmade_story', { eyebrow: e.target.value })} />
              <Input label="Title" value={home.handmade_story.title ?? ''} onChange={(e) => patch('handmade_story', { title: e.target.value })} />
              <TextArea label="Story" className="sm:col-span-2" rows={4} value={home.handmade_story.body ?? ''} onChange={(e) => patch('handmade_story', { body: e.target.value })} />
              <Input label="Footnote" className="sm:col-span-2" value={home.handmade_story.note ?? ''} onChange={(e) => patch('handmade_story', { note: e.target.value })} />
              <ImageField label="Image" value={home.handmade_story.image} onChange={(url) => patch('handmade_story', { image: url })} flash={flash.show} />
            </div>
          </Panel>

          <Panel title="Complete the look">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Eyebrow" value={home.complete_the_look.eyebrow ?? ''} onChange={(e) => patch('complete_the_look', { eyebrow: e.target.value })} />
              <Input label="Title" value={home.complete_the_look.title ?? ''} onChange={(e) => patch('complete_the_look', { title: e.target.value })} />
              <TextArea label="Description" className="sm:col-span-2" rows={2} value={home.complete_the_look.description ?? ''} onChange={(e) => patch('complete_the_look', { description: e.target.value })} />
              <div className="sm:col-span-2">
                <label htmlFor="ctl-bundle" className="label">Featured matching set</label>
                <select id="ctl-bundle" className="field" value={home.complete_the_look.bundle_slug ?? ''} onChange={(e) => patch('complete_the_look', { bundle_slug: e.target.value })}>
                  {bundles?.data.map((b) => <option key={b.id} value={b.slug}>{b.name}</option>)}
                </select>
              </div>
            </div>
          </Panel>
        </div>
        <Panel title="Sections" className="self-start">
          <div className="divide-y divide-line">
            {Object.entries(SECTION_LABELS).map(([k, label]) => (
              <Toggle key={k} label={label} checked={home.sections[k] !== false} onChange={(v) => setHome({ ...home, sections: { ...home.sections, [k]: v } })} />
            ))}
          </div>
          <p className="mt-4 text-[12px] text-muted">Featured, best-seller and new-arrival lists follow the merchandising toggles on each product.</p>
        </Panel>
      </div>
    </>
  )
}
