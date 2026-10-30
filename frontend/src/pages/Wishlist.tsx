import { Link } from 'react-router'
import { ProductGrid } from '../components/ProductCard'
import { Seo } from '../components/ui'
import { useProductsByIds } from '../services/queries'
import { useWishlist } from '../store/shop'

export default function Wishlist() {
  const ids = useWishlist()
  const { data, isLoading } = useProductsByIds(ids)

  return (
    <div className="container-wide py-10 md:py-16">
      <Seo title="Wishlist" />
      <p className="eyebrow mb-3 text-muted">Saved for later</p>
      <h1 className="heading-section mb-3">Wishlist</h1>
      <p className="mb-10 text-[14px] text-muted">Saved on this device. Open a piece to choose your model and add it to your bag.</p>
      {ids.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong py-24 text-center">
          <p className="font-display text-3xl">Nothing saved yet</p>
          <p className="mt-3 text-muted">Tap the heart on any piece to keep it here.</p>
          <Link to="/shop" className="btn btn-primary mt-8">
            Discover the collection
          </Link>
        </div>
      ) : (
        <ProductGrid products={ids.length ? data : []} loading={isLoading} count={Math.min(ids.length, 8)} />
      )}
    </div>
  )
}
