"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CldUploadButton } from "next-cloudinary";

export default function NewProductPage() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [imageUrl, setImageUrl] = useState("");

    // Fetch categories
    const { data: categories } = useQuery<any[]>({
        queryKey: ["categories"],
        queryFn: () => fetch("/api/categories").then((r) => r.json()),
    });

    const onSubmit = async () => {
        if (!name || !categoryId) {
            alert("Name and category are required");
            return;
        }

        await fetch("/api/products", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name,
                categoryId,
                imageUrl,
            }),
        });

        router.push("/admin/products");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* BACKDROP */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => router.back()}
            />

            {/* CARD */}
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
                <h2 className="text-xl font-semibold mb-6">Create Product</h2>

                <div className="space-y-4">
                    {/* NAME */}
                    <div>
                        <Label>Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Product name"
                        />
                    </div>

                    {/* CATEGORY */}
                    <div>
                        <Label>Category</Label>

                        <Select onValueChange={setCategoryId}>
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
                            Upload Image
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
                        <Button onClick={onSubmit}>Save Product</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}