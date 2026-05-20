import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withFlattenedItems } from "@/lib/product-response";
import { getValidationError, productPayloadSchema } from "@/lib/validation/product";
import type { Prisma } from "@/app/generated/prisma/client";

type ProductVariantInput = {
    description?: string | null;
    weight?: string | null;
    size?: string | null;
    color?: string | null;
    attributes?: Prisma.InputJsonValue;
    saleOptions?: {
        price: number;
        unit?: string | null;
        quantity?: string | null;
        attributes?: Prisma.InputJsonValue;
    }[];
};

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requireApiAdmin();
    if (auth.response) return auth.response;

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
    const auth = await requireApiAdmin();
    if (auth.response) return auth.response;

    const { id } = await context.params;
    const body = await req.json();
    const rawVariants = body.variants ?? (body.items ?? []).map((item: {
        description?: string | null;
        attributes?: Prisma.InputJsonValue;
        price: number;
        unit?: string | null;
    }) => ({
        description: item.description,
        attributes: item.attributes || {},
        saleOptions: [{
            price: item.price,
            unit: item.unit || "unit",
        }],
    }));
    const result = productPayloadSchema.safeParse({ ...body, variants: rawVariants });

    if (!result.success) {
        return NextResponse.json({ error: getValidationError(result.error) }, { status: 400 });
    }

    const { name, categoryId, imageUrl, variants } = result.data;
    const variantInput: ProductVariantInput[] = variants;

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
                create: variantInput.map((variant) => ({
                    description: variant.description,
                    weight: variant.weight || null,
                    size: variant.size || null,
                    color: variant.color || null,
                    attributes: variant.attributes || {},
                    saleOptions: {
                        create: (variant.saleOptions ?? []).map((option) => ({
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
    const auth = await requireApiAdmin();
    if (auth.response) return auth.response;

    const { id } = await context.params;

    await prisma.product.delete({
        where: { id },
    });

    return NextResponse.json({ success: true });
}
