"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchBar } from "@/components/search-bar";
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { PaginationControls, PaginationMeta } from "@/components/pagination-controls";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCart, CartItem } from "@/lib/store/cart";
import { Trash2, Pencil, Upload } from "lucide-react";

type ProductItem = {
    id: string;
    description: string | null;
    price: number;
    attributes: Record<string, unknown> | null;
};

type AdminProduct = {
    id: string;
    name: string;
    imageUrl: string | null;
    category?: {
        name: string;
    } | null;
    items?: ProductItem[];
};

type PaginatedProducts = {
    data: AdminProduct[];
    pagination: PaginationMeta;
};

const PAGE_SIZE = 20;

function getPriceRange(items: ProductItem[] = []) {
    if (items.length === 0) return "-";

    const prices = items.map((item) => item.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return min === max ? `Rs. ${min}` : `Rs. ${min} - ${max}`;
}

export default function AdminProductsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search);
    const router = useRouter();
    const queryClient = useQueryClient();
    const isSelecting = useCart((state) => state.isSelecting);
    const selectedItems = useCart((state) => state.selectedItems);
    const toggleSelectionGroup = useCart((state) => state.toggleSelectionGroup);

    const { data, isLoading, isFetching } = useQuery<PaginatedProducts>({
        queryKey: ["admin-products", page, debouncedSearch],
        queryFn: () => {
            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(PAGE_SIZE),
            });

            if (debouncedSearch) params.set("search", debouncedSearch);

            return fetch(`/api/products?${params.toString()}`).then((r) => r.json());
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await fetch(`/api/products/${id}`, {
                method: "DELETE",
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        },
    });

    return (
        <div className="flex min-h-0 flex-col gap-4 md:h-[calc(100vh-10rem)] md:overflow-hidden">
            <div className="shrink-0 rounded-md border bg-background p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">Products</h2>
                        <p className="text-sm text-muted-foreground">
                            {data?.pagination.total ?? 0} products
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <SearchBar
                            value={search}
                            onChange={(value) => {
                                setSearch(value);
                                setPage(1);
                            }}
                            placeholder="Search products, categories, descriptions..."
                        />
                        {isFetching && !isLoading && (
                            <span className="text-sm text-muted-foreground">Searching...</span>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() => router.push("/admin/products/import")}
                        >
                            <Upload size={16} />
                            Import
                        </Button>
                        <Button className="w-full sm:w-auto" onClick={() => router.push("/admin/products/new")}>
                            New Product
                        </Button>
                    </div>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                <table className="min-w-[780px] w-full caption-bottom text-xs">
                    <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:shadow-[inset_0_-1px_0_0_var(--border)]">
                        <TableRow>
                            {isSelecting && <TableHead className="w-10">Select</TableHead>}
                            <TableHead className="w-16">Image</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Sale Options</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow>
                                <TableCell colSpan={isSelecting ? 7 : 6} className="h-24 text-center">
                                    Loading products...
                                </TableCell>
                            </TableRow>
                        )}

                        {!isLoading && data?.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={isSelecting ? 7 : 6} className="h-24 text-center">
                                    No products found.
                                </TableCell>
                            </TableRow>
                        )}

                        {data?.data.map((product) => {
                            const productCartItems: CartItem[] = (product.items ?? []).map((item) => ({
                                itemId: item.id,
                                productName: product.name,
                                price: item.price,
                                description: item.description ?? undefined,
                                imageUrl: product.imageUrl ?? undefined,
                                attributes: item.attributes,
                            }));
                            const hasItems = productCartItems.length > 0;
                            const isProductSelected =
                                hasItems && productCartItems.every((item) => selectedItems[item.itemId]);

                            return (
                                <TableRow
                                    key={product.id}
                                    onClick={() => {
                                        if (isSelecting) toggleSelectionGroup(productCartItems);
                                    }}
                                    data-state={isProductSelected ? "selected" : undefined}
                                    className={isSelecting && hasItems ? "cursor-pointer" : undefined}
                                >
                                    {isSelecting && (
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={isProductSelected}
                                                disabled={!hasItems}
                                                aria-label={`Select all ${product.name} sale options`}
                                                onCheckedChange={() => toggleSelectionGroup(productCartItems)}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <img
                                            src={product.imageUrl || "/placeholder.png"}
                                            alt={product.name}
                                            className="h-12 w-12 rounded object-cover"
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium whitespace-normal">
                                        {product.name}
                                    </TableCell>
                                    <TableCell>{product.category?.name || "-"}</TableCell>
                                    <TableCell className="text-right">{product.items?.length ?? 0}</TableCell>
                                    <TableCell className="text-right font-semibold">
                                        {getPriceRange(product.items)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="cursor-pointer"
                                                aria-label={`Edit ${product.name}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/admin/products/${product.id}`);
                                                }}
                                            >
                                                <Pencil className="cursor-pointer text-yellow-500" />
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="cursor-pointer"
                                                aria-label={`Delete ${product.name}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!confirm("Delete this product?")) return;
                                                    deleteMutation.mutate(product.id);
                                                }}
                                            >
                                                <Trash2 className="cursor-pointer text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </table>
            </div>

            <div className="shrink-0 rounded-md border bg-background px-4 py-3 shadow-sm">
                <PaginationControls pagination={data?.pagination} onPageChange={setPage} />
            </div>
        </div>
    );
}
