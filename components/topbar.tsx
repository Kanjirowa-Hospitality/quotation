'use client'
import { useCart } from '@/lib/store/cart'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { CartSheet } from '@/components/cart-sheet'

export function TopBar() {
    const count = useCart((s) => s.items.length)
    return (
        <header className="h-16 border-b bg-background px-6 flex items-center justify-between">
            <h1 className="text-lg font-semibold">Dashboard</h1>
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
        </header>
    )
}