import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { variantAttributes } from '@/lib/product-response'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize')

    const where: any = {}
    if (search) {
        where.variant = {
            OR: [
                { description: { contains: search, mode: 'insensitive' } },
                { product: { name: { contains: search, mode: 'insensitive' } } },
            ],
        }
    }
    if (category) {
        where.variant = {
            ...where.variant,
            product: {
                ...where.variant?.product,
                category: { slug: category },
            },
        }
    }

    const include = {
        variant: {
            include: {
                product: {
                    include: {
                        category: true,
                    },
                },
            },
        },
    }

    const mapSaleOption = (saleOption: any) => ({
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
                include,
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
        include,
        orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(items.map(mapSaleOption))
}
