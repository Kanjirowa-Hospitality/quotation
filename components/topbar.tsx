'use client'
import { useCart } from '@/lib/store/cart'
import { Check, MousePointer2, ShoppingCart, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { CartSheet } from '@/components/cart-sheet'

export function TopBar() {
    const count = useCart((s) => {
        const ids = new Set(s.items.map((item) => item.itemId))
        Object.keys(s.selectedItems).forEach((id) => ids.add(id))
        return ids.size
    })
    const isSelecting = useCart((s) => s.isSelecting)
    const selectedCount = useCart((s) => Object.keys(s.selectedItems).length)
    const startSelection = useCart((s) => s.startSelection)
    const cancelSelection = useCart((s) => s.cancelSelection)
    const confirmSelection = useCart((s) => s.confirmSelection)

    return (
        <header className="h-16 border-b bg-background px-6 flex items-center justify-between">
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <div className="flex items-center gap-2">
                {isSelecting ? (
                    <>
                        <Button size="sm" onClick={confirmSelection} disabled={selectedCount === 0}>
                            <Check className="mr-2 h-4 w-4" />
                            OK
                            {selectedCount > 0 ? ` (${selectedCount})` : ''}
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelSelection}>
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                        </Button>
                    </>
                ) : (
                    <Button size="sm" variant="outline" onClick={startSelection}>
                        <MousePointer2 className="mr-2 h-4 w-4" />
                        Select
                    </Button>
                )}

                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="relative">
                            <ShoppingCart className="h-5 w-5" />
                            {count > 0 && (
                                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                                    {count}
                                </span>
                            )}
                        </Button>
                    </SheetTrigger>
                    <SheetContent>
                        <CartSheet />
                    </SheetContent>
                </Sheet>
            </div>
        </header>
    )
}
