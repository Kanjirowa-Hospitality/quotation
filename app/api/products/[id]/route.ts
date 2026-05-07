import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withFlattenedItems } from "@/lib/product-response";

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    const product = await prisma.product.findUnique({
        where: { id },
        include: {
            category: true,
            variants: {
                include: {
                    saleOptions: true,
                },
            },
        },
    });

    if (!product) {
        return NextResponse.json(
            { error: "Product not found" },
            { status: 404 }
        );
    }

    return NextResponse.json(withFlattenedItems(product));
}

export async function PUT(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const body = await req.json();

    const { name, categoryId, imageUrl, items, variants } = body;
    const variantInput = variants ?? (items ?? []).map((item: any) => ({
        description: item.description,
        attributes: item.attributes || {},
        saleOptions: [{
            price: item.price,
            unit: item.unit || "unit",
        }],
    }));

    await prisma.productVariant.deleteMany({
        where: { productId: id },
    });

    const updated = await prisma.product.update({
        where: { id },
        data: {
            name,
            categoryId,
            imageUrl,
            variants: {
                create: variantInput.map((variant: any) => ({
                    description: variant.description,
                    weight: variant.weight || null,
                    size: variant.size || null,
                    color: variant.color || null,
                    attributes: variant.attributes || {},
                    saleOptions: {
                        create: (variant.saleOptions ?? []).map((option: any) => ({
                            price: option.price,
                            unit: option.unit || "unit",
                            quantity: option.quantity || null,
                            attributes: option.attributes || {},
                        })),
                    },
                })),
            },
        },
        include: {
            variants: {
                include: {
                    saleOptions: true,
                },
            },
            category: true,
        },
    });

    return NextResponse.json(withFlattenedItems(updated));
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
