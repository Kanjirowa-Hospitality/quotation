"use client";

import { Fragment, useMemo, useState } from "react";
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Check, ChevronDown, ChevronRight, LoaderCircle, Pencil, Plus, Trash2, Upload } from "lucide-react";

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
        id?: string;
        name: string;
    } | null;
    items?: ProductItem[];
};

type PaginatedProducts = {
    data: AdminProduct[];
    pagination: PaginationMeta;
};

type CurrentUserResponse = {
    user: {
        role: "ADMIN" | "SUPER_ADMIN";
    };
};

const PAGE_SIZE = 20;

function getPriceRange(items: ProductItem[] = []) {
    if (items.length === 0) return "-";

    const prices = items.map((item) => item.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return min === max ? `Rs. ${min}` : `Rs. ${min} - ${max}`;
}

function getProductCartItems(product: AdminProduct): CartItem[] {
    return (product.items ?? []).map((item) => ({
        itemId: item.id,
        productName: product.name,
        categoryId: product.category?.id,
        categoryName: product.category?.name,
        price: item.price,
        description: item.description ?? undefined,
        imageUrl: product.imageUrl ?? undefined,
        attributes: item.attributes,
    }));
}

function formatAttributes(attributes: Record<string, unknown> | null) {
    if (!attributes || Object.keys(attributes).length === 0) return "-";

    return Object.entries(attributes)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(", ");
}

export default function AdminProductsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});
    const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
    const debouncedSearch = useDebouncedValue(search);
    const router = useRouter();
    const queryClient = useQueryClient();
    const isSelecting = useCart((state) => state.isSelecting);
    const cartItems = useCart((state) => state.items);
    const add = useCart((state) => state.add);
    const selectedItems = useCart((state) => state.selectedItems);
    const toggleSelection = useCart((state) => state.toggleSelection);
    const toggleSelectionGroup = useCart((state) => state.toggleSelectionGroup);
    const { data: currentUser } = useQuery<CurrentUserResponse>({
        queryKey: ["current-user"],
        queryFn: () => fetch("/api/auth/me").then((r) => r.json()),
    });
    const canImport = currentUser?.user.role === "SUPER_ADMIN";
    const cartItemIds = useMemo(
        () => new Set(cartItems.map((item) => item.itemId)),
        [cartItems]
    );

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
        placeholderData: keepPreviousData,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/products/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete product");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        },
        onSettled: () => {
            setDeletingProductId(null);
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
                                setExpandedProductIds({});
                            }}
                            placeholder="Search products, categories, descriptions..."
                        />
                        {isFetching && !isLoading && (
                            <span className="text-sm text-muted-foreground">Searching...</span>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        {canImport && (
                            <Button
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => router.push("/admin/products/import")}
                            >
                                <Upload size={16} />
                                Import
                            </Button>
                        )}
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
                            <TableHead className="w-10" />
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
                                <TableCell colSpan={isSelecting ? 8 : 7} className="h-24 text-center">
                                    Loading products...
                                </TableCell>
                            </TableRow>
                        )}

                        {!isLoading && data?.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={isSelecting ? 8 : 7} className="h-24 text-center">
                                    No products found.
                                </TableCell>
                            </TableRow>
                        )}

                        {data?.data.map((product) => {
                            const isDeleting = deletingProductId === product.id && deleteMutation.isPending;
                            const productCartItems = getProductCartItems(product);
                            const hasItems = productCartItems.length > 0;
                            const isExpanded = Boolean(expandedProductIds[product.id]);
                            const isProductSelected =
                                hasItems && productCartItems.every((item) => selectedItems[item.itemId]);

                            return (
                                <Fragment key={product.id}>
                                    <TableRow
                                        data-state={isProductSelected ? "selected" : undefined}
                                        className="cursor-pointer"
                                        onClick={() =>
                                            setExpandedProductIds((current) => ({
                                                ...current,
                                                [product.id]: !current[product.id],
                                            }))
                                        }
                                    >
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={`${isExpanded ? "Hide" : "View"} ${product.name} sale options`}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setExpandedProductIds((current) => ({
                                                        ...current,
                                                        [product.id]: !current[product.id],
                                                    }));
                                                }}
                                            >
                                                {isExpanded ? <ChevronDown /> : <ChevronRight />}
                                            </Button>
                                        </TableCell>
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
                                                src={product.imageUrl || "/placeholder.svg"}
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
                                                    aria-busy={isDeleting}
                                                    disabled={isDeleting}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!confirm("Delete this product?")) return;
                                                        setDeletingProductId(product.id);
                                                        deleteMutation.mutate(product.id);
                                                    }}
                                                >
                                                    {isDeleting ? (
                                                        <LoaderCircle className="animate-spin text-red-500" />
                                                    ) : (
                                                        <Trash2 className="cursor-pointer text-red-500" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>

                                    {isExpanded && (
                                        <TableRow className="hover:bg-transparent">
                                            <TableCell colSpan={isSelecting ? 8 : 7} className="bg-muted/30 p-0">
                                                <div className="px-4 py-3">
                                                    {(product.items?.length ?? 0) === 0 ? (
                                                        <p className="text-sm text-muted-foreground">No sale options added.</p>
                                                    ) : (
                                                        <table className="min-w-[680px] w-full text-xs">
                                                            <thead>
                                                                <tr className="border-b">
                                                                    {isSelecting && <th className="w-10 py-2 text-left font-medium">Select</th>}
                                                                    <th className="py-2 text-left font-medium">Description</th>
                                                                    <th className="py-2 text-left font-medium">Specs / Sale Basis</th>
                                                                    <th className="py-2 text-right font-medium">Price</th>
                                                                    <th className="py-2 text-right font-medium">Action</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {product.items?.map((item) => {
                                                                    const cartItem: CartItem = {
                                                                        itemId: item.id,
                                                                        productName: product.name,
                                                                        categoryId: product.category?.id,
                                                                        categoryName: product.category?.name,
                                                                        price: item.price,
                                                                        description: item.description ?? undefined,
                                                                        imageUrl: product.imageUrl ?? undefined,
                                                                        attributes: item.attributes,
                                                                    };
                                                                    const isSelected = Boolean(selectedItems[item.id]);
                                                                    const isAdded = cartItemIds.has(item.id);

                                                                    return (
                                                                        <tr key={item.id} className="border-b last:border-0">
                                                                            {isSelecting && (
                                                                                <td className="py-2" onClick={(e) => e.stopPropagation()}>
                                                                                    <Checkbox
                                                                                        checked={isSelected}
                                                                                        aria-label={`Select ${product.name}`}
                                                                                        onCheckedChange={() => toggleSelection(cartItem)}
                                                                                    />
                                                                                </td>
                                                                            )}
                                                                            <td className="max-w-md py-2 pr-3 whitespace-normal text-muted-foreground">
                                                                                {item.description || product.name}
                                                                            </td>
                                                                            <td className="max-w-sm py-2 pr-3 whitespace-normal">
                                                                                {formatAttributes(item.attributes)}
                                                                            </td>
                                                                            <td className="py-2 text-right font-semibold">
                                                                                Rs. {item.price}
                                                                            </td>
                                                                            <td className="py-2 text-right">
                                                                                {isSelecting ? (
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant={isSelected ? "default" : "outline"}
                                                                                        onClick={() => toggleSelection(cartItem)}
                                                                                    >
                                                                                        <Check />
                                                                                        {isSelected ? "Selected" : "Select"}
                                                                                    </Button>
                                                                                ) : (
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant={isAdded ? "outline" : "default"}
                                                                                        disabled={isAdded}
                                                                                        onClick={() => add(cartItem)}
                                                                                    >
                                                                                        {isAdded ? <Check /> : <Plus />}
                                                                                        {isAdded ? "Added" : "Add"}
                                                                                    </Button>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
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
