import { NextResponse } from 'next/server'
import { requireApiAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withFlattenedItems } from '@/lib/product-response'
import type { Prisma } from '@/app/generated/prisma/client'

export async function GET(req: Request) {
    const auth = await requireApiAdmin()
    if (auth.response) return auth.response

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim() || ''
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize')
    const where: Prisma.CategoryWhereInput = search
        ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ],
        }
        : {}

    if (pageParam) {
        const page = Math.max(Number(pageParam) || 1, 1)
        const pageSize = Math.min(Math.max(Number(pageSizeParam) || 20, 1), 100)
        const [cats, total] = await Promise.all([
            prisma.category.findMany({
                include: {
                    _count: {
                        select: {
                            products: true,
                        },
                    },
                },
                orderBy: { name: 'asc' },
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.category.count({ where }),
        ])

        return NextResponse.json({
            data: cats,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.max(Math.ceil(total / pageSize), 1),
            },
        })
    }

    const cats = await prisma.category.findMany({
        where,
        include: {
            products: {
                include: {
                    variants: {
                        include: {
                            saleOptions: true,
                        },
                    },
                },
            },
        },
        orderBy: { name: 'asc' },
    })
    return NextResponse.json(cats.map((cat) => ({
        ...cat,
        products: cat.products.map(withFlattenedItems),
    })))
}

export async function POST(req: Request) {
    try {
        const auth = await requireApiAdmin();
        if (auth.response) return auth.response;

        const body = await req.json();

        const { name, slug, description, imageUrl } = body;

        // basic validation
        if (!name || !slug) {
            return NextResponse.json(
                { error: "Name and slug are required" },
                { status: 400 }
            );
        }

        const category = await prisma.category.create({
            data: {
                name,
                slug,
                description,
                imageUrl,
            },
        });

        return NextResponse.json(category, { status: 201 });
    } catch {
        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}

