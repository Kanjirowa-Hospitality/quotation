import { NextResponse } from 'next/server'
import { requireApiAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { variantAttributes } from '@/lib/product-response'
import type { Prisma } from '@/app/generated/prisma/client'

const itemInclude = {
    variant: {
        include: {
            product: {
                include: {
                    category: true,
                },
            },
        },
    },
} satisfies Prisma.SaleOptionInclude

type SaleOptionWithProduct = Prisma.SaleOptionGetPayload<{
    include: typeof itemInclude
}>

export async function GET(req: Request) {
    const auth = await requireApiAdmin()
    if (auth.response) return auth.response

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize')

    const variantFilters: Prisma.ProductVariantWhereInput[] = []
    if (search) {
        variantFilters.push({
            OR: [
                { description: { contains: search, mode: 'insensitive' } },
                { product: { name: { contains: search, mode: 'insensitive' } } },
            ],
        })
    }
    if (category) {
        variantFilters.push({ product: { category: { slug: category } } })
    }
    const where: Prisma.SaleOptionWhereInput =
        variantFilters.length > 0 ? { variant: { AND: variantFilters } } : {}

    const mapSaleOption = (saleOption: SaleOptionWithProduct) => ({
        id: saleOption.id,
        price: saleOption.price,
        description: saleOption.variant.description,
        attributes: variantAttributes(saleOption.variant, saleOption),
        product: saleOption.variant.product,
    })

    if (pageParam) {
        const page = Math.max(Number(pageParam) || 1, 1)
        const pageSize = Math.min(Math.max(Number(pageSizeParam) || 25, 1), 100)
        const [items, total] = await Promise.all([
            prisma.saleOption.findMany({
                where,
                include: itemInclude,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.saleOption.count({ where }),
        ])

        return NextResponse.json({
            data: items.map(mapSaleOption),
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.max(Math.ceil(total / pageSize), 1),
            },
        })
    }

    const items = await prisma.saleOption.findMany({
        where,
        include: itemInclude,
        orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(items.map(mapSaleOption))
}
