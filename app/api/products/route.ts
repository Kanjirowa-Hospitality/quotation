import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withFlattenedItems } from "@/lib/product-response";

// ✅ GET ALL PRODUCTS
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search")?.trim() || "";
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");
    const where: any = {
        ...(categoryId ? { categoryId } : {}),
        ...(search
            ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { category: { name: { contains: search, mode: "insensitive" } } },
                    { variants: { some: { description: { contains: search, mode: "insensitive" } } } },
                    { variants: { some: { size: { contains: search, mode: "insensitive" } } } },
                    { variants: { some: { weight: { contains: search, mode: "insensitive" } } } },
                ],
            }
            : {}),
    };

    if (pageParam) {
        const page = Math.max(Number(pageParam) || 1, 1);
        const pageSize = Math.min(Math.max(Number(pageSizeParam) || 20, 1), 100);
        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    category: true,
                    variants: {
                        include: {
                            saleOptions: true,
                        },
                    },
                },
                orderBy: { name: "asc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.product.count({ where }),
        ]);

        return NextResponse.json({
            data: products.map(withFlattenedItems),
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.max(Math.ceil(total / pageSize), 1),
            },
        });
    }

    const products = await prisma.product.findMany({
        where,
        include: {
            category: true,
            variants: {
                include: {
                    saleOptions: true,
                },
            },
        },
        orderBy: { name: "asc" },
    });

    return NextResponse.json(products.map(withFlattenedItems));
}

// ✅ CREATE PRODUCT + ITEMS
export async function POST(req: Request) {
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

    const product = await prisma.product.create({
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

    return NextResponse.json(withFlattenedItems(product));
}
