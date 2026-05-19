import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartItem = {
    itemId: string
    productName: string
    categoryId?: string
    categoryName?: string
    price: number
    discountPercent?: number
    description?: string
    imageUrl?: string
    attributes?: Record<string, unknown> | null
}

type State = {
    items: CartItem[]
    isSelecting: boolean
    selectedItems: Record<string, CartItem>
    add: (i: CartItem) => void
    remove: (itemId: string) => void
    clear: () => void
    startSelection: () => void
    cancelSelection: () => void
    toggleSelection: (i: CartItem) => void
    toggleSelectionGroup: (items: CartItem[]) => void
    confirmSelection: () => void
}

export const useCart = create<State>()(
    persist(
        (set) => ({
            items: [],
            isSelecting: false,
            selectedItems: {},
            add: (i) =>
                set((s) => ({
                    items: s.items.some((x) => x.itemId === i.itemId)
                        ? s.items
                        : [...s.items, i],
                })),
            remove: (id) => set((s) => ({ items: s.items.filter((x) => x.itemId !== id) })),
            clear: () => set({ items: [] }),
            startSelection: () => set({ isSelecting: true, selectedItems: {} }),
            cancelSelection: () => set({ isSelecting: false, selectedItems: {} }),
            toggleSelection: (i) =>
                set((s) => {
                    const next = { ...s.selectedItems }
                    if (next[i.itemId]) {
                        delete next[i.itemId]
                    } else {
                        next[i.itemId] = i
                    }

                    return { selectedItems: next }
                }),
            toggleSelectionGroup: (items) =>
                set((s) => {
                    const selectableItems = items.filter((item) => item.itemId)
                    const allSelected =
                        selectableItems.length > 0 &&
                        selectableItems.every((item) => s.selectedItems[item.itemId])
                    const next = { ...s.selectedItems }

                    for (const item of selectableItems) {
                        if (allSelected) {
                            delete next[item.itemId]
                        } else {
                            next[item.itemId] = item
                        }
                    }

                    return { selectedItems: next }
                }),
            confirmSelection: () =>
                set((s) => {
                    const existingIds = new Set(s.items.map((item) => item.itemId))
                    const newItems = Object.values(s.selectedItems).filter(
                        (item) => !existingIds.has(item.itemId)
                    )

                    return {
                        items: [...s.items, ...newItems],
                        isSelecting: false,
                        selectedItems: {},
                    }
                }),
        }),
        {
            name: 'kanjirow-cart',
            partialize: (s) => ({ items: s.items }),
        }
    )
)
