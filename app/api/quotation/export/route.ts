import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import PDFDocument from 'pdfkit'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { requireApiAdmin } from '@/lib/auth'
import { getValidationError, quotationExportSchema } from '@/lib/validation/product'
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

const HEADER_IMAGE_PATH = join(process.cwd(), 'app', 'api', 'quotation', 'export', 'assets', 'header.png')
const FOOTER_IMAGE_PATH = join(process.cwd(), 'app', 'api', 'quotation', 'export', 'assets', 'footer.png')
const DOCX_HEADER_FOOTER_TEMPLATE_PATH =
    process.env.QUOTATION_TEMPLATE_DOCX_PATH
    ?? join(process.cwd(), 'app', 'api', 'quotation', 'export', 'assets', 'quotation-header-footer-template.docx')
const PDF_FONT_REGULAR_PATH = join(process.cwd(), 'app', 'api', 'quotation', 'export', 'assets', 'trebuc.ttf')
const PDF_FONT_BOLD_PATH = join(process.cwd(), 'app', 'api', 'quotation', 'export', 'assets', 'trebucbd.ttf')
const PDF_FONT_DEVANAGARI_PATH = join(process.cwd(), 'app', 'api', 'quotation', 'export', 'assets', 'nirmala-text.ttf')
const TEMPLATE_FONT = 'Trebuchet MS'
let docxHeaderFooterTemplatePromise: Promise<JSZip | null> | null = null
let headerImagePromise: Promise<Buffer | null> | null = null
let footerImagePromise: Promise<Buffer | null> | null = null

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

async function getHeaderImage() {
    if (!headerImagePromise) {
        headerImagePromise = readFile(HEADER_IMAGE_PATH).catch(() => null)
    }

    return headerImagePromise
}

async function getFooterImage() {
    if (!footerImagePromise) {
        footerImagePromise = readFile(FOOTER_IMAGE_PATH).catch(() => null)
    }

    return footerImagePromise
}

async function getDocxHeaderFooterTemplate() {
    if (!docxHeaderFooterTemplatePromise) {
        docxHeaderFooterTemplatePromise = readFile(DOCX_HEADER_FOOTER_TEMPLATE_PATH)
            .then((file) => JSZip.loadAsync(file))
            .catch(() => null)
    }

    return docxHeaderFooterTemplatePromise
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

function attributeValue(attributes: Record<string, unknown> | null | undefined, key: string) {
    const value = attributes?.[key]
    return value === undefined || value === null ? '' : String(value).trim()
}

function normalizeDetail(value: string) {
    return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function uniqueDetails(values: string[]) {
    const seen = new Set<string>()
    return values.filter((value) => {
        const cleanValue = value.trim()
        const key = normalizeDetail(cleanValue)
        if (!cleanValue || seen.has(key)) return false
        seen.add(key)
        return true
    })
}

function formatDescriptionDetails(item: ExportItem) {
    const standardKeys = new Set(['size', 'weight', 'color', 'unit', 'quantity'])
    const extraAttributes = Object.entries(item.attributes ?? {})
        .filter(([key, value]) => !standardKeys.has(key) && value !== undefined && value !== null)
        .map(([, value]) => String(value).trim())

    return uniqueDetails([
        item.description?.trim() ?? '',
        attributeValue(item.attributes, 'size'),
        attributeValue(item.attributes, 'weight'),
        attributeValue(item.attributes, 'color'),
        ...extraAttributes,
    ]).join(', ') || '-'
}

function formatUnit(item: ExportItem) {
    const unit = attributeValue(item.attributes, 'unit')
    const quantity = attributeValue(item.attributes, 'quantity')
    const shouldShowQuantity = quantity && !['1', '1.0', '1.00'].includes(quantity)

    if (unit && shouldShowQuantity) return `${unit} (${quantity})`
    return unit || quantity || '-'
}

function descriptionMergeFor(group: ExportItem[], itemIndex: number) {
    const current = formatDescriptionDetails(group[itemIndex])
    const previous = itemIndex > 0 ? formatDescriptionDetails(group[itemIndex - 1]) : null
    const next = itemIndex < group.length - 1 ? formatDescriptionDetails(group[itemIndex + 1]) : null

    if (previous === current) return VerticalMergeType.CONTINUE
    if (next === current) return VerticalMergeType.RESTART
    return undefined
}

function formatPrice(priceValue?: number | string) {
    const price = String(priceValue ?? '').trim()
    if (!price) return '-'
    return price.toLowerCase().startsWith('rs') || price === '-' ? price : `Rs.${price}`
}

function formatExcelPrice(priceValue?: number | string) {
    const price = String(priceValue ?? '').replace(/^rs\.?\s*/i, '').trim()
    const parsed = Number(price.replace(/,/g, ''))
    return Number.isFinite(parsed) ? parsed : price
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

async function documentHeader() {
    const headerImage = await getHeaderImage()

    return new Header({
        children: [
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: headerImage
                    ? [
                        new ImageRun({
                            data: headerImage,
                            type: 'png',
                            transformation: { width: 520, height: 74 },
                            altText: {
                                title: 'Kanjirowa',
                                description: 'Kanjirowa header',
                                name: 'Kanjirowa',
                            },
                        }),
                    ]
                    : [textRun('Kanjirowa', { bold: true, size: 28 })],
            }),
        ],
    })
}

async function documentFooter() {
    const footerImage = await getFooterImage()

    return new Footer({
        children: [
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: footerImage
                    ? [
                        new ImageRun({
                            data: footerImage,
                            type: 'png',
                            transformation: { width: 520, height: 103 },
                            altText: {
                                title: 'Kanjirowa contact details',
                                description: 'Kanjirowa footer',
                                name: 'Kanjirowa footer',
                            },
                        }),
                    ]
                    : [
                        textRun(
                            'Butwal SMC-11, Kalikanagar,Rupandehi | +977-9802769737|38|41 | teamkanjirowa@gmail.com | www.kanjirowahospitality.com',
                            { size: 16, color: '666666' }
                        ),
                    ],
            }),
        ],
    })
}

