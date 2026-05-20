import { readFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { requireApiSuperAdmin } from "@/lib/auth";
import { getImportImageContentType, getProductImportImagePath } from "@/lib/product-import";

export async function GET(req: NextRequest) {
    const auth = await requireApiSuperAdmin();
    if (auth.response) return auth.response;

    const sessionId = req.nextUrl.searchParams.get("sessionId") ?? "";
    const fileName = req.nextUrl.searchParams.get("file") ?? "";

    if (!/^[a-zA-Z0-9-]+$/.test(sessionId) || !fileName) {
        return NextResponse.json({ error: "Invalid import image." }, { status: 400 });
    }

    try {
        const filePath = getProductImportImagePath(sessionId, fileName);
        const image = await readFile(filePath);

        return new NextResponse(image, {
            headers: {
                "Content-Type": getImportImageContentType(filePath),
                "Cache-Control": "no-store",
            },
        });
    } catch {
        return NextResponse.json({ error: "Import image not found." }, { status: 404 });
    }
}
