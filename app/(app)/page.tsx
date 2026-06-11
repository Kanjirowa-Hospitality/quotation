'use client'

import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
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
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { LoadingState } from '@/components/ui/loading-state'

type ProductTableItem = {
  id: string
  price: number
  description: string | null
  attributes?: Record<string, unknown> | null
  product: {
    name: string
    imageUrl: string | null
    category?: {
      id?: string
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
  const debouncedSearch = useDebouncedValue(search)
  const add = useCart((s) => s.add)
  const isSelecting = useCart((s) => s.isSelecting)
  const selectedItems = useCart((s) => s.selectedItems)
  const toggleSelection = useCart((s) => s.toggleSelection)

  const { data, isLoading, isFetching } = useQuery<PaginatedItems>({
    queryKey: ['items', debouncedSearch, page],
    queryFn: () =>
      fetch(
        `/api/items?search=${encodeURIComponent(debouncedSearch)}&page=${page}&pageSize=${PAGE_SIZE}`
      ).then((r) => r.json()),
    placeholderData: keepPreviousData,
  })

  return (
    <div className="flex min-h-0 flex-col gap-3 md:h-full md:overflow-hidden">
      <div className="flex shrink-0 gap-2">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        {isFetching && !isLoading && (
          <span className="self-center whitespace-nowrap text-sm text-muted-foreground">
            Searching...
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-background">
        <Table className="min-w-[920px]">
          <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:shadow-[inset_0_-1px_0_0_var(--border)]">
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
                  <LoadingState label="Loading products..." />
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
                categoryId: item.product.category?.id,
                categoryName: item.product.category?.name,
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
                      src={item.product.imageUrl || '/placeholder.svg'}
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

      <div className="shrink-0">
        <PaginationControls pagination={data?.pagination} onPageChange={setPage} />
      </div>
    </div>
  )
}
