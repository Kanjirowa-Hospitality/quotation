import { NextResponse } from "next/server";
import { QuotationFileType } from "@/app/generated/prisma/enums";
import { requireApiAdmin } from "@/lib/auth";
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

export async function GET(req: Request) {
    const auth = await requireApiAdmin();
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type")?.trim();
    const where = type && quotationFileTypes.has(type) ? { type: type as QuotationFileType } : {};

    const files = await prisma.quotationFile.findMany({
        where,
        orderBy: [{ type: "asc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json(files);
}

export async function POST(req: Request) {
    const auth = await requireApiAdmin();
    if (auth.response) return auth.response;

    const body = await req.json();
    const payload = getPayload(body);

    if ("error" in payload) {
        return NextResponse.json({ error: payload.error }, { status: 400 });
    }

    const file = await prisma.quotationFile.create({
        data: payload.data,
    });

    return NextResponse.json(file, { status: 201 });
}
