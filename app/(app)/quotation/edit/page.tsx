'use client'
import { useCart } from '@/lib/store/cart'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useState } from 'react'

const fields = [
    { id: 'name', label: 'Product Name' },
    { id: 'image', label: 'Image' },
    { id: 'price', label: 'Price' },
    { id: 'description', label: 'Description' },
]

export default function EditQuotationPage() {
    const items = useCart((s) => s.items)
    const [selected, setSelected] = useState<Set<string>>(new Set(['name', 'price']))

    const toggle = (id: string) => {
        const s = new Set(selected)
        s.has(id) ? s.delete(id) : s.add(id)
        setSelected(s)
    }

    const exportFile = async (format: 'excel' | 'word' | 'pdf') => {
        const res = await fetch('/api/quotation/export', {
            method: 'POST',
            body: JSON.stringify({ items, fields: Array.from(selected), format }),
            headers: { 'Content-Type': 'application/json' },
        })
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `quotation.${format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'docx'}`
        a.click()
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Edit quotation</h2>

            <div className="space-y-2">
                {fields.map((f) => (
                    <div key={f.id} className="flex items-center gap-2">
                        <Checkbox
                            id={f.id}
                            checked={selected.has(f.id)}
                            onCheckedChange={() => toggle(f.id)}
                        />
                        <Label htmlFor={f.id}>{f.label}</Label>
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <Button onClick={() => exportFile('excel')}>Excel</Button>
                <Button onClick={() => exportFile('word')}>Word</Button>
                <Button onClick={() => exportFile('pdf')}>PDF</Button>
            </div>
        </div>
    )
}