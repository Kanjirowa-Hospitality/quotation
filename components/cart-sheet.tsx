'use client'
import { useCart } from '@/lib/store/cart'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function CartSheet() {
    const items = useCart((s) => s.items)
    const router = useRouter()
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 space-y-2">
                {items.map((i) => (
                    <div key={i.itemId} className="flex justify-between items-center text-sm">
                        <span>{i.productName}</span>
                        <span>${i.price}</span>
                    </div>
                ))}
            </div>
            <Button className="w-full" onClick={() => router.push('/quotation/edit')}>
                Edit quotation
            </Button>
        </div>
    )
}