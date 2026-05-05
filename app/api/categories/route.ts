import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const cats = await prisma.category.findMany({
        include: {
            products: {
                include: {
                    items: true,
                },
            },
        },
        orderBy: { name: 'asc' },
    })
    return NextResponse.json(cats)
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const { name, slug, description, imageUrl } = body;

        console.log(name, slug, description, imageUrl)
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
    } catch (err) {
        return NextResponse.json(
            { error: "Something went wrong", details: err },
            { status: 500 }
        );
    }
}

export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    const body = await req.json();

    const updated = await prisma.category.update({
        where: { id: params.id },
        data: body,
    });

    return Response.json(updated);
}
