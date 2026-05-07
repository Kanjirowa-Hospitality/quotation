import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize')

    const where: any = {}
    if (search) {
        where.product = { name: { contains: search, mode: 'insensitive' } }
    }
    if (category) {
        where.product = { ...where.product, category: { slug: category } }
    }

    if (pageParam) {
        const page = Math.max(Number(pageParam) || 1, 1)
        const pageSize = Math.min(Math.max(Number(pageSizeParam) || 25, 1), 100)
        const [items, total] = await Promise.all([
            prisma.item.findMany({
                where,
                include: { product: { include: { category: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.item.count({ where }),
        ])

        return NextResponse.json({
            data: items,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.max(Math.ceil(total / pageSize), 1),
            },
        })
    }

    const items = await prisma.item.findMany({
        where,
        include: { product: { include: { category: true } } },
        orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(items)
}
