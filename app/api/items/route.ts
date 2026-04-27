import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''

    const where: any = {}
    if (search) {
        where.product = { name: { contains: search, mode: 'insensitive' } }
    }
    if (category) {
        where.product = { ...where.product, category: { slug: category } }
    }

    const items = await prisma.item.findMany({
        where,
        include: { product: { include: { category: true } } },
        orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(items)
}