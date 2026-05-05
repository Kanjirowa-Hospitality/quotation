"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectableItemRow } from "@/components/selectable-item-row";
import { useCart, CartItem } from "@/lib/store/cart";
import { cn } from "@/lib/utils";
import { Trash2, Pencil } from "lucide-react";

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

export default function AdminProductsPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const isSelecting = useCart((state) => state.isSelecting);
    const selectedItems = useCart((state) => state.selectedItems);
    const toggleSelectionGroup = useCart((state) => state.toggleSelectionGroup);

    const { data } = useQuery<AdminProduct[]>({
        queryKey: ["admin-products"],
        queryFn: () => fetch("/api/products").then((r) => r.json()),
    });

    // DELETE PRODUCT
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
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Products</h2>
                <Button onClick={() => router.push("/admin/products/new")}>
                    New Product
                </Button>
            </div>

            {data?.map((product) => {
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
                    <div
                        key={product.id}
                        onClick={() => {
                            if (isSelecting) {
                                toggleSelectionGroup(productCartItems);
                            }
                        }}
                        className={cn(
                            "border rounded-xl p-5 space-y-4 shadow-sm transition-colors",
                            isSelecting && hasItems && "cursor-pointer hover:border-primary",
                            isProductSelected && "border-primary bg-primary/5 ring-2 ring-primary/30"
                        )}
                    >
                    {/* PRODUCT HEADER */}
                    <div className="flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                            {isSelecting && (
                                <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="rounded-lg border border-primary/40 bg-primary/10 p-2 shadow-sm"
                                >
                                    <Checkbox
                                        checked={isProductSelected}
                                        disabled={!hasItems}
                                        aria-label={`Select all ${product.name} items`}
                                        onCheckedChange={() => toggleSelectionGroup(productCartItems)}
                                    />
                                </div>
                            )}
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
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/admin/products/${product.id}`);
                                }}
                            >
                                <Pencil className="text-yellow-500" />
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation();
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
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
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
                );
            })}
        </div>
    );
}
