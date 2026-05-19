"use client";

import { useState } from "react";
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
import {
    cloudinaryMaxImageSizeLabel,
    cloudinaryUploadOptions,
    cloudinaryUploadPreset,
    getUploadedCloudinaryImageUrl,
    type CloudinaryUploadInfo,
} from "@/lib/cloudinary";
import { CldUploadButton, type CloudinaryUploadWidgetResults } from "next-cloudinary";

type Category = {
    id: string;
    name: string;
};

export default function NewItemsPage() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [imageUrl, setImageUrl] = useState("");

    // Fetch categories
    const { data: categories } = useQuery<Category[]>({
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

        router.push("/admin/items");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            {/* BACKDROP */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => router.back()}
            />

            {/* CARD */}
            <div className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-4 shadow-xl animate-in fade-in zoom-in-95 sm:p-6">
                <h2 className="text-xl font-semibold mb-6">Create Items</h2>

                <div className="space-y-4">
                    {/* NAME */}
                    <div>
                        <Label>Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Item name"
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

                    {/* Product */}
                    <div>
                        <Label>Product</Label>

                        <Select onValueChange={setCategoryId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Product" />
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
                            uploadPreset={cloudinaryUploadPreset}
                            options={cloudinaryUploadOptions}
                            onSuccess={(result: CloudinaryUploadWidgetResults) => {
                                const info = result.info as CloudinaryUploadInfo | undefined;
                                const uploadedUrl = getUploadedCloudinaryImageUrl(info);

                                if (!uploadedUrl) {
                                    alert(`Image must be ${cloudinaryMaxImageSizeLabel} or less.`);
                                    return;
                                }

                                setImageUrl(uploadedUrl);
                            }}
                            className="mt-2 px-3 py-2 border rounded-md w-full text-sm"
                        >
                            Upload Image
                        </CldUploadButton>

                        {imageUrl && (
                            <img
                                src={imageUrl}
                                alt={name || "Product image"}
                                className="h-28 w-full object-cover rounded-md mt-3 border"
                            />
                        )}
                    </div>

                    {/* ACTIONS */}
                    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
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
