import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'
import PDFDocument from 'pdfkit'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stream a pdfkit document to a Buffer */
function pdfToBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = []
        doc.on('data', (chunk: Buffer) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)
        doc.end()
    })
}

/** Build response with correct headers so browsers trigger a file download */
function fileResponse(buffer: Buffer, contentType: string, filename: string): NextResponse {
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    return new NextResponse(ab as ArrayBuffer, {
        headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    })
}

// ---------------------------------------------------------------------------
// POST /api/quotation/export  (or wherever this route lives)
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
    const { items, fields, format } = await req.json()

    // Build header list in a fixed, predictable order
    const headers: string[] = []
    if (fields.includes('name')) headers.push('Product')
    if (fields.includes('description')) headers.push('Description')
    if (fields.includes('price')) headers.push('Price')

    // Map each item to a plain object keyed by the chosen headers
    const rows: Record<string, string>[] = items.map((i: any) => {
        const r: Record<string, string> = {}
        if (fields.includes('name')) r['Product'] = i.productName ?? ''
        if (fields.includes('description')) r['Description'] = i.description ?? ''
        if (fields.includes('price')) r['Price'] = i.price ?? ''
        return r
    })

    // ---------- Excel ----------
    if (format === 'excel') {
        const ws = XLSX.utils.json_to_sheet(rows, { header: headers })
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Quotation')

        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer
        return fileResponse(
            buffer,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'quotation.xlsx',
        )
    }

    // ---------- Word ----------
    if (format === 'word') {
        const borderStyle = {
            style: BorderStyle.SINGLE,
            size: 1,
            color: '000000',
        }
        const cellBorder = {
            top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle,
        }

        /** Wrap text in a bordered TableCell */
        const cell = (text: string, bold = false) =>
            new TableCell({
                borders: cellBorder,
                children: [
                    new Paragraph({
                        children: [new TextRun({ text, bold, size: 20 })],
                    }),
                ],
            })

        const headerRow = new TableRow({
            children: headers.map(h => cell(h, true)),
        })

        const dataRows = rows.map(
            r => new TableRow({ children: headers.map(h => cell(r[h] ?? '')) }),
        )

        const table = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
        })

        const doc = new Document({
            sections: [
                {
                    children: [
                        new Paragraph({
                            children: [new TextRun({ text: 'Quotation', bold: true, size: 32 })],
                            spacing: { after: 300 },
                        }),
                        table,
                    ],
                },
            ],
        })

        const buffer = await Packer.toBuffer(doc)
        return fileResponse(
            buffer,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'quotation.docx',
        )
    }

    // ---------- PDF ----------
    if (format === 'pdf') {
        const doc = new PDFDocument({ margin: 40, size: 'A4' })

        // Title
        doc
            .font('Helvetica-Bold')
            .fontSize(18)
            .text('Quotation', { align: 'left' })
            .moveDown(0.5)

        // Table geometry
        const usableWidth = doc.page.width - 80          // left + right margin
        const colWidth = usableWidth / headers.length
        const rowHeight = 20
        const headerHeight = 22

        let x = doc.page.margins.left
        let y = doc.y

        /** Draw a single cell rectangle + text */
        const drawCell = (
            text: string,
            cx: number,
            cy: number,
            w: number,
            h: number,
            bold = false,
        ) => {
            doc.rect(cx, cy, w, h).stroke()
            doc
                .font(bold ? 'Helvetica-Bold' : 'Helvetica')
                .fontSize(9)
                .text(text, cx + 4, cy + 5, { width: w - 8, ellipsis: true, lineBreak: false })
        }

        // Header row
        headers.forEach((h, i) => drawCell(h, x + i * colWidth, y, colWidth, headerHeight, true))
        y += headerHeight

        // Data rows
        rows.forEach(r => {
            // Start a new page if we're about to overflow
            if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
                doc.addPage()
                y = doc.page.margins.top
            }
            headers.forEach((h, i) => drawCell(r[h] ?? '', x + i * colWidth, y, colWidth, rowHeight))
            y += rowHeight
        })

        const buffer = await pdfToBuffer(doc)
        return fileResponse(buffer, 'application/pdf', 'quotation.pdf')
    }

    return NextResponse.json({ error: 'Bad format. Use excel | word | pdf.' }, { status: 400 })
}