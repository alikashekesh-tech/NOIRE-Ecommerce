import { useEffect, useState, type FormEvent } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router'
import { CartDrawer } from '../components/CartDrawer'
import { Icon } from '../components/Icon'
import { Newsletter } from '../components/Newsletter'
import { DemoBadge, Logo, Sheet, Toast } from '../components/ui'
import { WhatsAppFab } from '../components/WhatsApp'
import { cx } from '../lib/format'
import { useSettings } from '../services/queries'
import { modelStore, ui, useCartCount, useWishlist } from '../store/shop'

const NAV = [
  { to: '/shop', label: 'Shop' },
  { to: '/shop?type=case', label: 'Phone Cases' },
  { to: '/collections/handmade-creations', label: 'Handmade' },
  { to: '/collections/matching-sets', label: 'Matching Sets' },
  { to: '/custom', label: 'Create Your Own' },
]

function AnnouncementBar() {
  const { data } = useSettings()
  const a = data?.announcement
  if (!a?.enabled || !a.text) return null
  return (
    <div className="bg-ink text-ivory">
      <p className="container-wide flex min-h-8 items-center justify-center gap-3 py-1.5 text-center text-[11px] font-medium uppercase tracking-[0.22em]">
        <span>{a.text}</span>
        {a.link_label && a.link_url && (
          <Link to={a.link_url} className="hidden underline underline-offset-4 sm:inline">
            {a.link_label}
          </Link>
        )}
      </p>
    </div>
  )
}

