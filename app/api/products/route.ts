import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
                    { items: { some: { description: { contains: search, mode: "insensitive" } } } },
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
                    items: true,
                },
                orderBy: { name: "asc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.product.count({ where }),
        ]);

        return NextResponse.json({
            data: products,
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
