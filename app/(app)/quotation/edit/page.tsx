'use client'
import { CartItem, useCart } from '@/lib/store/cart'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Download, FileSpreadsheet, FileText, LoaderCircle, Percent, Trash2 } from 'lucide-react'
import { getValidationError, parsePriceInput, quotationExportSchema } from '@/lib/validation/product'

const fields = [
    { id: 'name', label: 'Product name' },
    { id: 'image', label: 'Image' },
    { id: 'price', label: 'Price' },
    { id: 'description', label: 'Description' },
] as const

type FieldId = (typeof fields)[number]['id']
type ExportFormat = 'excel' | 'word' | 'pdf'
type DiscountScope = 'all' | 'category'
type QuotationMeta = {
    quotationDate: string
    customerName: string
    customerAddress: string
    quotationTitle: string
}
type ExportStatus = {
    format: ExportFormat
    state: 'loading' | 'success' | 'error'
} | null
type SaleOptionCategoryLookup = {
    id: string
    product?: {
        category?: {
            id?: string
            name: string
        } | null
    } | null
}

const exportFormats: {
    id: ExportFormat
    label: string
    description: string
    extension: string
    icon: typeof FileText
}[] = [
        {
            id: 'excel',
            label: 'Excel',
            description: 'Spreadsheet format for calculations and edits.',
            extension: 'xlsx',
            icon: FileSpreadsheet,
        },
        {
            id: 'word',
            label: 'Word',
            description: 'Document format for sending polished quotations.',
            extension: 'docx',
            icon: FileText,
        },
        {
            id: 'pdf',
            label: 'PDF',
            description: 'Fixed layout format for sharing final copies.',
            extension: 'pdf',
            icon: FileText,
        },
    ]

function parseDiscountInput(value: string) {
    const normalized = value.trim()

    if (!normalized) return null
    if (!/^\d*(?:\.\d{0,2})?$/.test(normalized)) return null

    const discount = Number(normalized)

    return Number.isFinite(discount) && discount >= 0 && discount <= 100 ? discount : null
}

function discountedPrice(price: number, discountPercent?: number) {
    const discount = Number(discountPercent ?? 0)

    if (!Number.isFinite(discount) || discount <= 0) return price

    return Math.round(price * (1 - discount / 100) * 100) / 100
}

function getCategoryKey(item: CartItem) {
    return item.categoryId ?? item.categoryName ?? ''
}

