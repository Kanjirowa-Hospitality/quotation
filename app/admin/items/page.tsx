"use client";

import { useQuery } from "@tanstack/react-query";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type SaleOptionRow = {
    id: string;
    description: string | null;
    price: number;
    attributes: Record<string, unknown> | null;
    product: {
        name: string;
        imageUrl: string | null;
        category?: {
            name: string;
        } | null;
    };
};

function formatAttributes(attributes: Record<string, unknown> | null) {
    if (!attributes || Object.keys(attributes).length === 0) return "-";

    return Object.entries(attributes)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(", ");
}

export default function AdminItemsPage() {
    const { data, isLoading } = useQuery<SaleOptionRow[]>({
        queryKey: ["items"],
        queryFn: () => fetch("/api/items").then((r) => r.json()),
    });

    return (
        <div className="flex min-h-0 flex-col gap-3 md:h-full md:overflow-hidden">
            <div className="shrink-0">
                <h2 className="text-xl font-semibold">Sale Options</h2>
                <p className="text-sm text-muted-foreground">
                    Prices grouped under product variants
                </p>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-background">
                <Table className="min-w-[760px]">
                    <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:shadow-[inset_0_-1px_0_0_var(--border)]">
                        <TableRow>
                            <TableHead>Image</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Variant</TableHead>
                            <TableHead>Specs / Sale Basis</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {isLoading && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Loading sale options...
                                </TableCell>
                            </TableRow>
                        )}

                        {!isLoading && data?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No sale options found.
                                </TableCell>
                            </TableRow>
                        )}

                        {data?.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>
                                    <img
                                        src={row.product.imageUrl || "/placeholder.svg"}
                                        alt={row.product.name}
                                        className="h-12 w-12 rounded object-cover"
                                    />
                                </TableCell>
                                <TableCell className="font-medium">{row.product.name}</TableCell>
                                <TableCell>{row.product.category?.name || "-"}</TableCell>
                                <TableCell>{row.description || "-"}</TableCell>
                                <TableCell className="max-w-md whitespace-normal">
                                    {formatAttributes(row.attributes)}
                                </TableCell>
                                <TableCell className="text-right font-semibold">Rs. {row.price}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