async function patchDocxHeaderFooterFromTemplate(buffer: Buffer) {
    const template = await getDocxHeaderFooterTemplate()
    if (!template) return buffer

    const generated = await JSZip.loadAsync(buffer)
    const filesToCopy = [
        'word/header1.xml',
        'word/footer1.xml',
        'word/_rels/header1.xml.rels',
        'word/_rels/footer1.xml.rels',
    ]

    await Promise.all(
        filesToCopy.map(async (path) => {
            const file = template.file(path)
            if (!file) return
            generated.file(path, await file.async('uint8array'))
        })
    )

    const mediaFiles = template.file(/^word\/media\/image\d+\.png$/)
    await Promise.all(
        mediaFiles.map(async (file) => {
            const filename = file.name.replace('word/media/', '')
            generated.file(`word/media/template-${filename}`, await file.async('uint8array'))
        })
    )

    for (const relsPath of ['word/_rels/header1.xml.rels', 'word/_rels/footer1.xml.rels']) {
        const relsFile = generated.file(relsPath)
        if (!relsFile) continue

        const rels = await relsFile.async('string')
        generated.file(
            relsPath,
            rels.replace(/Target="media\/(image\d+\.png)"/g, 'Target="media/template-$1"')
        )
    }

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

function pdfTextHeight(doc: PDFKit.PDFDocument, text: string, width: number, fontSize = 9) {
    doc.fontSize(fontSize)
    return doc.heightOfString(text || '-', { width })
}

function registerPdfFonts(doc: PDFKit.PDFDocument) {
    const regular = existsSync(PDF_FONT_REGULAR_PATH) ? PDF_FONT_REGULAR_PATH : 'Helvetica'
    const bold = existsSync(PDF_FONT_BOLD_PATH) ? PDF_FONT_BOLD_PATH : 'Helvetica-Bold'
    const devanagari = existsSync(PDF_FONT_DEVANAGARI_PATH) ? PDF_FONT_DEVANAGARI_PATH : regular

    if (regular !== 'Helvetica') doc.registerFont('QuotationRegular', regular)
    if (bold !== 'Helvetica-Bold') doc.registerFont('QuotationBold', bold)
    if (devanagari !== regular) doc.registerFont('QuotationDevanagari', devanagari)

    return {
        regular: regular === 'Helvetica' ? 'Helvetica' : 'QuotationRegular',
        bold: bold === 'Helvetica-Bold' ? 'Helvetica-Bold' : 'QuotationBold',
        devanagari: devanagari === regular ? (regular === 'Helvetica' ? 'Helvetica' : 'QuotationRegular') : 'QuotationDevanagari',
    }
}

function drawPdfHeaderFooter(doc: PDFKit.PDFDocument, headerImage: Buffer | null, footerImage: Buffer | null) {
    const { width, height, margins } = doc.page
    const assetX = 36
    const assetWidth = width - 72

    doc.save()
    if (headerImage) {
        doc.image(headerImage, assetX, 14.4, { width: assetWidth })
    } else {
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#081833').text('Kanjirowa', margins.left, 32, {
            align: 'center',
            width: width - margins.left - margins.right,
        })
    }

    if (footerImage) {
        doc.image(footerImage, assetX, height - 112, { width: assetWidth - 6 })
    } else {
        doc.font('Helvetica').fontSize(9).fillColor('#222222').text(
            'Butwal SMC-11, Kalikanagar,Rupandehi | +977-9802769737|38|41 | teamkanjirowa@gmail.com | www.kanjirowahospitality.com',
            margins.left,
            height - 48,
            { align: 'center', width: width - margins.left - margins.right }
        )
    }
    doc.restore()
    doc.fillColor('#000000').strokeColor('#000000')
}