export default function EditQuotationPage() {
    const cartItems = useCart((s) => s.items)
    const selectedItems = useCart((s) => s.selectedItems)
    const items = useMemo(() => {
        const cartIds = new Set(cartItems.map((item) => item.itemId))
        const pendingItems = Object.values(selectedItems).filter(
            (item) => !cartIds.has(item.itemId)
        )

        return [...cartItems, ...pendingItems]
    }, [cartItems, selectedItems])
    const [selected, setSelected] = useState<Set<FieldId>>(
        new Set(['name', 'image', 'price', 'description'])
    )
    const [editableItems, setEditableItems] = useState<CartItem[] | null>(null)
    const [bulkDiscount, setBulkDiscount] = useState('')
    const [bulkDiscountScope, setBulkDiscountScope] = useState<DiscountScope>('all')
    const [bulkDiscountCategory, setBulkDiscountCategory] = useState('')
    const loadedCategoryDetailsRef = useRef(false)
    const [exportStatus, setExportStatus] = useState<ExportStatus>(null)
    const [formatDialogOpen, setFormatDialogOpen] = useState(false)
    const [quotationMeta, setQuotationMeta] = useState<QuotationMeta>({
        quotationDate: '',
        customerName: '',
        customerAddress: '',
        quotationTitle: '',
    })
    const quotationItems = editableItems ?? items
    const discountCategories = useMemo(() => {
        const categories = new Map<string, string>()

        for (const item of quotationItems) {
            const key = getCategoryKey(item)
            if (key) categories.set(key, item.categoryName ?? 'Unnamed category')
        }

        return Array.from(categories, ([id, name]) => ({ id, name })).sort((a, b) =>
            a.name.localeCompare(b.name)
        )
    }, [quotationItems])
    const exportItems = useMemo(
        () =>
            quotationItems.map((item) => ({
                ...item,
                price: discountedPrice(item.price, item.discountPercent),
            })),
        [quotationItems]
    )

    useEffect(() => {
        if (loadedCategoryDetailsRef.current || quotationItems.every((item) => getCategoryKey(item))) return

        loadedCategoryDetailsRef.current = true
        fetch('/api/items')
            .then((response) => response.json())
            .then((saleOptions: SaleOptionCategoryLookup[]) => {
                const categoriesByItemId = new Map(
                    saleOptions.map((saleOption) => [saleOption.id, saleOption.product?.category])
                )

                setEditableItems((current) =>
                    (current ?? items).map((item) => {
                        if (getCategoryKey(item)) return item

                        const category = categoriesByItemId.get(item.itemId)

                        return category
                            ? {
                                ...item,
                                categoryId: category.id,
                                categoryName: category.name,
                            }
                            : item
                    })
                )
            })
            .catch(() => {
                loadedCategoryDetailsRef.current = false
            })
    }, [items, quotationItems])

    const toggle = (id: FieldId) => {
        const s = new Set(selected)
        if (s.has(id)) {
            s.delete(id)
        } else {
            s.add(id)
        }
        setSelected(s)
    }

    const updateItem = (itemId: string, patch: Partial<CartItem>) => {
        setEditableItems((current) =>
            (current ?? items).map((item) =>
                item.itemId === itemId ? { ...item, ...patch } : item
            )
        )
    }

    const deleteItem = (itemId: string) => {
        setEditableItems((current) =>
            (current ?? items).filter((item) => item.itemId !== itemId)
        )
    }

    const applyBulkDiscount = () => {
        const discount = parseDiscountInput(bulkDiscount)
        if (discount === null) return
        if (bulkDiscountScope === 'category' && !bulkDiscountCategory) return

        setEditableItems((current) =>
            (current ?? items).map((item) => {
                const shouldApply =
                    bulkDiscountScope === 'all' || getCategoryKey(item) === bulkDiscountCategory

                return shouldApply
                    ? {
                        ...item,
                        discountPercent: discount,
                    }
                    : item
            })
        )
    }

    const clearDiscounts = () => {
        setBulkDiscount('')
        setEditableItems((current) =>
            (current ?? items).map((item) => ({
                ...item,
                discountPercent: 0,
            }))
        )
    }

    const exportFile = async (format: ExportFormat) => {
        const payload = {
            items: exportItems,
            fields: Array.from(selected),
            format,
            meta: quotationMeta,
        }
        const validation = quotationExportSchema.safeParse(payload)

        if (!validation.success) {
            alert(getValidationError(validation.error))
            return
        }

        setExportStatus({ format, state: 'loading' })

        try {
            const res = await fetch('/api/quotation/export', {
                method: 'POST',
                body: JSON.stringify(validation.data),
                headers: { 'Content-Type': 'application/json' },
            })
            if (!res.ok) {
                const payload = await res.json().catch(() => null)
                throw new Error(payload?.error ?? 'Failed to generate quotation')
            }
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `quotation.${format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'docx'}`
            a.click()
            window.URL.revokeObjectURL(url)
            setExportStatus({ format, state: 'success' })
            window.setTimeout(() => {
                setExportStatus((current) =>
                    current?.format === format && current.state === 'success' ? null : current
                )
                setFormatDialogOpen(false)
            }, 1800)
        } catch (error) {
            setExportStatus({ format, state: 'error' })
            window.setTimeout(() => {
                setExportStatus((current) =>
                    current?.format === format && current.state === 'error' ? null : current
                )
            }, 2400)
            alert(error instanceof Error ? error.message : 'Failed to generate quotation')
        }
    }

    return (
        <div className="flex min-h-0 flex-col gap-4 md:h-[calc(100vh-3rem)] md:overflow-hidden">
            <div className="shrink-0">
                <h2 className="text-xl font-semibold">Edit quotation</h2>
                <p className="text-sm text-muted-foreground">
                    These edits are only used for export and will not update product data.
                </p>
            </div>

            <section className="shrink-0 rounded-lg border bg-background p-4">
                <div className="mb-3">
                    <h3 className="font-medium">Export fields</h3>
                    <p className="text-sm text-muted-foreground">
                        Choose which fields should appear in the exported quotation.
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {fields.map((f) => (
                        <Label
                            key={f.id}
                            htmlFor={f.id}
                            className="flex cursor-pointer items-center gap-3 rounded-md border bg-muted/40 p-3"
                        >
                            <Checkbox
                                id={f.id}
                                checked={selected.has(f.id)}
                                onCheckedChange={() => toggle(f.id)}
                            />
                            <span>{f.label}</span>
                        </Label>
                    ))}
                </div>
            </section>

            <section className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="shrink-0 rounded-md border bg-background p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <h3 className="font-medium">Quotation items</h3>
                            <p className="text-sm text-muted-foreground">
                                Edit names, image URLs, descriptions, prices, and discounts before exporting.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Select
                                value={bulkDiscountScope}
                                onValueChange={(value) => setBulkDiscountScope(value as DiscountScope)}
                            >
                                <SelectTrigger
                                    aria-label="Discount apply option"
                                    className="h-8 w-full sm:w-36"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All products</SelectItem>
                                    <SelectItem value="category">By category</SelectItem>
                                </SelectContent>
                            </Select>
                            {bulkDiscountScope === 'category' && (
                                <Select
                                    value={bulkDiscountCategory}
                                    onValueChange={setBulkDiscountCategory}
                                    disabled={discountCategories.length === 0}
                                >
                                    <SelectTrigger
                                        aria-label="Discount category"
                                        className="h-8 w-full sm:w-44"
                                    >
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {discountCategories.map((category) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            <div className="relative">
                                <Percent className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    aria-label="Discount percentage for all products"
                                    inputMode="decimal"
                                    value={bulkDiscount}
                                    onChange={(event) => setBulkDiscount(event.target.value)}
                                    placeholder="Discount %"
                                    className="h-8 w-full pl-7 sm:w-32"
                                />
                            </div>
                            <Button
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={applyBulkDiscount}
                                disabled={
                                    parseDiscountInput(bulkDiscount) === null ||
                                    (bulkDiscountScope === 'category' && !bulkDiscountCategory)
                                }
                            >
                                {bulkDiscountScope === 'category' ? 'Apply to category' : 'Apply to all'}
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full sm:w-auto"
                                onClick={clearDiscounts}
                                disabled={quotationItems.length === 0}
                            >
                                Clear discounts
                            </Button>
                        </div>
                        <Dialog open={formatDialogOpen} onOpenChange={setFormatDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="w-full sm:w-auto" disabled={quotationItems.length === 0 || selected.size === 0}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Generate quotation
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>Generate quotation</DialogTitle>
                                    <DialogDescription>
                                        Confirm the document details, then choose an export format.
                                    </DialogDescription>
                                </DialogHeader>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="quotation-date">Date</Label>
                                    <Input
                                        id="quotation-date"
                                        value={quotationMeta.quotationDate}
                                        onChange={(e) =>
                                            setQuotationMeta((current) => ({
                                                ...current,
                                                quotationDate: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="quotation-title">Quotation for</Label>
                                    <Input
                                        id="quotation-title"
                                        value={quotationMeta.quotationTitle}
                                        onChange={(e) =>
                                            setQuotationMeta((current) => ({
                                                ...current,
                                                quotationTitle: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="customer-name">Hotel / customer name</Label>
                                    <Input
                                        id="customer-name"
                                        value={quotationMeta.customerName}
                                        onChange={(e) =>
                                            setQuotationMeta((current) => ({
                                                ...current,
                                                customerName: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="customer-address">Hotel / customer address</Label>
                                    <Input
                                        id="customer-address"
                                        value={quotationMeta.customerAddress}
                                        onChange={(e) =>
                                            setQuotationMeta((current) => ({
                                                ...current,
                                                customerAddress: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                {exportFormats.map((format) => {
                                    const Icon = format.icon
                                    const status =
                                        exportStatus?.format === format.id ? exportStatus.state : null
                                    const isGenerating = exportStatus?.state === 'loading'

                                    return (
                                        <button
                                            key={format.id}
                                            type="button"
                                            onClick={() => exportFile(format.id)}
                                            disabled={isGenerating}
                                            aria-busy={status === 'loading'}
                                            className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium">{format.label}</p>
                                                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                                        .{format.extension}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {format.description}
                                                </p>
                                            </div>
                                            {status === 'loading' && (
                                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                                </span>
                                            )}
                                            {status === 'success' && (
                                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-white">
                                                    <Check className="h-4 w-4" />
                                                </span>
                                            )}
                                            {status === 'error' && (
                                                <span className="text-xs font-medium text-destructive">
                                                    Failed
                                                </span>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {quotationItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
                        No items in the quotation cart.
                    </div>
                ) : (
                    <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-background">
                        <table className="min-w-[1160px] w-full caption-bottom text-xs">
                            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:shadow-[inset_0_-1px_0_0_var(--border)]">
                                <TableRow>
                                    <TableHead className="w-16">Image</TableHead>
                                    <TableHead className="min-w-56">Product name</TableHead>
                                    <TableHead className="min-w-72">Description</TableHead>
                                    <TableHead className="w-32">Base price</TableHead>
                                    <TableHead className="w-28">Discount</TableHead>
                                    <TableHead className="w-32">Final price</TableHead>
                                    <TableHead className="min-w-64">Image URL</TableHead>
                                    <TableHead className="w-16 text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quotationItems.map((item) => {
                                    const finalPrice = discountedPrice(item.price, item.discountPercent)

                                    return (
                                    <TableRow key={item.itemId}>
                                        <TableCell>
                                            {/* eslint-disable-next-line @next/next/no-img-element -- Product previews can be local placeholders or remote catalog URLs. */}
                                            <img
                                                src={item.imageUrl || '/placeholder.svg'}
                                                alt={item.productName}
                                                className="h-12 w-12 rounded-md object-cover"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                aria-label="Product name"
                                                value={item.productName}
                                                onChange={(e) =>
                                                    updateItem(item.itemId, { productName: e.target.value })
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Textarea
                                                aria-label="Description"
                                                className="min-h-12"
                                                value={item.description ?? ''}
                                                onChange={(e) =>
                                                    updateItem(item.itemId, { description: e.target.value })
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                aria-label="Base price"
                                                type="number"
                                                inputMode="decimal"
                                                min={0}
                                                value={item.price}
                                                onChange={(e) => {
                                                    const price = parsePriceInput(e.target.value)
                                                    if (price === null) return
                                                    updateItem(item.itemId, {
                                                        price,
                                                    })
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="relative">
                                                <Input
                                                    aria-label="Discount percentage"
                                                    inputMode="decimal"
                                                    value={item.discountPercent ?? ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value.trim()
                                                        const discount = parseDiscountInput(value)

                                                        if (value && discount === null) return

                                                        updateItem(item.itemId, {
                                                            discountPercent: discount ?? undefined,
                                                        })
                                                    }}
                                                    className="pr-6"
                                                />
                                                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                    %
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-semibold">
                                            Rs. {finalPrice}
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                aria-label="Image URL"
                                                value={item.imageUrl ?? ''}
                                                onChange={(e) =>
                                                    updateItem(item.itemId, { imageUrl: e.target.value })
                                                }
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="icon-sm"
                                                variant="destructive"
                                                className="cursor-pointer"
                                                onClick={() => deleteItem(item.itemId)}
                                                aria-label={`Delete ${item.productName}`}
                                            >
                                                <Trash2 className="h-4 w-4 cursor-pointer" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    )
                                })}
                            </TableBody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    )
}
