'use client'
import { CartItem, useCart } from '@/lib/store/cart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Check, Plus } from 'lucide-react'

export type ProductCardItem = {
    id: string
    price: number
    description: string | null
    attributes?: Record<string, unknown> | null
    product: {
        name: string
        imageUrl: string | null
        category?: {
            name: string
        } | null
    }
}

export function ProductCard({ item }: { item: ProductCardItem }) {
    const add = useCart((s) => s.add)
    const isSelecting = useCart((s) => s.isSelecting)
    const selectedItems = useCart((s) => s.selectedItems)
    const toggleSelection = useCart((s) => s.toggleSelection)
    const cartItem: CartItem = {
        itemId: item.id,
        productName: item.product.name,
        price: item.price,
        description: item.description ?? undefined,
        imageUrl: item.product.imageUrl ?? undefined,
        attributes: item.attributes ?? undefined,
    }
    const isSelected = Boolean(selectedItems[item.id])

    const handleSelect = () => {
        if (isSelecting) {
            toggleSelection(cartItem)
        }
    }

    return (
        <Card
            onClick={handleSelect}
            className={
                isSelecting
                    ? `cursor-pointer transition-colors hover:border-primary ${isSelected ? 'border-primary ring-2 ring-primary/30' : ''}`
                    : undefined
            }
        >
            <CardHeader className="relative">
                {isSelecting && (
                    <div
                        className="absolute right-4 top-4 rounded-lg border border-primary/40 bg-primary/10 p-2 shadow-md backdrop-blur"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Checkbox
                            checked={isSelected}
                            aria-label={`Select ${item.product.name}`}
                            onCheckedChange={() => toggleSelection(cartItem)}
                        />
                    </div>
                )}
                <img
                    src={item.product.imageUrl || '/placeholder.png'}
                    alt={item.product.name}
                    className="h-40 w-full object-cover object-center rounded"
                />
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <h3 className="min-w-0 text-lg font-semibold leading-tight">{item.product.name}</h3>
                    <span className="shrink-0 text-sm italic text-muted-foreground sm:text-right">
                        {item.product.category?.name}
                    </span>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <p className="mt-2 font-bold">${item.price}</p>
            </CardContent>
            <CardFooter>
                {isSelecting ? (
                    <Button
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        className="w-full"
                        onClick={(e) => {
                            e.stopPropagation()
                            toggleSelection(cartItem)
                        }}
                    >
                        <Check className="mr-2 h-4 w-4" />
                        {isSelected ? 'Selected' : 'Select item'}
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                            e.stopPropagation()
                            add(cartItem)
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add to quotation
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}
