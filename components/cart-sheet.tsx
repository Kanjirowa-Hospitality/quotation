'use client'
import { useCart } from '@/lib/store/cart'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SheetTitle } from '@/components/ui/sheet'
import { useRouter } from 'next/navigation'
import { Check, FilePenLine, Trash2 } from 'lucide-react'

export function CartSheet() {
    const items = useCart((s) => s.items)
    const selectedItems = useCart((s) => s.selectedItems)
    const isSelecting = useCart((s) => s.isSelecting)
    const remove = useCart((s) => s.remove)
    const clear = useCart((s) => s.clear)
    const router = useRouter()
    const visibleItems = [
        ...items.map((item) => ({ ...item, pending: false })),
        ...Object.values(selectedItems)
            .filter((item) => !items.some((cartItem) => cartItem.itemId === item.itemId))
            .map((item) => ({ ...item, pending: true })),
    ]
    const total = visibleItems.reduce((sum, item) => sum + item.price, 0)

    return (
        <div className="flex h-full flex-col">
            <div className="border-b px-6 py-5">
                <div className="pr-10">
                    <SheetTitle className="text-lg font-semibold">Quotation cart</SheetTitle>
                    <p className="text-sm text-muted-foreground">
                        {visibleItems.length} item{visibleItems.length === 1 ? '' : 's'} ready
                        {isSelecting ? ' including current selections' : ''}
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
                {visibleItems.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
                        <FilePenLine className="mb-3 h-8 w-8 text-muted-foreground" />
                        <p className="font-medium">No quotation items yet</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Select items or add them directly from product cards.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {visibleItems.map((item) => (
                            <div
                                key={item.itemId}
                                className="rounded-lg border bg-background p-3 shadow-sm"
                            >
                                <div className="flex gap-3">
                                    <img
                                        src={item.imageUrl || '/placeholder.png'}
                                        alt={item.productName}
                                        className="h-14 w-14 shrink-0 rounded-md object-cover"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">{item.productName}</p>
                                                {item.description && (
                                                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                                                        {item.description}
                                                    </p>
                                                )}
                                            </div>
                                            <p className="shrink-0 font-semibold">Rs. {item.price}</p>
                                        </div>

                                        <div className="mt-3 flex items-center justify-between">
                                            {item.pending ? (
                                                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                                    <Check className="mr-1 h-3 w-3" />
                                                    Selected
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">In cart</span>
                                            )}

                                            {!item.pending && (
                                                <Button
                                                    size="icon-sm"
                                                    variant="ghost"
                                                    className="cursor-pointer"
                                                    onClick={() => remove(item.itemId)}
                                                    aria-label={`Remove ${item.productName}`}
                                                >
                                                    <Trash2 className="h-4 w-4 cursor-pointer text-muted-foreground" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="border-t p-4">
                <div className="mb-3 space-y-2 rounded-lg bg-muted p-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Items</span>
                        <span className="font-medium">{visibleItems.length}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <span className="font-medium">Total</span>
                        <span className="text-lg font-semibold">Rs. {total}</span>
                    </div>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Button
                        className="w-full"
                        disabled={visibleItems.length === 0}
                        onClick={() => router.push('/quotation/edit')}
                    >
                        Edit quotation
                    </Button>
                    <Button
                        size="icon"
                        variant="outline"
                        className="cursor-pointer"
                        disabled={items.length === 0}
                        onClick={clear}
                        aria-label="Clear cart"
                    >
                        <Trash2 className="h-4 w-4 cursor-pointer" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