async function buildPdfBuffer({
    items,
    fields,
    quotationDate,
    customerName,
    customerAddress,
    quotationTitle,
}: {
    items: ExportItem[]
    fields: ExportField[]
    quotationDate: string
    customerName: string
    customerAddress: string
    quotationTitle: string
}) {
    const [headerImage, footerImage] = await Promise.all([getHeaderImage(), getFooterImage()])
    const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 118, right: 56, bottom: 122, left: 56 },
        bufferPages: true,
    })
    const pdfFonts = registerPdfFonts(doc)
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    const finished = new Promise<Buffer>((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)
    })

    const startPage = () => {
        drawPdfHeaderFooter(doc, headerImage, footerImage)
        doc.y = 124
    }

    startPage()
    doc.font(pdfFonts.regular).fontSize(9.95).text(quotationDate, 56, 123.6, {
        align: 'right',
        width: 483.3,
    })
    doc.y = 142
    doc.font(pdfFonts.regular).fontSize(9.95)
    doc.text('To,')
    doc.text(customerName)
    doc.text(customerAddress)
    doc.y = 193.2
    doc.font(pdfFonts.bold).fontSize(12).text(quotationTitle, 56, doc.y, {
        align: 'center',
        width: 483.3,
    })
    doc.y = 215.05

    const columns = [
        { label: 'S.N', width: 30.35 },
        { label: 'Image', width: 70 },
        { label: 'Name', width: 72.5 },
        { label: 'Description', width: 165 },
        { label: 'Unit', width: 55 },
        { label: 'Price', width: 90.5 },
    ]
    const tableX = doc.page.margins.left
    const drawCell = (text: string, x: number, y: number, width: number, height: number, options: { bold?: boolean; fill?: string; align?: 'left' | 'center' | 'right'; fontSize?: number } = {}) => {
        if (options.fill) {
            doc.rect(x, y, width, height).fillAndStroke(options.fill, '#000000')
            doc.fillColor('#000000')
        } else {
            doc.rect(x, y, width, height).stroke()
        }
        doc.font(options.bold ? pdfFonts.bold : pdfFonts.regular).fontSize(options.fontSize ?? 9.95).text(text || '-', x + 3, y + 7,
            {
                width: width - 6,
                align: options.align ?? 'center',
            })
    }
    const drawHeaderRow = () => {
        let x = tableX
        const y = doc.y
        columns.forEach((column) => {
            drawCell(column.label, x, y, column.width, 21.25, { bold: true, fill: '#e7e6e6', fontSize: column.label === 'S.N' ? 9 : 9.95 })
            x += column.width
        })
        doc.y = y + 21.25
    }
    const ensureSpace = (height: number, repeatTableHeader = false) => {
        if (doc.y + height > doc.page.height - doc.page.margins.bottom - 8) {
            doc.addPage()
            startPage()
            if (repeatTableHeader) {
                drawHeaderRow()
            }
        }
    }

    drawHeaderRow()

    for (let index = 0; index < items.length; index += 1) {
        const item = items[index]
        const description = fields.includes('description') ? formatDescriptionDetails(item) : ''
        const name = fields.includes('name') ? (item.productName ?? '') : ''
        const unit = formatUnit(item)
        const price = fields.includes('price') ? formatPrice(item.price) : ''
        const rowHeight = Math.max(
            21.25,
            fields.includes('image') ? 62.5 : 0,
            pdfTextHeight(doc, name, columns[2].width - 6, 9.95),
            pdfTextHeight(doc, description, columns[3].width - 6, 9.95),
            pdfTextHeight(doc, unit, columns[4].width - 6, 9.95),
            pdfTextHeight(doc, price, columns[5].width - 6, 9.95)
        ) + 8
        ensureSpace(rowHeight, true)

        let x = tableX
        const y = doc.y
        drawCell(`${index + 1}.`, x, y, columns[0].width, rowHeight)
        x += columns[0].width
        doc.rect(x, y, columns[1].width, rowHeight).stroke()
        if (fields.includes('image')) {
            const image = await fetchExportImage(item.imageUrl)
            if (image) {
                try {
                    doc.image(Buffer.from(image.data), x + 7, y + 7, { fit: [44, rowHeight - 14], align: 'center', valign: 'center' })
                } catch {
                    doc.font(pdfFonts.regular).fontSize(7).text(item.imageUrl ?? '', x + 4, y + 6, { width: columns[1].width - 8 })
                }
            }
        }
        x += columns[1].width
        drawCell(name, x, y, columns[2].width, rowHeight)
        x += columns[2].width
        drawCell(description, x, y, columns[3].width, rowHeight, { align: 'left' })
        x += columns[3].width
        drawCell(unit, x, y, columns[4].width, rowHeight)
        x += columns[4].width
        drawCell(price, x, y, columns[5].width, rowHeight)
        doc.y = y + rowHeight
    }

    doc.moveDown(1)
    ensureSpace(96)
    doc.x = doc.page.margins.left
    doc.font(pdfFonts.bold).fontSize(10).text('PRICES ARE EXCLUSIVE OF 13% VAT', doc.page.margins.left, doc.y, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: 'left',
    })
    doc.moveDown(0.6)
    doc.font(pdfFonts.regular).fontSize(9).text(
        'Disclaimer: Due to current fluctuations in pricing of raw material and stock availability, prices and stock mentioned in this quotation are subject to confirmation before order finalization.',
        doc.page.margins.left,
        doc.y,
        {
            align: 'left',
            width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        }
    )
    doc.moveDown(0.6)
    doc.font(pdfFonts.devanagari).fontSize(9).text(
        'कच्चा पदार्थको मूल्य तथा स्टक उपलब्धतामा हाल भइरहेको उतार–चढावका कारण, बजार स्थिर नभएसम्म यस quotation मा उल्लेखित मूल्य आजको दिनका लागि मात्र मान्य हुनेछ। भोलि वा सोपश्चात् अर्डर पुष्टि गर्नु अघि कृपया स्टोरमा सम्पर्क गरी मूल्य तथा स्टक पुनः पुष्टि गर्नुहुन अनुरोध गरिन्छ।',
        doc.page.margins.left,
        doc.y,
        {
            align: 'left',
            width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        }
    )

    doc.end()
    return finished
}

