"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePriceInput } from "@/lib/validation/product";

type ImportRow = {
    id: string;
    rowNumber: number;
    serialNumber: string;
    imageUrl: string;
    categoryName: string;
    productName: string;
    description: string;
    color: string;
    weight: string;
    size: string;
    brand: string;
    unit: string;
    price: number | null;
    warnings: string[];
};

type ImportSession = {
    id: string;
    originalFileName: string;
    rows: ImportRow[];
};

type ImportResult = {
    importedRows: number;
    createdCategories: number;
    createdProducts: number;
    createdVariants: number;
    createdSaleOptions: number;
};

function hasBlockingWarnings(row: ImportRow) {
    return !row.categoryName.trim() || !row.productName.trim() || row.price === null;
}

function getRowWarnings(row: ImportRow) {
    const warnings = row.warnings.filter(
        (warning) => !["Missing category", "Missing product name", "Invalid price"].includes(warning)
    );

    if (!row.categoryName.trim()) warnings.unshift("Missing category");
    if (!row.productName.trim()) warnings.unshift("Missing product name");
    if (row.price === null) warnings.unshift("Invalid price");

    return warnings;
}

export default function ProductImportPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [session, setSession] = useState<ImportSession | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const blockingRows = session?.rows.filter(hasBlockingWarnings) ?? [];
    const warningCount = session?.rows.reduce((total, row) => total + getRowWarnings(row).length, 0) ?? 0;
    const loadingMessage = isUploading
        ? "Reading Excel file and extracting images..."
        : isImporting
            ? "Uploading images to Cloudinary and saving products..."
            : "";

    const updateRow = (rowId: string, patch: Partial<ImportRow>) => {
        setSession((current) =>
            current
                ? {
                    ...current,
                    rows: current.rows.map((row) =>
                        row.id === rowId ? { ...row, ...patch } : row
                    ),
                }
                : current
        );
    };

    const uploadFile = async (file: File) => {
        setError("");
        setResult(null);
        setIsUploading(true);

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/products/import/upload", {
            method: "POST",
            body: formData,
        });
        const data = await res.json();

        setIsUploading(false);

        if (!res.ok) {
            setError(data.error ?? "Could not upload file.");
            return;
        }

        setSession(data);
    };

    const confirmImport = async () => {
        if (!session) return;

        setError("");
        setIsImporting(true);

        const res = await fetch("/api/products/import/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: session.id, rows: session.rows }),
        });
        const data = await res.json();

        setIsImporting(false);

        if (!res.ok) {
            setError(data.error ?? "Could not import products.");
            return;
        }

        setResult(data);
    };

    return (
        <div className="relative flex min-h-0 w-full max-w-full flex-col gap-4 overflow-hidden md:h-[calc(100vh-10rem)]">
            {loadingMessage && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm">
                    <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-md border bg-background p-5 text-center shadow-lg">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <div>
                            <p className="font-medium">{loadingMessage}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Keep this page open until the process finishes.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="min-w-0 shrink-0 rounded-md border bg-background p-4 shadow-sm">
                <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <h2 className="text-xl font-semibold">Import Products</h2>
                        <p className="text-sm text-muted-foreground">
                            Upload an Excel file, edit the extracted rows if needed, then confirm.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx"
                            className="hidden"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) uploadFile(file);
                            }}
                        />
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || isImporting}
                        >
                            {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                            {isUploading ? "Reading..." : "Upload Excel"}
                        </Button>
                        <Button
                            className="w-full sm:w-auto"
                            onClick={confirmImport}
                            disabled={!session || blockingRows.length > 0 || isImporting || Boolean(result)}
                        >
                            {isImporting ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                            {isImporting ? "Importing..." : "Confirm Import"}
                        </Button>
                        <Button variant="ghost" className="w-full sm:w-auto" onClick={() => router.back()}>
                            Cancel
                        </Button>
                    </div>
                </div>

                {session && (
                    <div className="mt-4 flex flex-wrap gap-2 text-sm">
                        <span className="max-w-full truncate rounded-md bg-muted px-2 py-1 sm:max-w-96">
                            {session.originalFileName}
                        </span>
                        <span className="rounded-md bg-muted px-2 py-1">
                            {session.rows.length} rows
                        </span>
                        <span className="rounded-md bg-muted px-2 py-1">
                            {warningCount} warnings
                        </span>
                    </div>
                )}

                {error && (
                    <div className="mt-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        <AlertTriangle size={16} />
                        {error}
                    </div>
                )}

                {result && (
                    <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                        Imported {result.importedRows} rows. Created {result.createdCategories} categories,{" "}
                        {result.createdProducts} products, {result.createdVariants} variants, and{" "}
                        {result.createdSaleOptions} sale options.
                    </div>
                )}
            </div>

            <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-md border">
                {!session && (
                    <div className="flex h-full min-h-80 flex-col items-center justify-center gap-3 p-6 text-center">
                        <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                        <div>
                            <p className="font-medium">No file uploaded yet</p>
                            <p className="text-sm text-muted-foreground">
                                The preview table will appear here before anything is saved.
                            </p>
                        </div>
                    </div>
                )}

                {session && (
                    <table className="w-[1320px] caption-bottom table-fixed text-xs">
                        <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:shadow-[inset_0_-1px_0_0_var(--border)]">
                            <TableRow>
                                <TableHead className="w-16">S.N</TableHead>
                                <TableHead className="w-56">Image</TableHead>
                                <TableHead className="w-36">Category</TableHead>
                                <TableHead className="w-44">Product</TableHead>
                                <TableHead className="w-56">Description</TableHead>
                                <TableHead className="w-24">Color</TableHead>
                                <TableHead className="w-24">Weight</TableHead>
                                <TableHead className="w-24">Size</TableHead>
                                <TableHead className="w-28">Brand</TableHead>
                                <TableHead className="w-24">Unit</TableHead>
                                <TableHead className="w-28 text-right">Price</TableHead>
                                <TableHead className="w-40">Warnings</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {session.rows.map((row) => (
                                <TableRow key={row.id} data-state={hasBlockingWarnings(row) ? "selected" : undefined}>
                                    <TableCell className="align-top">
                                        <Input
                                            value={row.serialNumber}
                                            onChange={(event) => updateRow(row.id, { serialNumber: event.target.value })}
                                            className="h-8 w-full min-w-0 text-xs"
                                        />
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <div className="flex items-center gap-2">
                                            {row.imageUrl ? (
                                                <img
                                                    src={row.imageUrl}
                                                    alt={row.productName || "Imported product"}
                                                    className="h-12 w-12 shrink-0 rounded object-cover"
                                                />
                                            ) : (
                                                <div className="h-12 w-12 shrink-0 rounded bg-muted" />
                                            )}
                                            <Input
                                                value={row.imageUrl}
                                                onChange={(event) => updateRow(row.id, { imageUrl: event.target.value })}
                                                placeholder="Image URL"
                                                className="h-8 min-w-0 flex-1 text-xs"
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <Input
                                            value={row.categoryName}
                                            onChange={(event) => updateRow(row.id, { categoryName: event.target.value })}
                                            className="h-8 w-full min-w-0 text-xs"
                                        />
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <Input
                                            value={row.productName}
                                            onChange={(event) => updateRow(row.id, { productName: event.target.value })}
                                            className="h-8 w-full min-w-0 text-xs"
                                        />
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <Input
                                            value={row.description}
                                            onChange={(event) => updateRow(row.id, { description: event.target.value })}
                                            className="h-8 w-full min-w-0 text-xs"
                                        />
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <Input
                                            value={row.color}
                                            onChange={(event) => updateRow(row.id, { color: event.target.value })}
                                            className="h-8 w-full min-w-0 text-xs"
                                        />
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <Input
                                            value={row.weight}
                                            onChange={(event) => updateRow(row.id, { weight: event.target.value })}
                                            className="h-8 w-full min-w-0 text-xs"
                                        />
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <Input
                                            value={row.size}
                                            onChange={(event) => updateRow(row.id, { size: event.target.value })}
                                            className="h-8 w-full min-w-0 text-xs"
                                        />
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <Input
                                            value={row.brand}
                                            onChange={(event) => updateRow(row.id, { brand: event.target.value })}
                                            className="h-8 w-full min-w-0 text-xs"
                                        />
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <Input
                                            value={row.unit}
                                            onChange={(event) => updateRow(row.id, { unit: event.target.value })}
                                            className="h-8 w-full min-w-0 text-xs"
                                        />
                                    </TableCell>
                                    <TableCell className="align-top text-right font-semibold">
                                        <Input
                                            value={row.price ?? ""}
                                            inputMode="decimal"
                                            onChange={(event) => {
                                                const price = parsePriceInput(event.target.value);
                                                updateRow(row.id, {
                                                    price,
                                                });
                                            }}
                                            className="ml-auto h-8 w-full min-w-0 text-right text-xs"
                                        />
                                    </TableCell>
                                    <TableCell className="whitespace-normal break-words align-top leading-5">
                                        {getRowWarnings(row).length ? (
                                            <span className="text-amber-700">{getRowWarnings(row).join(", ")}</span>
                                        ) : (
                                            <span className="text-muted-foreground">OK</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </table>
                )}
            </div>
        </div>
    );
}
