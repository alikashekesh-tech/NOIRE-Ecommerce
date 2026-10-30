import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { CartItem, CollectionSummary, Facets, HomeContent, Paginated, ProductCard, ProductDetail, Quote, StoreSettings } from '../types'
import { api } from './api'

export const useSettings = () =>
  useQuery({ queryKey: ['settings'], queryFn: () => api<StoreSettings>('/storefront/settings'), staleTime: 60_000 })

export const useHome = () => useQuery({ queryKey: ['home'], queryFn: () => api<HomeContent>('/storefront/home'), staleTime: 30_000 })

export const useProducts = (search: string) =>
  useQuery({
    queryKey: ['products', search],
    queryFn: () => api<Paginated<ProductCard> & { facets: Facets | null }>(`/products?${search}`),
    placeholderData: keepPreviousData,
  })

export const useProduct = (slug: string | undefined) =>
  useQuery({ queryKey: ['product', slug], queryFn: () => api<ProductDetail>(`/products/${slug}`), enabled: !!slug })

export const useCollection = (slug: string | undefined) =>
  useQuery({ queryKey: ['collection', slug], queryFn: () => api<CollectionSummary & { seo_title?: string; seo_description?: string }>(`/collections/${slug}`), enabled: !!slug })

export const useProductsByIds = (ids: number[]) =>
  useQuery({
    queryKey: ['products-by-ids', ids],
    queryFn: () => api<Paginated<ProductCard>>(`/products?ids=${ids.join(',')}&per_page=60`).then((r) => ids.map((id) => r.data.find((p) => p.id === id)).filter(Boolean) as ProductCard[]),
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
  })

/** Server-side pricing of the local bag. Re-runs whenever the bag or shipping choice changes. */
export const useQuote = (items: CartItem[], shippingMethod?: string | null) =>
  useQuery({
    queryKey: ['quote', items, shippingMethod],
    queryFn: () =>
      api<Quote>('/cart/quote', {
        method: 'POST',
        body: { items: items.map(({ variant_id, quantity, customization }) => ({ variant_id, quantity, customization })), shipping_method: shippingMethod },
      }),
    enabled: items.length > 0,
    placeholderData: keepPreviousData,
  })