function ShopMenu() {
  const { data } = useSettings()
  const navigate = useNavigate()
  return (
    <div className="invisible absolute left-0 right-0 top-full translate-y-1 border-y border-line bg-ivory opacity-0 shadow-soft transition duration-300 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
      <div className="container-wide grid grid-cols-12 gap-8 py-10">
        <div className="col-span-4">
          <p className="eyebrow mb-4 text-muted">Shop by iPhone</p>
          <ul className="grid grid-cols-2 gap-2">
            {data?.device_models.map((m) => (
              <li key={m.slug}>
                <button
                  type="button"
                  className="link-underline text-left text-[15px]"
                  onClick={() => {
                    modelStore.set(m.slug)
                    navigate(`/shop?model=${m.slug}`)
                  }}
                >
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="col-span-3">
          <p className="eyebrow mb-4 text-muted">Discover</p>
          <ul className="space-y-2 text-[15px]">
            <li><Link className="link-underline" to="/shop?new=1&sort=newest">New Arrivals</Link></li>
            <li><Link className="link-underline" to="/shop?bestseller=1">Best Sellers</Link></li>
            <li><Link className="link-underline" to="/shop?limited=1">Limited Editions</Link></li>
            <li><Link className="link-underline" to="/shop?type=power_bank">Power Banks</Link></li>
            <li><Link className="link-underline" to="/custom">Create Your Own</Link></li>
          </ul>
        </div>
        <div className="col-span-5 grid grid-cols-3 gap-4">
          {data?.collections.map((c) => (
            <Link key={c.slug} to={`/collections/${c.slug}`} className="group/c block">
              <div className="aspect-[4/5] overflow-hidden rounded-lg bg-soft">{c.image && <img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover/c:scale-[1.015]" />}</div>
              <p className="mt-2 text-[13px] font-semibold">{c.name}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function SearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onClose()
    navigate(`/shop?q=${encodeURIComponent(q.trim())}`)
  }
  return (
    <Sheet open={open} onClose={onClose} title="Search" side="center">
      <form onSubmit={submit} role="search">
        <label htmlFor="site-search" className="sr-only">
          Search products
        </label>
        <div className="flex gap-2">
          <input id="site-search" className="field" placeholder="Search cases, colours, materials…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
          <button className="btn btn-primary px-5" aria-label="Search">
            <Icon name="search" size={18} />
          </button>
        </div>
        <p className="mt-4 text-[13px] text-muted">Popular: </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {['Ivory', 'Pearl', 'Quilted', 'Monogram', 'Power bank'].map((t) => (
            <button
              key={t}
              type="button"
              className="chip"
              onClick={() => {
                onClose()
                navigate(`/shop?q=${encodeURIComponent(t)}`)
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </form>
    </Sheet>
  )
}

function Header() {
  const count = useCartCount()
  const saved = useWishlist().length
  const [menu, setMenu] = useState(false)
  const [search, setSearch] = useState(false)
  const { data } = useSettings()
  const location = useLocation()
  useEffect(() => setMenu(false), [location.pathname, location.search])

  // Query-aware active state: "/shop" and "/shop?type=case" must not both highlight.
  const isActive = (to: string) => {
    const [path, query] = to.split('?')
    if (location.pathname !== path) return false
    const current = new URLSearchParams(location.search)
    if (!query) return !current.has('type')
    return [...new URLSearchParams(query)].every(([k, v]) => current.get(k) === v)
  }
  const iconBtn = 'relative grid h-11 w-11 place-items-center rounded-full transition hover:bg-soft'
  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-ivory/92 backdrop-blur-md">
      <div className="container-wide relative flex h-16 items-center justify-between lg:h-20">
        <div className="flex h-full flex-1 items-center">
          <button type="button" className={cx(iconBtn, '-ml-2 lg:hidden')} onClick={() => setMenu(true)} aria-label="Open menu" aria-expanded={menu}>
            <Icon name="menu" />
          </button>
          <nav aria-label="Main" className="hidden h-full lg:block">
            <ul className="flex h-full items-center gap-7 text-[13px] font-medium tracking-wide">
              {NAV.map((n, i) => (
                // The li fills the header height (so the mega menu stays open while moving the pointer);
                // the link itself stays text-sized so hover/active/focus states hug the label.
                <li key={n.to} className={cx('flex h-full items-center', i === 0 && 'group static')}>
                  <Link to={n.to} className="nav-link" aria-current={isActive(n.to) ? 'page' : undefined} aria-haspopup={i === 0 ? 'true' : undefined}>
                    {n.label}
                  </Link>
                  {i === 0 && <ShopMenu />}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <Link to="/" aria-label="NOIRÉ home" className="shrink-0 px-2">
          <Logo className="w-[76px] lg:w-[92px]" />
        </Link>

        <div className="flex flex-1 items-center justify-end gap-0.5">
          <button type="button" className={iconBtn} onClick={() => setSearch(true)} aria-label="Search">
            <Icon name="search" />
          </button>
          <Link to="/admin" className={cx(iconBtn, 'hidden sm:grid')} aria-label="Account and admin sign-in">
            <Icon name="user" />
          </Link>
          <Link to="/wishlist" className={cx(iconBtn, 'hidden sm:grid')} aria-label={`Wishlist, ${saved} saved`}>
            <Icon name="heart" />
            {saved > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-ink" aria-hidden="true" />}
          </Link>
          <button type="button" className={cx(iconBtn, '-mr-2')} onClick={ui.openCart} aria-label={`Bag, ${count} items`}>
            <Icon name="bag" />
            {count > 0 && <span className="absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[10px] font-bold text-ivory">{count}</span>}
          </button>
        </div>
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Menu" side="left" widthClass="w-[86%] max-w-sm">
        <nav aria-label="Mobile">
          <ul className="space-y-1">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="flex items-center justify-between py-3 font-display text-[26px]">
                  {n.label}
                  <Icon name="chevronRight" size={18} className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="eyebrow mb-3 mt-8 text-muted">Shop by iPhone</p>
          <div className="flex flex-wrap gap-2">
            {data?.device_models.map((m) => (
              <Link key={m.slug} to={`/shop?model=${m.slug}`} onClick={() => modelStore.set(m.slug)} className="chip">
                {m.short_name}
              </Link>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-2 border-t border-line pt-6 text-[14px]">
            <Link to="/wishlist" className="flex items-center gap-2 py-2">
              <Icon name="heart" size={18} /> Wishlist ({saved})
            </Link>
            <Link to="/admin" className="flex items-center gap-2 py-2">
              <Icon name="user" size={18} /> Admin sign-in
            </Link>
          </div>
        </nav>
      </Sheet>
      <SearchSheet open={search} onClose={() => setSearch(false)} />
    </header>
  )
}

function Footer() {
  const { data } = useSettings()
  const social = Object.entries(data?.social ?? {})
  return (
    <footer className="mt-24 bg-ink text-ivory md:mt-32">
      <div className="container-wide grid grid-cols-1 gap-12 py-16 md:grid-cols-12 md:py-20">
        <div className="md:col-span-4">
          <Logo tone="light" className="w-[120px]" />
          <p className="mt-6 max-w-xs text-[14px] leading-relaxed text-ivory/70">{data?.store.description ?? 'Fashion-forward iPhone cases, handmade creations and perfectly matched accessories.'}</p>
          <div className="mt-6 flex gap-2">
            {social.map(([name, url]) =>
              url ? (
                <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="grid h-10 w-10 place-items-center rounded-full border border-ivory/25 hover:bg-ivory hover:text-ink" aria-label={name}>
                  <Icon name={name as 'instagram'} size={18} />
                </a>
              ) : (
                <span key={name} className="grid h-10 w-10 place-items-center rounded-full border border-ivory/15 text-ivory/35" title={`${name} link pending`} aria-label={`${name} (link pending)`}>
                  <Icon name={name as 'instagram'} size={18} />
                </span>
              ),
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 md:col-span-4">
          <div>
            <p className="eyebrow mb-4 text-ivory/50">Shop</p>
            <ul className="space-y-2.5 text-[14px] text-ivory/80">
              <li><Link className="link-underline" to="/shop">All products</Link></li>
              <li><Link className="link-underline" to="/collections/signature-cases">Signature Cases</Link></li>
              <li><Link className="link-underline" to="/collections/handmade-creations">Handmade</Link></li>
              <li><Link className="link-underline" to="/collections/matching-sets">Matching Sets</Link></li>
              <li><Link className="link-underline" to="/custom">Create Your Own</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-4 text-ivory/50">Support</p>
            <ul className="space-y-2.5 text-[14px] text-ivory/80">
              {(data?.pages ?? []).map((p) => (
                <li key={p.slug}>
                  <Link className="link-underline" to={`/pages/${p.slug}`}>
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="md:col-span-4">
          <p className="eyebrow mb-4 text-ivory/50">Newsletter</p>
          <p className="mb-4 font-display text-2xl">New collections, first.</p>
          <Newsletter tone="dark" source="footer" />
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <div className="container-wide flex flex-col gap-3 py-6 text-[12px] text-ivory/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} NOIRÉ. Client demonstration — no real orders or payments are processed.</p>
          <p>Product imagery shown is demonstration artwork.</p>
        </div>
      </div>
    </footer>
  )
}

export function StoreLayout() {
  const { data } = useSettings()
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory">
        Skip to content
      </a>
      <AnnouncementBar />
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppFab />
      <Toast />
      {data?.demo_mode && (
        <div className="pointer-events-none fixed bottom-4 left-4 z-30 hidden lg:block">
          <DemoBadge label={data.store.demo_badge || 'Demo Store'} />
        </div>
      )}
      <ScrollRestoration />
    </div>
  )
}
