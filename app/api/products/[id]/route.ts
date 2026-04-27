import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    const product = await prisma.product.findUnique({
        where: { id },
    });

    if (!product) {
        return NextResponse.json(
            { error: "product not found" },
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

    const updated = await prisma.product.update({
        where: { id },
        data: body,
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

    return Response.json({ success: true });
}