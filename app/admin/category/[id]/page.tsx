"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PaginationControls, PaginationMeta } from "@/components/pagination-controls";
import { SearchBar } from "@/components/search-bar";
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { CartItem, useCart } from "@/lib/store/cart";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Check, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";

type ProductItem = {
    id: string;
    description: string | null;
    price: number;
    attributes: Record<string, unknown> | null;
};

type CategoryProduct = {
    id: string;
    name: string;
    imageUrl: string | null;
    category?: {
        name: string;
    } | null;
    items?: ProductItem[];
};

type PaginatedProducts = {
    data: CategoryProduct[];
    pagination: PaginationMeta;
};

const PAGE_SIZE = 20;

function getProductCartItems(product: CategoryProduct): CartItem[] {
    return (product.items ?? []).map((item) => ({
        itemId: item.id,
        productName: product.name,
        price: item.price,
        description: item.description ?? undefined,
        imageUrl: product.imageUrl ?? undefined,
        attributes: item.attributes,
    }));
}

function getPriceRange(items: ProductItem[] = []) {
    if (items.length === 0) return "-";

    const prices = items.map((item) => item.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return min === max ? `Rs. ${min}` : `Rs. ${min} - ${max}`;
}

function formatAttributes(attributes: Record<string, unknown> | null) {
    if (!attributes || Object.keys(attributes).length === 0) return "-";

    return Object.entries(attributes)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(", ");
}

export default function CategoryDetailPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});
    const debouncedSearch = useDebouncedValue(search);
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const queryClient = useQueryClient();
    const cartItems = useCart((state) => state.items);
    const add = useCart((state) => state.add);
    const isSelecting = useCart((state) => state.isSelecting);
    const selectedItems = useCart((state) => state.selectedItems);
    const toggleSelection = useCart((state) => state.toggleSelection);
    const toggleSelectionGroup = useCart((state) => state.toggleSelectionGroup);

    useEffect(() => {
        setPage(1);
        setExpandedProductIds({});
    }, [debouncedSearch]);

    const { data, isLoading, isFetching } = useQuery<PaginatedProducts>({
        queryKey: ["category-products", id, page, debouncedSearch],
        queryFn: () => {
            const params = new URLSearchParams({
                categoryId: id,
                page: String(page),
                pageSize: String(PAGE_SIZE),
            });

            if (debouncedSearch) params.set("search", debouncedSearch);

            return fetch(`/api/products?${params.toString()}`).then((r) => r.json());
        },
    });

    const cartItemIds = useMemo(
        () => new Set(cartItems.map((item) => item.itemId)),
        [cartItems]
    );
    const products = data?.data ?? [];
    const categoryName = products[0]?.category?.name;
    const productCount = data?.pagination.total ?? 0;
    const saleOptionCount = products.reduce((total, product) => total + (product.items?.length ?? 0), 0);

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await fetch(`/api/products/${id}`, {
                method: "DELETE",
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
            queryClient.invalidateQueries({ queryKey: ["category-products", id] });
        },
    });

    const toggleExpanded = (productId: string) => {
        setExpandedProductIds((current) => ({
            ...current,
            [productId]: !current[productId],
        }));
    };

    return (
        <div className="flex min-h-0 flex-col gap-4 md:h-[calc(100vh-10rem)] md:overflow-hidden">
            <div className="shrink-0 rounded-md border bg-background p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold">
                            {categoryName || "Category"}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {productCount} products - {saleOptionCount} sale options on this page
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <SearchBar
                            value={search}
                            onChange={setSearch}
                            placeholder="Search this category..."
                        />
                        {isFetching && !isLoading && (
                            <span className="text-sm text-muted-foreground">Searching...</span>
                        )}
                    </div>

                    <Button className="w-full sm:w-auto" onClick={() => router.push("/admin/products/new")}>
                        New Product
                    </Button>
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

                        {!isLoading && products.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={isSelecting ? 7 : 6} className="h-24 text-center">
                                    No products found.
                                </TableCell>
                            </TableRow>
                        )}

                        {products.map((product) => {
                            const productCartItems = getProductCartItems(product);
                            const hasItems = productCartItems.length > 0;
                            const isExpanded = Boolean(expandedProductIds[product.id]);
                            const isProductSelected =
                                hasItems && productCartItems.every((item) => selectedItems[item.itemId]);

                            return (
                                <Fragment key={product.id}>
                                    <TableRow
                                        key={product.id}
                                        data-state={isProductSelected ? "selected" : undefined}
                                        className="cursor-pointer"
                                        onClick={() => toggleExpanded(product.id)}
                                    >
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={`${isExpanded ? "Hide" : "View"} ${product.name} sale options`}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    toggleExpanded(product.id);
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

                                    {isExpanded && (
                                        <TableRow key={`${product.id}-items`} className="hover:bg-transparent">
                                            <TableCell colSpan={isSelecting ? 7 : 6} className="bg-muted/30 p-0">
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
