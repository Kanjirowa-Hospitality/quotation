import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    const category = await prisma.category.findUnique({
        where: { id },
    });

    if (!category) {
        return NextResponse.json(
            { error: "Category not found" },
            { status: 404 }
        );
    }

    return NextResponse.json(category);
}

export async function PUT(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const body = await req.json();

    const updated = await prisma.category.update({
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

    await prisma.category.delete({
        where: { id },
    });

    return Response.json({ success: true });
}