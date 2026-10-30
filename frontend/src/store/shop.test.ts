import { beforeEach, describe, expect, it } from 'vitest'
import { cart, cartStore, wishlist, wishlistStore } from './shop'

describe('bag store', () => {
  beforeEach(() => cartStore.set([]))

  it('merges identical variants and keeps personalised lines separate', () => {
    cart.add(10, 1)
    cart.add(10, 2)
    cart.add(10, 1, { text: 'AK' })
    const items = cartStore.get()
    expect(items).toHaveLength(2)
    expect(items[0].quantity).toBe(3)
    expect(items[1].customization).toEqual({ text: 'AK' })
  })

  it('caps quantity and removes lines at zero', () => {
    cart.add(5, 30)
    expect(cartStore.get()[0].quantity).toBe(10)
    cart.setQuantity(cartStore.get()[0].key, 0)
    expect(cartStore.get()).toHaveLength(0)
  })

  it('persists to localStorage', () => {
    cart.add(7, 1)
    expect(JSON.parse(localStorage.getItem('noire.bag.v1')!)).toHaveLength(1)
  })

  it('treats blank personalisation as no personalisation', () => {
    cart.add(3, 1, { text: '  ', colors: '' })
    cart.add(3, 1)
    expect(cartStore.get()).toHaveLength(1)
    expect(cartStore.get()[0].quantity).toBe(2)
  })
})

describe('wishlist store', () => {
  beforeEach(() => wishlistStore.set([]))

  it('toggles products', () => {
    wishlist.toggle(1)
    wishlist.toggle(2)
    wishlist.toggle(1)
    expect(wishlistStore.get()).toEqual([2])
  })
})
