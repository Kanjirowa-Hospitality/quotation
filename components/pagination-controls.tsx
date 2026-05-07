"use client"

import { Button } from "@/components/ui/button"

export type PaginationMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type PaginationControlsProps = {
  pagination?: PaginationMeta
  onPageChange: (page: number) => void
}

export function PaginationControls({
  pagination,
  onPageChange,
}: PaginationControlsProps) {
  if (!pagination || pagination.totalPages <= 1) return null

  const start = (pagination.page - 1) * pagination.pageSize + 1
  const end = Math.min(pagination.page * pagination.pageSize, pagination.total)

  return (
    <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        Showing {start}-{end} of {pagination.total}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          Previous
        </Button>
        <span className="min-w-24 text-center">
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <Button
          variant="outline"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
