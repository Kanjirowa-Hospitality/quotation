"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil } from "lucide-react";

export default function AdminProductsPage() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data } = useQuery<any[]>({
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

                        {product.items?.map((item: any) => (
                            <div
                                key={item.id}
                                className="flex justify-between items-start bg-muted p-3 rounded-md"
                            >
                                {/* LEFT SIDE */}
                                <div className="space-y-1">
                                    <p className="font-medium">
                                        {item.description || "No label"}
                                    </p>

                                    {/* ATTRIBUTES */}
                                    <div className="flex flex-wrap gap-2">
                                        {item.attributes &&
                                            Object.entries(item.attributes).map(
                                                ([key, value]) => (
                                                    <span
                                                        key={key}
                                                        className="text-xs px-2 py-1 bg-white border rounded"
                                                    >
                                                        {key}: {String(value)}
                                                    </span>
                                                )
                                            )}
                                    </div>
                                </div>

                                {/* RIGHT SIDE */}
                                <div className="font-semibold">
                                    Rs. {item.price}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}