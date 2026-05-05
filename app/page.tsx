'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { ProductCard, ProductCardItem } from '@/components/product-card'

export default function Page() {
  const [search, setSearch] = useState('')

  const { data: items } = useQuery<ProductCardItem[]>({
    queryKey: ['items', search],
    queryFn: () =>
      fetch(`/api/items?search=${encodeURIComponent(search)}`)
        .then((r) => r.json()),
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items?.map((item) => (
          <ProductCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
