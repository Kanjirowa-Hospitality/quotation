"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CartItem, useCart } from "@/lib/store/cart";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Trash2, Pencil } from "lucide-react";

type CategoryItem = {
    id: string;
    description: string | null;
    price: number;
    attributes: Record<string, unknown> | null;
};

type CategoryProduct = {
    id: string;
    name: string;
    imageUrl: string | null;
    items?: CategoryItem[];
};

type AdminCategory = {
    id: string;
    name: string;
    imageUrl: string | null;
    products?: CategoryProduct[];
};

export default function AdminCategoriesPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const isSelecting = useCart((state) => state.isSelecting);
    const selectedItems = useCart((state) => state.selectedItems);
    const toggleSelectionGroup = useCart((state) => state.toggleSelectionGroup);

    const { data } = useQuery<AdminCategory[]>({
        queryKey: ["categories"],
        queryFn: () => fetch("/api/categories").then((r) => r.json()),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/categories/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete");
        },
        onSuccess: () => {
            // refresh categories
            queryClient.invalidateQueries({ queryKey: ["categories"] });
        },
    });

    const handleDelete = (id: string) => {
        const confirmDelete = confirm("Are you sure you want to delete this category?");
        if (!confirmDelete) return;

        deleteMutation.mutate(id);
    };


    return (
        <div className="p-6 space-y-6">
            {/* HEADER */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Categories</h2>

                <Button onClick={() => router.push("/admin/category/new")}>
                    New Category
                </Button>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {data?.map((cat) => {
                    const categoryCartItems: CartItem[] = (cat.products ?? []).flatMap((product) =>
                        (product.items ?? []).map((item) => ({
                            itemId: item.id,
                            productName: product.name,
                            price: item.price,
                            description: item.description ?? undefined,
                            imageUrl: product.imageUrl ?? undefined,
                            attributes: item.attributes,
                        }))
                    );
                    const hasItems = categoryCartItems.length > 0;
                    const isCategorySelected =
                        hasItems && categoryCartItems.every((item) => selectedItems[item.itemId]);

                    return (
                        <div
                            key={cat.id}
                            onClick={() => {
                                if (isSelecting) {
                                    toggleSelectionGroup(categoryCartItems);
                                    return;
                                }

                                router.push(`/admin/category/${cat.id}`);
                            }}
                            className={cn(
                                "relative group h-40 rounded-xl overflow-hidden shadow-md cursor-pointer",
                                isSelecting && hasItems && "ring-2 ring-primary/30 ring-offset-2",
                                isCategorySelected && "ring-2 ring-primary ring-offset-2"
                            )}
                        >
                            {/* BACKGROUND IMAGE */}
                            <img
                                src={cat.imageUrl || "/placeholder.png"}
                                alt={cat.name}
                                className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                            />

                            {/* DARK OVERLAY */}
                            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" />

                            {isSelecting && (
                                <div
                                    className="absolute right-3 top-3 rounded-lg border border-primary/50 bg-white p-2 shadow-md"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Checkbox
                                        checked={isCategorySelected}
                                        disabled={!hasItems}
                                        aria-label={`Select all ${cat.name} products`}
                                        onCheckedChange={() => toggleSelectionGroup(categoryCartItems)}
                                    />
                                </div>
                            )}

                            {/* CONTENT */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
                                <h3 className="text-white font-semibold text-lg">
                                    {cat.name}
                                </h3>

                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(cat.id);
                                        }}

                                        className="p-2 bg-white/10 hover:bg-red-500/80 rounded-md backdrop-blur cursor-pointer"
                                    >
                                        <Trash2 size={16} className="text-white " />
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/admin/category/${cat.id}/edit`);
                                        }}
                                        className="p-2 bg-white/10 hover:bg-yellow-500/80 rounded-md backdrop-blur cursor-pointer"
                                    >
                                        <Pencil size={16} className="text-white" />
                                    </button>
                                </div>

                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
