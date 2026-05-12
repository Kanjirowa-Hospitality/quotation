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
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useMemo, useState } from 'react'
import { Check, Download, FileSpreadsheet, FileText, Trash2 } from 'lucide-react'
import { parsePriceInput } from '@/lib/validation/product'

const fields = [
    { id: 'name', label: 'Product name' },
    { id: 'image', label: 'Image' },
    { id: 'price', label: 'Price' },
    { id: 'description', label: 'Description' },
] as const

type FieldId = (typeof fields)[number]['id']
type ExportFormat = 'excel' | 'word' | 'pdf'
type QuotationMeta = {
    quotationDate: string
    customerName: string
    customerAddress: string
    quotationTitle: string
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
    const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null)
    const [formatDialogOpen, setFormatDialogOpen] = useState(false)
    const [quotationMeta, setQuotationMeta] = useState<QuotationMeta>({
        quotationDate: '2083/1/21',
        customerName: 'Intercontinential Pokhara Resort',
        customerAddress: 'Begnas Lake, Pachbhaiva- 31, Pokhara',
        quotationTitle: 'Kible Quotation 2083',
    })
    const quotationItems = editableItems ?? items

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

    const exportFile = async (format: ExportFormat) => {
        setSelectedFormat(format)
        const res = await fetch('/api/quotation/export', {
            method: 'POST',
            body: JSON.stringify({
                items: quotationItems,
                fields: Array.from(selected),
                format,
                meta: quotationMeta,
            }),
            headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) {
            setSelectedFormat(null)
            throw new Error('Failed to generate quotation')
        }
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `quotation.${format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'docx'}`
        a.click()
        window.URL.revokeObjectURL(url)
        window.setTimeout(() => setFormatDialogOpen(false), 500)
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
                                Edit names, image URLs, descriptions, and prices before exporting.
                            </p>
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
                                    const isSelected = selectedFormat === format.id

                                    return (
                                        <button
                                            key={format.id}
                                            type="button"
                                            onClick={() => exportFile(format.id)}
                                            className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
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
                                            {isSelected && (
                                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-white">
                                                    <Check className="h-4 w-4" />
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
                        <table className="min-w-[980px] w-full caption-bottom text-xs">
                            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:shadow-[inset_0_-1px_0_0_var(--border)]">
                                <TableRow>
                                    <TableHead className="w-16">Image</TableHead>
                                    <TableHead className="min-w-56">Product name</TableHead>
                                    <TableHead className="min-w-72">Description</TableHead>
                                    <TableHead className="w-32">Price</TableHead>
                                    <TableHead className="min-w-64">Image URL</TableHead>
                                    <TableHead className="w-16 text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quotationItems.map((item) => (
                                    <TableRow key={item.itemId}>
                                        <TableCell>
                                            <img
                                                src={item.imageUrl || '/placeholder.png'}
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
                                                aria-label="Price"
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
                                ))}
                            </TableBody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    )
}
