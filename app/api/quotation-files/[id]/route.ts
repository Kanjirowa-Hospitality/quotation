import { NextResponse } from "next/server";
import { QuotationFileType } from "@/app/generated/prisma/enums";
import { requireApiAdmin } from "@/lib/auth";
import { deleteCloudinaryAsset } from "@/lib/cloudinary-server";
import { prisma } from "@/lib/prisma";

const quotationFileTypes = new Set<string>(Object.values(QuotationFileType));

function normalizeText(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function getPayload(body: Record<string, unknown>) {
    const type = normalizeText(body.type);
    const title = normalizeText(body.title);
    const fileUrl = normalizeText(body.fileUrl);
    const cloudinaryPublicId = normalizeText(body.cloudinaryPublicId) || null;
    const cloudinaryResource = normalizeText(body.cloudinaryResource) || null;
    const originalFilename = normalizeText(body.originalFilename) || null;
    const notes = normalizeText(body.notes) || null;

    if (!quotationFileTypes.has(type)) {
        return { error: "Select a valid file type." };
    }

    if (!title || !fileUrl) {
        return { error: "Title and uploaded file are required." };
    }

    return {
        data: {
            type: type as QuotationFileType,
            title,
            fileUrl,
            cloudinaryPublicId,
            cloudinaryResource,
            originalFilename,
            notes,
        },
    };
}

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const file = await prisma.quotationFile.findUnique({ where: { id } });

    if (!file) {
        return NextResponse.json({ error: "Quotation file not found." }, { status: 404 });
    }

    return NextResponse.json(file);
}

export async function PUT(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requireApiAdmin();
    if (auth.response) return auth.response;

    const { id } = await context.params;
    const existing = await prisma.quotationFile.findUnique({ where: { id } });

    if (!existing) {
        return NextResponse.json({ error: "Quotation file not found." }, { status: 404 });
    }

    const body = await req.json();
    const payload = getPayload(body);

    if ("error" in payload) {
        return NextResponse.json({ error: payload.error }, { status: 400 });
    }

    const file = await prisma.quotationFile.update({
        where: { id },
        data: payload.data,
    });

    if (
        existing.cloudinaryPublicId &&
        existing.cloudinaryPublicId !== payload.data.cloudinaryPublicId
    ) {
        await deleteCloudinaryAsset({
            publicId: existing.cloudinaryPublicId,
            resourceType: existing.cloudinaryResource,
        }).catch(() => undefined);
    }

    return NextResponse.json(file);
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requireApiAdmin();
    if (auth.response) return auth.response;

    const { id } = await context.params;
    const existing = await prisma.quotationFile.findUnique({ where: { id } });

    if (!existing) {
        return NextResponse.json({ error: "Quotation file not found." }, { status: 404 });
    }

    await prisma.quotationFile.delete({ where: { id } });

    await deleteCloudinaryAsset({
        publicId: existing.cloudinaryPublicId,
        resourceType: existing.cloudinaryResource,
    }).catch(() => undefined);

    return NextResponse.json({ success: true });
}
