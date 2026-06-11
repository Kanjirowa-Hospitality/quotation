"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { CartItem, useCart } from "@/lib/store/cart";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2, Pencil } from "lucide-react";

type CategoryItem = {
    id: string;
    description: string | null;
    price: number;
    attributes: Record<string, unknown> | null;
};

type CategoryProduct = {
    id: string;
    category?: {
        id?: string;
        name: string;
    } | null;
};

type AdminCategory = {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    _count?: {
        products: number;
    };
    products?: CategoryProduct[];
};

type PaginatedCategories = {
    data: AdminCategory[];
    pagination: PaginationMeta;
};

const PAGE_SIZE = 20;

export default function AdminCategoriesPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<Record<string, boolean>>({});
    const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
    const debouncedSearch = useDebouncedValue(search);
    const router = useRouter();
    const queryClient = useQueryClient();
    const isSelecting = useCart((state) => state.isSelecting);
    const toggleSelectionGroup = useCart((state) => state.toggleSelectionGroup);

    const { data, isLoading, isFetching } = useQuery<PaginatedCategories>({
        queryKey: ["categories", page, debouncedSearch],
        queryFn: () => {
            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(PAGE_SIZE),
            });

            if (debouncedSearch) params.set("search", debouncedSearch);

            return fetch(`/api/categories?${params.toString()}`).then((r) => r.json());
        },
        placeholderData: keepPreviousData,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/categories/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] });
        },
        onSettled: () => {
            setDeletingCategoryId(null);
        },
    });

    const handleDelete = (id: string) => {
        const confirmDelete = confirm("Are you sure you want to delete this category?");
        if (!confirmDelete) return;

        setDeletingCategoryId(id);
        deleteMutation.mutate(id);
    };

    const handleCategorySelection = async (cat: AdminCategory) => {
        const res = await fetch(`/api/products?categoryId=${cat.id}`);
        const products: Array<{
            name: string;
            imageUrl: string | null;
            category?: {
                id?: string;
                name: string;
            } | null;
            items?: CategoryItem[];
        }> = await res.json();
        const categoryCartItems: CartItem[] = products.flatMap((product) =>
            (product.items ?? []).map((item) => ({
                itemId: item.id,
                productName: product.name,
                categoryId: product.category?.id ?? cat.id,
                categoryName: product.category?.name ?? cat.name,
                price: item.price,
                description: item.description ?? undefined,
                imageUrl: product.imageUrl ?? undefined,
                attributes: item.attributes,
            }))
        );

        toggleSelectionGroup(categoryCartItems);
        setSelectedCategoryIds((current) => ({
            ...current,
            [cat.id]: !current[cat.id],
        }));
    };

    return (
        <div className="flex min-h-0 flex-col gap-3 md:h-full md:overflow-hidden">
            <div className="shrink-0 rounded-md border bg-background p-3 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold">Categories</h2>
                        <p className="text-sm text-muted-foreground">
                            {data?.pagination.total ?? 0} categories
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <SearchBar
                            value={search}
                            onChange={(value) => {
                                setSearch(value);
                                setPage(1);
                            }}
                            placeholder="Search categories, slugs, descriptions..."
                        />
                        {isFetching && !isLoading && (
                            <span className="text-sm text-muted-foreground">Searching...</span>
                        )}
                    </div>

                    <Button className="w-full sm:w-auto" onClick={() => router.push("/admin/category/new")}>
                        New Category
                    </Button>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                <table className="min-w-[760px] w-full caption-bottom text-xs">
                    <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:shadow-[inset_0_-1px_0_0_var(--border)]">
                        <TableRow>
                            {isSelecting && <TableHead className="w-10">Select</TableHead>}
                            <TableHead className="w-16">Image</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Products</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow>
                                <TableCell colSpan={isSelecting ? 6 : 5} className="h-24 text-center">
                                    Loading categories...
                                </TableCell>
                            </TableRow>
                        )}

                        {!isLoading && data?.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={isSelecting ? 6 : 5} className="h-24 text-center">
                                    No categories found.
                                </TableCell>
                            </TableRow>
                        )}

                        {data?.data.map((cat) => {
                            const isDeleting = deletingCategoryId === cat.id && deleteMutation.isPending;
                            const productCount = cat._count?.products ?? cat.products?.length ?? 0;
                            const hasItems = productCount > 0;
                            const isCategorySelected = Boolean(selectedCategoryIds[cat.id]);

                            return (
                                <TableRow
                                    key={cat.id}
                                    onClick={async () => {
                                        if (isSelecting) {
                                            await handleCategorySelection(cat);
                                            return;
                                        }

                                        router.push(`/admin/category/${cat.id}`);
                                    }}
                                    data-state={isCategorySelected ? "selected" : undefined}
                                    className="cursor-pointer"
                                >
                                    {isSelecting && (
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={isCategorySelected}
                                                disabled={!hasItems}
                                                aria-label={`Select all ${cat.name} sale options`}
                                                onCheckedChange={() => handleCategorySelection(cat)}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <img
                                            src={cat.imageUrl || "/placeholder.svg"}
                                            alt={cat.name}
                                            className="h-12 w-12 rounded object-cover"
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium whitespace-normal">{cat.name}</TableCell>
                                    <TableCell className="max-w-lg whitespace-normal text-muted-foreground">
                                        {cat.description || "-"}
                                    </TableCell>
                                    <TableCell className="text-right">{productCount}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="cursor-pointer"
                                                aria-label={`Edit ${cat.name}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/admin/category/${cat.id}/edit`);
                                                }}
                                            >
                                                <Pencil className="cursor-pointer text-yellow-500" />
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="cursor-pointer"
                                                aria-label={`Delete ${cat.name}`}
                                                aria-busy={isDeleting}
                                                disabled={isDeleting}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(cat.id);
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
