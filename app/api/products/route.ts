import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ✅ GET ALL PRODUCTS
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");

    const products = await prisma.product.findMany({
        where: categoryId ? { categoryId } : {}, // ✅ FILTER HERE
        include: {
            category: true,
            items: true,
        },
        orderBy: { name: "asc" },
    });

    return NextResponse.json(products);
}

// ✅ CREATE PRODUCT + ITEMS
export async function POST(req: Request) {
    const body = await req.json();

    const { name, categoryId, imageUrl, items } = body;

    const product = await prisma.product.create({
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

    return NextResponse.json(product);
}