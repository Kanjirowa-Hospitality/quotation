import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartItem = {
    itemId: string
    productName: string
    price: number
    description?: string
    imageUrl?: string
}

type State = {
    items: CartItem[]
    add: (i: CartItem) => void
    remove: (itemId: string) => void
    clear: () => void
}

export const useCart = create<State>()(
    persist(
        (set) => ({
            items: [],
            add: (i) => set((s) => ({ items: [...s.items, i] })),
            remove: (id) => set((s) => ({ items: s.items.filter((x) => x.itemId !== id) })),
            clear: () => set({ items: [] }),
        }),
        { name: 'kanjirow-cart' }
    )
)