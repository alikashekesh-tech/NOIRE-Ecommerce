import { useQuery, useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useState, type FormEvent } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router'
import { Icon, type IconName } from '../components/Icon'
import { DemoBadge, Logo, Seo, Spinner } from '../components/ui'
import { cx } from '../lib/format'
import { api, ApiError } from '../services/api'

export interface AdminUser {
  id: number
  name: string
  email: string
  role: string
  demo_mode: boolean
  allow_web_reset: boolean
}

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Products = lazy(() => import('./pages/Products'))
const ProductEditor = lazy(() => import('./pages/ProductEditor'))
const Inventory = lazy(() => import('./pages/Inventory'))
const Orders = lazy(() => import('./pages/Orders'))
const OrderDetail = lazy(() => import('./pages/OrderDetail'))
const Customers = lazy(() => import('./pages/Customers'))
const Requests = lazy(() => import('./pages/Requests'))
const Homepage = lazy(() => import('./pages/Homepage'))
const Settings = lazy(() => import('./pages/Settings'))

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/admin', label: 'Dashboard', icon: 'home' },
  { to: '/admin/products', label: 'Products', icon: 'grid' },
  { to: '/admin/inventory', label: 'Inventory', icon: 'box' },
  { to: '/admin/orders', label: 'Orders', icon: 'receipt' },
  { to: '/admin/customers', label: 'Customers', icon: 'users' },
  { to: '/admin/requests', label: 'Custom requests', icon: 'palette' },
  { to: '/admin/homepage', label: 'Homepage', icon: 'layers' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
]

function Login() {
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const user = await api<AdminUser>('/admin/login', { method: 'POST', body: { email, password } })
      qc.setQueryData(['admin-me'], user)
    } catch (err) {
      setError(err instanceof ApiError ? (err.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : (err.field('email') ?? err.message)) : 'Unable to sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <Seo title="Admin sign in" />
      <div className="hidden flex-col justify-between bg-ink p-12 text-ivory lg:flex">
        <Logo tone="light" className="w-[132px] self-start" />
        <div>
          <p className="font-display text-5xl leading-tight">The NOIRÉ atelier, behind the scenes.</p>
          <p className="mt-4 max-w-sm text-ivory/60">Manage products, stock, orders and custom requests for the demonstration store.</p>
        </div>
        <div className="self-start"><DemoBadge label="Demo administration" /></div>
      </div>
      <div className="flex items-center justify-center bg-ivory px-6 py-16">
        <form onSubmit={submit} className="w-full max-w-sm" noValidate>
          <Logo className="mb-10 w-[104px] lg:hidden" />
          <h1 className="font-display text-4xl">Sign in</h1>
          <p className="mt-2 text-[14px] text-muted">Administrator access only.</p>
          <div className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input id="email" type="email" autoComplete="username" className="field" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input id="password" type="password" autoComplete="current-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && (
              <p role="alert" className="text-[13px] text-danger">
                {error}
              </p>
            )}
            <button className="btn btn-primary w-full" disabled={busy}>
              {busy ? <Spinner /> : 'Sign in'}
            </button>
          </div>
          <Link to="/" className="mt-8 inline-flex items-center gap-2 text-[13px] text-muted hover:text-ink">
            <Icon name="arrowLeft" size={16} /> Back to store
          </Link>
        </form>
      </div>
    </div>
  )
}

function Shell({ user }: { user: AdminUser }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const logout = async () => {
    await api('/admin/logout', { method: 'POST' }).catch(() => null)
    qc.setQueryData(['admin-me'], null)
  }

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <Link to="/admin" className="px-6 pb-6 pt-7">
        <Logo tone="light" className="w-[88px]" />
      </Link>
      <ul className="flex-1 space-y-0.5 px-3">
        {NAV.map((n) => (
          <li key={n.to}>
            <NavLink to={n.to} end={n.to === '/admin'} onClick={() => setOpen(false)} className={({ isActive }) => cx('flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition', isActive ? 'bg-ivory text-ink' : 'text-ivory/70 hover:bg-ivory/10 hover:text-ivory')}>
              <Icon name={n.icon} size={18} />
              {n.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="space-y-3 border-t border-ivory/10 p-4">
        <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-ivory/70 hover:bg-ivory/10">
          <Icon name="external" size={16} /> View storefront
        </a>
        <div className="flex items-center justify-between gap-2 px-3">
          <div className="min-w-0 text-[12px]">
            <p className="truncate font-semibold text-ivory">{user.name}</p>
            <p className="truncate text-ivory/50">{user.email}</p>
          </div>
          <button type="button" onClick={logout} className="grid h-9 w-9 place-items-center rounded-full text-ivory/70 hover:bg-ivory/10" aria-label="Sign out">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </div>
    </nav>
  )

  return (
    <div className="min-h-dvh bg-[#F4F1EA] lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-dvh bg-ink lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-slide-in-left bg-ink">{sidebar}</aside>
        </div>
      )}
      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-[#F4F1EA]/90 px-4 backdrop-blur md:px-8">
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full hover:bg-soft lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Icon name="menu" />
          </button>
          <p className="hidden text-[13px] text-muted lg:block">{NAV.find((n) => n.to !== '/admin' && location.pathname.startsWith(n.to))?.label ?? 'Dashboard'}</p>
          {user.demo_mode && <DemoBadge label="Demo mode · data is fictional" />}
        </header>
        <main className="px-4 py-6 md:px-8 md:py-8">
          <Suspense fallback={<div className="grid min-h-[40vh] place-items-center"><Spinner /></div>}>
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="products/new" element={<ProductEditor />} />
              <Route path="products/:id" element={<ProductEditor />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:id" element={<OrderDetail />} />
              <Route path="customers" element={<Customers />} />
              <Route path="requests" element={<Requests />} />
              <Route path="homepage" element={<Homepage />} />
              <Route path="settings" element={<Settings user={user} />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export default function AdminApp() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-me'],
    queryFn: () => api<AdminUser>('/admin/me').catch((e) => (e instanceof ApiError && (e.status === 401 || e.status === 403) ? null : Promise.reject(e))),
    retry: false,
    staleTime: 5 * 60_000,
  })
  if (isLoading) return <div className="grid min-h-dvh place-items-center"><Spinner /></div>
  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      {user ? <Shell user={user} /> : <Login />}
    </>
  )
}
