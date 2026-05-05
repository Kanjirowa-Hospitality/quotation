import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { readFile } from 'fs/promises'
import {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    Header,
    ImageRun,
    Packer,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableLayoutType,
    TableRow,
    TextRun,
    VerticalAlignTable,
    VerticalMergeType,
    WidthType,
} from 'docx'
import PDFDocument from 'pdfkit'

export const runtime = 'nodejs'

type ExportFormat = 'excel' | 'word' | 'pdf'
type ExportField = 'name' | 'image' | 'description' | 'price'
type ExportItem = {
    productName?: string
    imageUrl?: string
    description?: string
    price?: number | string
    attributes?: Record<string, unknown> | null
}
type QuotationMeta = {
    quotationDate?: string
    customerName?: string
    customerAddress?: string
    quotationTitle?: string
}
type ExportImage = {
    data: ArrayBuffer
    type: 'jpg' | 'png' | 'gif' | 'bmp'
}

const TEMPLATE_DOCX_PATH = 'c:\\Users\\gauta\\Desktop\\kanjirowa\\for small business\\disposable-and-paper.docx'
const TEMPLATE_FONT = 'Trebuchet MS'
let templateDocxPromise: Promise<JSZip | null> | null = null

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

function cloudinaryPngUrl(url: string) {
    if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
        return url
    }

    return url.replace('/upload/', '/upload/f_png,w_240,c_limit/')
}

function imageTypeFromContentType(contentType: string): ExportImage['type'] | null {
    if (contentType.includes('png')) return 'png'
    if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg'
    if (contentType.includes('gif')) return 'gif'
    if (contentType.includes('bmp')) return 'bmp'
    return null
}

async function fetchExportImage(url?: string): Promise<ExportImage | null> {
    if (!url || !url.startsWith('http')) {
        return null
    }

    const urls = Array.from(new Set([cloudinaryPngUrl(url), url]))

    for (const imageUrl of urls) {
        try {
            const res = await fetch(imageUrl)
            if (!res.ok) continue

            const type = imageTypeFromContentType(res.headers.get('content-type') ?? '')
            if (!type) continue

            return {
                data: await res.arrayBuffer(),
                type,
            }
        } catch {
            continue
        }
    }

    return null
}

async function getTemplateDocx() {
    if (!templateDocxPromise) {
        templateDocxPromise = readFile(TEMPLATE_DOCX_PATH)
            .then((file) => JSZip.loadAsync(file))
            .catch(() => null)
    }

    return templateDocxPromise
}

function textRun(text: string, options: { bold?: boolean; size?: number; color?: string } = {}) {
    return new TextRun({
        text,
        bold: options.bold,
        color: options.color,
        font: TEMPLATE_FONT,
        size: options.size ?? 22,
    })
}

function paragraph(
    text: string,
    options: { bold?: boolean; size?: number; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}
) {
    return new Paragraph({
        alignment: options.alignment,
        spacing: { before: 0, after: 80 },
        children: [textRun(text, { bold: options.bold, size: options.size })],
    })
}

function formatAttributes(attributes?: Record<string, unknown> | null) {
    if (!attributes) return ''

    return Object.entries(attributes)
        .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(', ')
}

function tableBorders(size = 4) {
    const border = { style: BorderStyle.SINGLE, size, color: '000000' }
    return {
        top: border,
        bottom: border,
        left: border,
        right: border,
        insideHorizontal: border,
        insideVertical: border,
    }
}

function emptyHeader() {
    return new Header({
        children: [new Paragraph({ children: [] })],
    })
}

function emptyFooter() {
    return new Footer({
        children: [new Paragraph({ children: [] })],
    })
}

async function patchTemplateHeaderFooter(buffer: Buffer) {
    const template = await getTemplateDocx()
    if (!template) return buffer

    const generated = await JSZip.loadAsync(buffer)
    const filesToCopy = [
        'word/header1.xml',
        'word/footer1.xml',
        'word/_rels/header1.xml.rels',
        'word/_rels/footer1.xml.rels',
        'word/media/image1.png',
        'word/media/image2.png',
        'word/media/image3.png',
        'word/media/image4.png',
        'word/media/image5.png',
        'word/media/image6.png',
    ]

    await Promise.all(
        filesToCopy.map(async (path) => {
            const file = template.file(path)
            if (!file) return
            generated.file(path, await file.async('uint8array'))
        })
    )

    const contentTypesFile = generated.file('[Content_Types].xml')
    if (contentTypesFile) {
        const contentTypes = await contentTypesFile.async('string')
        if (!contentTypes.includes('Extension="png"')) {
            generated.file(
                '[Content_Types].xml',
                contentTypes.replace(
                    '</Types>',
                    '<Default Extension="png" ContentType="image/png"/></Types>'
                )
            )
        }
    }

    return Buffer.from(await generated.generateAsync({ type: 'uint8array' }))
}

