"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CldUploadButton } from "next-cloudinary";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);

    const [name, setName] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [imageUrl, setImageUrl] = useState("");

    // ✅ Fetch categories
    const { data: categories } = useQuery<any[]>({
        queryKey: ["categories"],
        queryFn: () => fetch("/api/categories").then((r) => r.json()),
    });

    // ✅ Fetch product
    useEffect(() => {
        const fetchProduct = async () => {
            const res = await fetch(`/api/products/${id}`);

            if (!res.ok) {
                alert("Failed to fetch product");
                return;
            }

            const data = await res.json();

            setName(data.name);
            setCategoryId(data.categoryId); // ✅ FIXED
            setImageUrl(data.imageUrl || "");

            setLoading(false);
        };

        fetchProduct();
    }, [id]);

    const onUpdate = async () => {
        await fetch(`/api/products/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                categoryId,
                imageUrl,
            }),
        });

        router.push("/admin/products");
    };

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* BACKDROP */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => router.back()}
            />

            {/* CARD */}
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <h2 className="text-xl font-semibold mb-6">Edit Product</h2>

                <div className="space-y-4">
                    {/* NAME */}
                    <div>
                        <Label>Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* CATEGORY */}
                    <div>
                        <Label>Category</Label>

                        <Select
                            value={categoryId} // ✅ IMPORTANT
                            onValueChange={setCategoryId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>

                            <SelectContent>
                                {categories?.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* IMAGE */}
                    <div>
                        <Label>Image</Label>

                        <CldUploadButton
                            uploadPreset="kanjirowa_upload"
                            onSuccess={(result: any) => {
                                setImageUrl(result.info.secure_url);
                            }}
                            className="mt-2 px-3 py-2 border rounded-md w-full text-sm"
                        >
                            Replace Image
                        </CldUploadButton>

                        {imageUrl && (
                            <img
                                src={imageUrl}
                                className="h-28 w-full object-cover rounded-md mt-3 border"
                            />
                        )}
                    </div>

                    {/* ACTIONS */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => router.back()}>
                            Cancel
                        </Button>
                        <Button onClick={onUpdate}>Update</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}