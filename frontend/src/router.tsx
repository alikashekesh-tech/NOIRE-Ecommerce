import { lazy, Suspense, type ComponentType } from 'react'
import { createBrowserRouter } from 'react-router'
import { Spinner } from './components/ui'
import { StoreLayout } from './layouts/StoreLayout'
import Home from './pages/Home'

// Route-based code splitting: the home page ships in the main bundle, everything else on demand.
const page = (load: () => Promise<{ default: ComponentType }>) => {
  const Component = lazy(load)
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[50vh] place-items-center text-muted">
          <Spinner />
        </div>
      }
    >
      <Component />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    element: <StoreLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'shop', element: page(() => import('./pages/Shop')) },
      { path: 'collections/:slug', element: page(() => import('./pages/Shop')) },
      { path: 'products/:slug', element: page(() => import('./pages/Product')) },
      { path: 'cart', element: page(() => import('./pages/Cart')) },
      { path: 'wishlist', element: page(() => import('./pages/Wishlist')) },
      { path: 'checkout', element: page(() => import('./pages/Checkout')) },
      { path: 'order/:number', element: page(() => import('./pages/OrderConfirmation')) },
      { path: 'custom', element: page(() => import('./pages/CustomDesign')) },
      { path: 'pages/:slug', element: page(() => import('./pages/ContentPage')) },
      { path: '*', element: page(() => import('./pages/ContentPage').then((m) => ({ default: m.NotFound }))) },
    ],
  },
  {
    path: 'admin/*',
    element: page(() => import('./admin/AdminApp')),
  },
])
