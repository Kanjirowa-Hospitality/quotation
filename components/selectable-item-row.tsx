'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { CartItem, useCart } from '@/lib/store/cart'

type SelectableItemRowProps = {
    item: {
        id: string
        description: string | null
        price: number
        attributes?: Record<string, unknown> | null
    }
    product: {
        name: string
        imageUrl: string | null
    }
}

export function SelectableItemRow({ item, product }: SelectableItemRowProps) {
    const isSelecting = useCart((s) => s.isSelecting)
    const selectedItems = useCart((s) => s.selectedItems)
    const toggleSelection = useCart((s) => s.toggleSelection)

    const cartItem: CartItem = {
        itemId: item.id,
        productName: product.name,
        price: item.price,
        description: item.description ?? undefined,
        imageUrl: product.imageUrl ?? undefined,
        attributes: item.attributes ?? undefined,
    }
    const isSelected = Boolean(selectedItems[item.id])

    const handleSelect = () => {
        if (isSelecting) {
            toggleSelection(cartItem)
        }
    }

    return (
        <div
            onClick={handleSelect}
            className={cn(
                'flex flex-col gap-3 rounded-md bg-muted p-3 transition-colors sm:flex-row sm:items-start sm:justify-between',
                isSelecting && 'cursor-pointer border border-primary/30 bg-primary/5 hover:bg-primary/10',
                isSelected && 'border-primary bg-primary/10 ring-2 ring-primary/30'
            )}
        >
            <div className="flex min-w-0 items-start gap-3">
                {isSelecting && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg border border-primary/40 bg-white p-2 shadow-sm"
                    >
                        <Checkbox
                            checked={isSelected}
                            aria-label={`Select ${product.name}`}
                            onCheckedChange={() => toggleSelection(cartItem)}
                        />
                    </div>
                )}

                <div className="min-w-0 space-y-1">
                    <p className="font-medium">{item.description || product.name}</p>

                    {item.attributes && (
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(item.attributes).map(([key, value]) => (
                                <span
                                    key={key}
                                    className="rounded border bg-white px-2 py-1 text-xs"
                                >
                                    {key}: {String(value)}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="shrink-0 font-semibold sm:text-right">Rs. {item.price}</div>
        </div>
    )
}
