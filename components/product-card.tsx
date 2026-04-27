'use client'
import { useCart } from '@/lib/store/cart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Plus } from 'lucide-react'

export function ProductCard({ item }: { item: any }) {
    const add = useCart((s) => s.add)
    return (
        <Card>
            <CardHeader>
                <img
                    src={item.product.imageUrl || '/placeholder.png'}
                    alt={item.product.name}
                    className="h-40 w-full object-cover rounded"
                />
            </CardHeader>
            <CardContent>
                <h3 className="font-semibold">{item.product.name}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <p className="mt-2 font-bold">${item.price}</p>
            </CardContent>
            <CardFooter>
                <Button
                    size="sm"
                    className="w-full"
                    onClick={() =>
                        add({
                            itemId: item.id,
                            productName: item.product.name,
                            price: item.price,
                            description: item.description,
                            imageUrl: item.product.imageUrl,
                        })
                    }
                >
                    <Plus className="mr-2 h-4 w-4" /> Add to quotation
                </Button>
            </CardFooter>
        </Card>
    )
}