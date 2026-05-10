import { NextResponse } from "next/server";
import { createProductImportSession } from "@/lib/product-import";

export async function POST(req: Request) {
    try {
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
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Could not read the Excel file." },
            { status: 500 }
        );
    }
}
