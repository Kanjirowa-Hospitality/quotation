"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CldUploadButton } from "next-cloudinary";

export default function NewCategoryPage() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [imageUrl, setImageUrl] = useState("");

    // Auto slug
    useEffect(() => {
        const generatedSlug = name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");

        setSlug(generatedSlug);
    }, [name]);

    const onSubmit = async () => {
        const resp = await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                slug,
                description,
                imageUrl,
            }),
        });

        console.log(resp)

        router.push("/admin/category");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            {/* BACKDROP */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => router.back()}
            />

            {/* MODAL */}
            <div className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-4 shadow-xl animate-in fade-in zoom-in-95 duration-200 sm:p-6">
                <h2 className="text-xl font-semibold mb-6">Create Category</h2>

                <div className="space-y-4">
                    {/* NAME */}
                    <div>
                        <Label>Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Category name"
                        />
                    </div>

                    {/* SLUG */}
                    <div>
                        <Label>Slug</Label>
                        <Input
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            placeholder="category-slug"
                        />
                    </div>

                    {/* DESCRIPTION */}
                    <div>
                        <Label>Description</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Short description..."
                        />
                    </div>

                    {/* IMAGE UPLOAD */}
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
                    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                        <Button variant="outline" onClick={() => router.back()}>
                            Cancel
                        </Button>
                        <Button onClick={onSubmit}>Save Category</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
