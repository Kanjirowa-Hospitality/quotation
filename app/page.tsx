'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PaginationControls, PaginationMeta } from '@/components/pagination-controls'
import { CartItem, useCart } from '@/lib/store/cart'
import { Check, Plus } from 'lucide-react'

type ProductTableItem = {
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

type PaginatedItems = {
  data: ProductTableItem[]
  pagination: PaginationMeta
}

const PAGE_SIZE = 25

export default function Page() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const add = useCart((s) => s.add)
  const isSelecting = useCart((s) => s.isSelecting)
  const selectedItems = useCart((s) => s.selectedItems)
  const toggleSelection = useCart((s) => s.toggleSelection)

  const { data, isLoading } = useQuery<PaginatedItems>({
    queryKey: ['items', search, page],
    queryFn: () =>
      fetch(
        `/api/items?search=${encodeURIComponent(search)}&page=${page}&pageSize=${PAGE_SIZE}`
      ).then((r) => r.json()),
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {isSelecting && <TableHead className="w-10">Select</TableHead>}
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Attributes</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="w-32 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={isSelecting ? 8 : 7} className="h-24 text-center">
                  Loading products...
                </TableCell>
              </TableRow>
            )}

            {!isLoading && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={isSelecting ? 8 : 7} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            )}

            {data?.data.map((item) => {
              const cartItem: CartItem = {
                itemId: item.id,
                productName: item.product.name,
                price: item.price,
                description: item.description ?? undefined,
                imageUrl: item.product.imageUrl ?? undefined,
                attributes: item.attributes ?? undefined,
              }
              const isSelected = Boolean(selectedItems[item.id])

              return (
                <TableRow
                  key={item.id}
                  onClick={() => {
                    if (isSelecting) toggleSelection(cartItem)
                  }}
                  data-state={isSelected ? 'selected' : undefined}
                  className={isSelecting ? 'cursor-pointer' : undefined}
                >
                  {isSelecting && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        aria-label={`Select ${item.product.name}`}
                        onCheckedChange={() => toggleSelection(cartItem)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <img
                      src={item.product.imageUrl || '/placeholder.png'}
                      alt={item.product.name}
                      className="h-12 w-12 rounded object-cover"
                    />
                  </TableCell>
                  <TableCell className="font-medium whitespace-normal">
                    {item.product.name}
                  </TableCell>
                  <TableCell>{item.product.category?.name || '-'}</TableCell>
                  <TableCell className="max-w-md whitespace-normal text-muted-foreground">
                    {item.description || '-'}
                  </TableCell>
                  <TableCell className="max-w-sm whitespace-normal">
                    {item.attributes
                      ? Object.entries(item.attributes)
                          .map(([key, value]) => `${key}: ${String(value)}`)
                          .join(', ')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    Rs. {item.price}
                  </TableCell>
                  <TableCell className="text-right">
                    {isSelecting ? (
                      <Button
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSelection(cartItem)
                        }}
                      >
                        <Check />
                        {isSelected ? 'Selected' : 'Select'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          add(cartItem)
                        }}
                      >
                        <Plus />
                        Add
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <PaginationControls pagination={data?.pagination} onPageChange={setPage} />
    </div>
  )
}
