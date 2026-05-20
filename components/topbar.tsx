'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/store/cart'
import { ArrowLeft, Check, LogOut, Menu, MousePointer2, ShoppingCart, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { CartSheet } from '@/components/cart-sheet'
import { Sidebar } from '@/components/sidebar'

type TopBarUser = {
    name: string | null
    email: string
    role: string
}

export function TopBar({ user }: { user: TopBarUser }) {
    const router = useRouter()
    const [cartOpen, setCartOpen] = useState(false)
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

    async function signOut() {
        await fetch('/api/auth/signout', { method: 'POST' })
        router.replace('/signin')
        router.refresh()
    }

    return (
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-3 sm:px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back" title="Go back">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="md:hidden" aria-label="Open navigation">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[85vw] max-w-xs p-0" showCloseButton={false}>
                        <Sidebar className="h-full w-full border-r-0" showCollapse={false} user={user} />
                    </SheetContent>
                </Sheet>
                <Link href="/" className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1 hover:bg-accent">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Header uses the existing small logo asset. */}
                    <img src="/main-logo.png" alt="Kanjirowa" className="h-9 shrink-0" />
                    <span className="truncate text-base font-semibold sm:text-lg">Kanjirowa</span>
                </Link>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                {isSelecting ? (
                    <>
                        <Button size="sm" onClick={confirmSelection} disabled={selectedCount === 0}>
                            <Check className="mr-2 h-4 w-4" />
                            OK
                            {selectedCount > 0 ? ` (${selectedCount})` : ''}
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelSelection}>
                            <X className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Cancel</span>
                        </Button>
                    </>
                ) : (
                    <Button size="sm" variant="outline" onClick={startSelection}>
                        <MousePointer2 className="mr-2 h-4 w-4" />
                        Select
                    </Button>
                )}

                <Sheet open={cartOpen} onOpenChange={setCartOpen}>
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
                        <CartSheet onClose={() => setCartOpen(false)} />
                    </SheetContent>
                </Sheet>

                <Button variant="outline" size="icon" onClick={signOut} aria-label="Sign out" title="Sign out">
                    <LogOut className="h-5 w-5" />
                </Button>
            </div>
        </header>
    )
}
