import { NextResponse } from "next/server";
import { requireApiSuperAdmin } from "@/lib/auth";
import { createProductImportSession } from "@/lib/product-import";

export async function POST(req: Request) {
    try {
        const auth = await requireApiSuperAdmin();
        if (auth.response) return auth.response;

        const formData = await req.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json({ error: "Excel file is required." }, { status: 400 });
        }

        if (!file.name.toLowerCase().endsWith(".xlsx")) {
            return NextResponse.json({ error: "Please upload an .xlsx Excel file." }, { status: 400 });
        }

        const session = await createProductImportSession(file);

        return NextResponse.json(session);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Could not read the Excel file.";
        const status = message.startsWith("Required field doesn't match.") ? 400 : 500;

        return NextResponse.json(
            { error: message },
            { status }
        );
    }
}
