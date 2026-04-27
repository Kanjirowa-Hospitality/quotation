import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const cats = await prisma.product.findMany({ select: { id: true, category: true, imageUrl: true, name: true, updatedAt: true }, orderBy: { name: 'asc' } })
    return NextResponse.json(cats)
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const { name, categoryId, imageUrl } = body;

        // basic validation
        if (!name || !categoryId || !imageUrl) {
            return NextResponse.json(
                { error: "Name and slug are required" },
                { status: 400 }
            );
        }

        const category = await prisma.product.create({
            data: {
                name,
                categoryId,
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

export async function PUT(req: Request, { params }: any) {
    const body = await req.json();

    const updated = await prisma.product.update({
        where: { id: params.id },
        data: body,
    });

    return Response.json(updated);
}
