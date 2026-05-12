import { NextResponse } from "next/server";
import { requireApiSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    deleteProductImportRoot,
    ProductImportRow,
    readProductImportSession,
    slugifyImportValue,
    uploadImportImagesToCloudinary,
} from "@/lib/product-import";
import { importPriceSchema } from "@/lib/validation/product";

type ImportBody = {
    sessionId?: string;
    rows?: ProductImportRow[];
};

export async function POST(req: Request) {
    try {
        const auth = await requireApiSuperAdmin();
        if (auth.response) return auth.response;

        const body = (await req.json()) as ImportBody;
        const sessionId = body.sessionId?.trim();

        if (!sessionId || !/^[a-zA-Z0-9-]+$/.test(sessionId)) {
            return NextResponse.json({ error: "Valid import session id is required." }, { status: 400 });
        }

        const session = await readProductImportSession(sessionId);
        const rows = body.rows?.length ? body.rows : session.rows;
        const normalizedRows = rows.map((row) => {
            const price = importPriceSchema.safeParse(row.price);

            return {
                ...row,
                categoryName: row.categoryName.trim(),
                productName: row.productName.trim(),
                description: row.description.trim(),
                color: row.color.trim(),
                weight: row.weight.trim(),
                size: row.size.trim(),
                brand: row.brand.trim(),
                unit: row.unit.trim() || "unit",
                price: price.success ? price.data : null,
            };
        });
        const blockingRows = normalizedRows.filter(
            (row) => !row.categoryName || !row.productName || row.price === null
        );

        if (blockingRows.length) {
            return NextResponse.json(
                {
                    error: "Fix required row errors before importing.",
                    rows: blockingRows.map((row) => ({
                        rowNumber: row.rowNumber,
                        warnings: row.warnings,
                    })),
                },
                { status: 400 }
            );
        }

        const rowsWithCloudinaryImages = await uploadImportImagesToCloudinary(sessionId, normalizedRows);

        const result = await prisma.$transaction(async (tx) => {
            let createdCategories = 0;
            let createdProducts = 0;
            let createdVariants = 0;
            let createdSaleOptions = 0;
            const categoryIds = new Map<string, string>();
            const productIds = new Map<string, string>();

            for (const row of rowsWithCloudinaryImages) {
                const categorySlug = slugifyImportValue(row.categoryName);
                let categoryId = categoryIds.get(categorySlug);

                if (!categoryId) {
                    const existingCategory = await tx.category.findUnique({
                        where: { slug: categorySlug },
                        select: { id: true, imageUrl: true },
                    });

                    if (existingCategory) {
                        categoryId = existingCategory.id;
                    } else {
                        const category = await tx.category.create({
                            data: {
                                name: row.categoryName,
                                slug: categorySlug,
                                imageUrl: row.imageUrl || null,
                            },
                            select: { id: true },
                        });

                        categoryId = category.id;
                        createdCategories += 1;
                    }

                    categoryIds.set(categorySlug, categoryId);
                }

                if (row.imageUrl) {
                    await tx.category.updateMany({
                        where: {
                            id: categoryId,
                            OR: [{ imageUrl: null }, { imageUrl: "" }],
                        },
                        data: { imageUrl: row.imageUrl },
                    });
                }

                const productKey = `${categoryId}:${row.productName.toLowerCase()}`;
                let productId = productIds.get(productKey);

                if (!productId) {
                    const existingProduct = await tx.product.findFirst({
                        where: {
                            categoryId,
                            name: { equals: row.productName, mode: "insensitive" },
                        },
                        select: { id: true },
                    });

                    if (existingProduct) {
                        productId = existingProduct.id;
                    } else {
                        const product = await tx.product.create({
                            data: {
                                name: row.productName,
                                categoryId,
                                imageUrl: row.imageUrl || null,
                            },
                            select: { id: true },
                        });

                        productId = product.id;
                        createdProducts += 1;
                    }

                    productIds.set(productKey, productId);
                }

                if (row.imageUrl) {
                    await tx.product.updateMany({
                        where: {
                            id: productId,
                            OR: [{ imageUrl: null }, { imageUrl: "" }],
                        },
                        data: { imageUrl: row.imageUrl },
                    });
                }

                const variant = await tx.productVariant.create({
                    data: {
                        productId,
                        description: row.description || null,
                        weight: row.weight || null,
                        size: row.size || null,
                        color: row.color || null,
                        attributes: row.brand ? { brand: row.brand } : {},
                    },
                    select: { id: true },
                });

                createdVariants += 1;

                await tx.saleOption.create({
                    data: {
                        variantId: variant.id,
                        unit: row.unit || "unit",
                        price: row.price ?? 0,
                        attributes: {},
                    },
                });

                createdSaleOptions += 1;
            }

            return {
                importedRows: rowsWithCloudinaryImages.length,
                createdCategories,
                createdProducts,
                createdVariants,
                createdSaleOptions,
            };
        });

        await deleteProductImportRoot();

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Could not import products." },
            { status: 500 }
        );
    }
}
