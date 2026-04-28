import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ✅ GET ONE PRODUCT (WITH ITEMS)
export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    const product = await prisma.product.findUnique({
        where: { id },
        include: {
            category: true,
            items: true, // ✅ IMPORTANT
        },
    });

    if (!product) {
        return NextResponse.json(
            { error: "Product not found" },
            { status: 404 }
        );
    }

    return NextResponse.json(product);
}


export async function PUT(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const body = await req.json();

    const { name, categoryId, imageUrl, items } = body;

    // 1. delete existing items
    await prisma.item.deleteMany({
        where: { productId: id },
    });

    // 2. recreate items
    const updated = await prisma.product.update({
        where: { id },
        data: {
            name,
            categoryId,
            imageUrl,
            items: {
                create: items.map((item: any) => ({
                    price: item.price,
                    description: item.description,
                    attributes: item.attributes || {},
                })),
            },
        },
        include: {
            items: true,
            category: true,
        },
    });

    return NextResponse.json(updated);
}


export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    await prisma.product.delete({
        where: { id },
    });

    return NextResponse.json({ success: true });
}