// ---------------------------------------------------------------------------
// POST /api/quotation/export  (or wherever this route lives)
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
    const {
        items,
        fields,
        format,
        meta,
    }: {
        items: ExportItem[]
        fields: ExportField[]
        format: ExportFormat
        meta?: QuotationMeta
    } = await req.json()
    const quotationDate = meta?.quotationDate?.trim() || '2083/1/21'
    const customerName = meta?.customerName?.trim() || 'Intercontinential Pokhara Resort'
    const customerAddress = meta?.customerAddress?.trim() || 'Begnas Lake, Pachbhaiva- 31, Pokhara'
    const quotationTitle = meta?.quotationTitle?.trim() || 'Kible Quotation 2083'

    // Build header list in a fixed, predictable order
    const headers: string[] = []
    if (fields.includes('name')) headers.push('Product')
    if (fields.includes('image')) headers.push('Image')
    if (fields.includes('description')) headers.push('Description')
    if (fields.includes('price')) headers.push('Price')

    // Map each item to a plain object keyed by the chosen headers
    const rows: Record<string, string>[] = items.map((i) => {
        const r: Record<string, string> = {}
        if (fields.includes('name')) r['Product'] = i.productName ?? ''
        if (fields.includes('image')) r['Image'] = i.imageUrl ?? ''
        if (fields.includes('description')) r['Description'] = i.description ?? ''
        if (fields.includes('price')) r['Price'] = String(i.price ?? '')
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
        const templateHeaders = ['S.N', 'Image', 'Name', 'Description', 'Price per unit']
        const columnWidths = [606, 1590, 1500, 3900, 2069]
        const cellBorder = tableBorders(4)

        const tableTextCell = (
            text: string,
            options: {
                bold?: boolean
                width: number
                shading?: boolean
                size?: number
                alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]
                verticalMerge?: (typeof VerticalMergeType)[keyof typeof VerticalMergeType]
            }
        ) =>
            new TableCell({
                borders: cellBorder,
                width: { size: options.width, type: WidthType.DXA },
                verticalAlign: VerticalAlignTable.CENTER,
                verticalMerge: options.verticalMerge,
                shading: options.shading
                    ? { type: ShadingType.CLEAR, fill: 'E7E6E6', color: 'auto' }
                    : undefined,
                margins: { top: 80, bottom: 80, left: 108, right: 108 },
                children: (text ? text.split('\n') : ['']).map((line) =>
                    new Paragraph({
                        alignment: options.alignment ?? AlignmentType.CENTER,
                        children: [
                            textRun(line, {
                                bold: options.bold,
                                size: options.size ?? 22,
                            }),
                        ],
                    })
                ),
            })

        const tableImageCell = async (
            item: ExportItem,
            width: number,
            verticalMerge?: (typeof VerticalMergeType)[keyof typeof VerticalMergeType]
        ) => {
            const image = await fetchExportImage(item.imageUrl)
            if (!image) {
                return tableTextCell(fields.includes('image') ? (item.imageUrl ?? '') : '', {
                    width,
                    size: 18,
                    verticalMerge,
                })
            }

            return new TableCell({
                borders: cellBorder,
                width: { size: width, type: WidthType.DXA },
                verticalAlign: VerticalAlignTable.CENTER,
                verticalMerge,
                margins: { top: 80, bottom: 80, left: 108, right: 108 },
                children: [
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new ImageRun({
                                data: image.data,
                                type: image.type,
                                transformation: {
                                    width: 72,
                                    height: 72,
                                },
                                altText: {
                                    title: item.productName ?? 'Product image',
                                    description: item.productName ?? 'Product image',
                                    name: item.productName ?? 'Product image',
                                },
                            }),
                        ],
                    }),
                ],
            })
        }

        const headerRow = new TableRow({
            children: templateHeaders.map((header, index) =>
                tableTextCell(header, {
                    bold: true,
                    width: columnWidths[index],
                    shading: true,
                    size: header === 'S.N' ? 20 : 22,
                })
            ),
        })

        const groupedItems = Array.from(
            items.reduce((groups, item) => {
                const key = `${item.productName ?? ''}__${item.imageUrl ?? ''}`
                const group = groups.get(key) ?? []
                group.push(item)
                groups.set(key, group)
                return groups
            }, new Map<string, ExportItem[]>()).values()
        )

        const groupedRows = await Promise.all(
            groupedItems.map(async (group, index) => {
                const firstItem = group[0]
                return Promise.all(group.map(async (item, itemIndex) => {
                    const isFirstVariant = itemIndex === 0
                    const verticalMerge = isFirstVariant
                        ? VerticalMergeType.RESTART
                        : VerticalMergeType.CONTINUE
                    const description = item.description?.trim() ?? ''
                    const attributes = formatAttributes(item.attributes)
                    const descriptionText = [description, attributes].filter(Boolean).join(', ') || '-'
                    const price = String(item.price ?? '').trim()
                    const formattedPrice = price
                        ? price.toLowerCase().startsWith('rs') || price === '-'
                            ? price
                            : `Rs.${price}`
                        : '-'

                    const cells = [
                        tableTextCell(isFirstVariant ? `${index + 1}.` : '', {
                            width: columnWidths[0],
                            verticalMerge,
                        }),
                        fields.includes('image')
                            ? await tableImageCell(
                                isFirstVariant ? firstItem : {},
                                columnWidths[1],
                                verticalMerge
                            )
                            : tableTextCell('', { width: columnWidths[1], verticalMerge }),
                        tableTextCell(
                            isFirstVariant && fields.includes('name')
                                ? (firstItem.productName ?? '')
                                : '',
                            {
                                width: columnWidths[2],
                                verticalMerge,
                            }
                        ),
                        tableTextCell(fields.includes('description') ? descriptionText : '', {
                            width: columnWidths[3],
                        }),
                        tableTextCell(fields.includes('price') ? formattedPrice : '', {
                            width: columnWidths[4],
                        }),
                    ]

                    return new TableRow({ children: cells })
                }))
            })
        )
        const dataRows = groupedRows.flat()

        const table = new Table({
            width: { size: 9665, type: WidthType.DXA },
            columnWidths,
            layout: TableLayoutType.FIXED,
            alignment: AlignmentType.CENTER,
            borders: cellBorder,
            rows: [headerRow, ...dataRows],
        })
        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: {
                            font: TEMPLATE_FONT,
                            size: 22,
                        },
                    },
                },
            },
            sections: [
                {
                    headers: { default: emptyHeader() },
                    footers: { default: emptyFooter() },
                    properties: {
                        page: {
                            margin: {
                                top: 720,
                                right: 720,
                                bottom: 720,
                                left: 720,
                                header: 288,
                                footer: 288,
                            },
                        },
                    },
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            spacing: { before: 0, after: 120 },
                            children: [textRun(quotationDate, { size: 22 })],
                        }),
                        paragraph('To,', { alignment: AlignmentType.LEFT }),
                        paragraph(customerName, { alignment: AlignmentType.LEFT }),
                        paragraph(customerAddress, { alignment: AlignmentType.LEFT }),
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 160, after: 180 },
                            children: [
                                new TextRun({
                                    text: quotationTitle,
                                    bold: true,
                                    font: 'Calibri',
                                    size: 24,
                                }),
                            ],
                        }),
                        table,
                        new Paragraph({
                            spacing: { before: 240, after: 160 },
                            children: [textRun('PRICES ARE INCLUSIVE OF 13% VAT', { bold: true, size: 22 })],
                        }),
                        paragraph(
                            'Disclaimer: Due to current fluctuations in pricing of raw material and stock availability, prices and stock mentioned in this quotation are subject to confirmation before order finalization.',
                            { size: 20 }
                        ),
                        paragraph(
                            'कच्चा पदार्थको मूल्य तथा स्टक उपलब्धतामा हाल भइरहेको उतार–चढावका कारण, बजार स्थिर नभएसम्म यस quotation मा उल्लेखित मूल्य आजको दिनका लागि मात्र मान्य हुनेछ। भोलि वा सोपश्चात् अर्डर पुष्टि गर्नु अघि कृपया स्टोरमा सम्पर्क गरी मूल्य तथा स्टक पुनः पुष्टि गर्नुहुन अनुरोध गरिन्छ।',
                            { size: 20 }
                        ),
                    ],
                },
            ],
        })

        const buffer = await patchTemplateHeaderFooter(await Packer.toBuffer(doc))
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

        const x = doc.page.margins.left
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
