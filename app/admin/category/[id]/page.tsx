"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SelectableItemRow } from "@/components/selectable-item-row";
import { Pencil, Trash2 } from "lucide-react";

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

export default function CategoryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery<CategoryProduct[]>({
        queryKey: ["category-products", id],
        queryFn: () =>
            fetch(`/api/products?categoryId=${id}`).then((r) => r.json()),
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

    if (isLoading) return <div className="p-6">Loading...</div>;

    const categoryName = data?.[0]?.category?.name;
    const hasProducts = (data?.length ?? 0) > 0;

    return (
        <div className="p-6 space-y-6">
            {/* HEADER */}
            <h2 className="text-2xl font-semibold">
                {categoryName || "Category"}
            </h2>

            {/* EMPTY STATE */}
            {!hasProducts && (
                <div className="border p-10 rounded-lg text-center text-muted-foreground">
                    No products found
                </div>
            )}

            {/* PRODUCTS */}
            {data?.map((product) => (
                <div
                    key={product.id}
                    className="border rounded-xl p-5 space-y-4 shadow-sm"
                >
                    {/* PRODUCT HEADER */}
                    <div className="flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                            <img
                                src={product.imageUrl || "/placeholder.png"}
                                alt={product.name}
                                className="h-14 w-14 rounded object-cover"
                            />

                            <div>
                                <h3 className="font-semibold text-lg">
                                    {product.name}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {product.category?.name}
                                </p>
                            </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                onClick={() =>
                                    router.push(`/admin/products/${product.id}`)
                                }
                            >
                                <Pencil className="text-yellow-500" />
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => {
                                    if (!confirm("Delete this product?")) return;
                                    deleteMutation.mutate(product.id);
                                }}
                            >
                                <Trash2 className="text-red-500" />
                            </Button>
                        </div>
                    </div>

                    {/* SEPARATOR */}
                    <div className="border-t" />

                    {/* ITEMS */}
                    <div className="space-y-3">
                        {product.items?.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No items added
                            </p>
                        )}

                        {product.items?.map((item) => (
                            <SelectableItemRow
                                key={item.id}
                                item={item}
                                product={{
                                    name: product.name,
                                    imageUrl: product.imageUrl,
                                }}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
