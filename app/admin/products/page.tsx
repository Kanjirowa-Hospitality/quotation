"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";

export default function AdminProductsPage() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data } = useQuery<any[]>({
        queryKey: ["admin-products"],
        queryFn: () => fetch("/api/products").then((r) => r.json()),
    });

    // ✅ DELETE MUTATION
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/products/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        },
    });

    const handleDelete = (id: string) => {
        const confirmDelete = confirm("Delete this product?");
        if (!confirmDelete) return;

        deleteMutation.mutate(id);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Products</h2>
                <Button onClick={() => router.push("/admin/products/new")}>
                    New Product
                </Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Image</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {data?.map((p) => (
                        <TableRow key={p.id}>
                            <TableCell>{p.name}</TableCell>
                            <TableCell>{p.category?.name}</TableCell>

                            <TableCell>
                                <img
                                    src={p.imageUrl}
                                    alt={p.name}
                                    className="h-16 w-16 object-cover rounded"
                                />
                            </TableCell>

                            <TableCell className="flex gap-2 items-center ">
                                {/* EDIT */}
                                <Button
                                    variant="link"
                                    className="cursor-pointer hover:text-yellow-400 text-xl"
                                    onClick={() =>
                                        router.push(`/admin/products/${p.id}`)
                                    }
                                >
                                    <Pencil />
                                </Button>

                                {/* DELETE */}
                                <Button
                                    variant="link"
                                    className="cursor-pointer hover:text-red-600 text-xl"
                                    onClick={() => handleDelete(p.id)}
                                >
                                    <Trash2 />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}