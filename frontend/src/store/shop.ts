import { useSyncExternalStore } from 'react'
import type { CartItem, Customization } from '../types'
import { createPersistedStore } from './persisted'

const MAX_QTY = 10

// ---- Bag ------------------------------------------------------------------
export const cartStore = createPersistedStore<CartItem[]>('noire.bag.v1', [])

const customizationKey = (c?: Customization | null) => (c ? JSON.stringify([c.text ?? '', c.colors ?? '', c.instructions ?? '']) : '')

export const cart = {
  add(variantId: number, quantity = 1, customization?: Customization | null) {
    const clean = customization && Object.values(customization).some((v) => v && String(v).trim()) ? customization : null
    const key = `${variantId}:${customizationKey(clean)}`
    cartStore.set((items) => {
      const existing = items.find((i) => i.key === key)
      if (existing) return items.map((i) => (i.key === key ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i))
      return [...items, { key, variant_id: variantId, quantity: Math.min(MAX_QTY, quantity), customization: clean }]
    })
    ui.openCart()
  },
  setQuantity(key: string, quantity: number) {
    cartStore.set((items) =>
      quantity <= 0 ? items.filter((i) => i.key !== key) : items.map((i) => (i.key === key ? { ...i, quantity: Math.min(MAX_QTY, quantity) } : i)),
    )
  },
  remove(key: string) {
    cartStore.set((items) => items.filter((i) => i.key !== key))
  },
  clear() {
    cartStore.set([])
  },
}

export const useCartItems = cartStore.use
export const useCartCount = () => cartStore.use().reduce((n, i) => n + i.quantity, 0)

// ---- Wishlist (product ids) -----------------------------------------------
export const wishlistStore = createPersistedStore<number[]>('noire.wishlist.v1', [])
export const wishlist = {
  toggle(productId: number) {
    wishlistStore.set((ids) => (ids.includes(productId) ? ids.filter((i) => i !== productId) : [productId, ...ids]))
  },
  remove(productId: number) {
    wishlistStore.set((ids) => ids.filter((i) => i !== productId))
  },
}
export const useWishlist = wishlistStore.use

// ---- Preferences -----------------------------------------------------------
/** The visitor's chosen iPhone model (slug), remembered across pages. */
export const modelStore = createPersistedStore<string | null>('noire.model.v1', null)
export const recentStore = createPersistedStore<number[]>('noire.recent.v1', [])
export const rememberViewed = (productId: number) => recentStore.set((ids) => [productId, ...ids.filter((i) => i !== productId)].slice(0, 12))

// ---- Ephemeral UI state ---------------------------------------------------
type UiState = { cartOpen: boolean; toast: { id: number; message: string } | null }
let uiState: UiState = { cartOpen: false, toast: null }
const uiListeners = new Set<() => void>()
const setUi = (patch: Partial<UiState>) => {
  uiState = { ...uiState, ...patch }
  uiListeners.forEach((l) => l())
}
let toastTimer: number | undefined
export const ui = {
  openCart: () => setUi({ cartOpen: true }),
  closeCart: () => setUi({ cartOpen: false }),
  toast(message: string) {
    window.clearTimeout(toastTimer)
    setUi({ toast: { id: Date.now(), message } })
    toastTimer = window.setTimeout(() => setUi({ toast: null }), 3200)
  },
}
export const useUi = () =>
  useSyncExternalStore(
    (l) => {
      uiListeners.add(l)
      return () => uiListeners.delete(l)
    },
    () => uiState,
  )