// ---------------------------------------------------------------------------
// POST /api/quotation/export  (or wherever this route lives)
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
    const auth = await requireApiAdmin()
    if (auth.response) return auth.response

    const result = quotationExportSchema.safeParse(await req.json())

    if (!result.success) {
        return NextResponse.json({ error: getValidationError(result.error) }, { status: 400 })
    }

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
    } = result.data
    const quotationDate = meta?.quotationDate?.trim() || '2083/1/21'
    const customerName = meta?.customerName?.trim() || 'Intercontinential Pokhara Resort'
    const customerAddress = meta?.customerAddress?.trim() || 'Begnas Lake, Pachbhaiva- 31, Pokhara'
    const quotationTitle = meta?.quotationTitle?.trim() || 'Kible Quotation 2083'

    const excelHeaders = ['S.N', 'Product', 'Description', 'Unit', 'Price']
    const excelRows: Record<string, string | number>[] = items.map((item, index) => ({
        'S.N': String(index + 1),
        Product: item.productName ?? '',
        Description: formatDescriptionDetails(item),
        Unit: formatUnit(item),
        Price: formatExcelPrice(item.price),
    }))

    // ---------- Excel ----------
    if (format === 'excel') {
        const ws = XLSX.utils.json_to_sheet(excelRows, { header: excelHeaders })
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Quotation')

        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer
        return fileResponse(
            buffer,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'quotation.xlsx',
        )
    }

    const buildWordBuffer = async () => {
        const templateHeaders = ['S.N', 'Image', 'Name', 'Description', 'Unit', 'Price']
        const columnWidths = [606, 1400, 1450, 3300, 1100, 1809]
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
                    const descriptionText = formatDescriptionDetails(item)
                    const descriptionMerge = descriptionMergeFor(group, itemIndex)
                    const unitText = formatUnit(item)
                    const formattedPrice = formatPrice(item.price)

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
                        tableTextCell(fields.includes('description') && descriptionMerge !== VerticalMergeType.CONTINUE ? descriptionText : '', {
                            width: columnWidths[3],
                            verticalMerge: descriptionMerge,
                        }),
                        tableTextCell(unitText, {
                            width: columnWidths[4],
                        }),
                        tableTextCell(fields.includes('price') ? formattedPrice : '', {
                            width: columnWidths[5],
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
                    headers: { default: await documentHeader() },
                    footers: { default: await documentFooter() },
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
                            children: [textRun('PRICES ARE EXCLUSIVE OF 13% VAT', { bold: true, size: 22 })],
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

        return patchDocxHeaderFooterFromTemplate(await Packer.toBuffer(doc))
    }

    // ---------- Word ----------
    if (format === 'word') {
        const buffer = await buildWordBuffer()
        return fileResponse(
            buffer,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'quotation.docx',
        )
    }

    // ---------- PDF ----------
    if (format === 'pdf') {
        const buffer = await buildPdfBuffer({
            items,
            fields,
            quotationDate,
            customerName,
            customerAddress,
            quotationTitle,
        })
        return fileResponse(buffer, 'application/pdf', 'quotation.pdf')
    }

    return NextResponse.json({ error: 'Bad format. Use excel | word | pdf.' }, { status: 400 })
}
