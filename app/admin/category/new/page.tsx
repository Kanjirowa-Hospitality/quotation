"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, LoadingButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cloudinaryUploadOptions, cloudinaryUploadPreset } from "@/lib/cloudinary";
import { CldUploadButton, type CloudinaryUploadWidgetResults } from "next-cloudinary";

type CloudinaryUploadInfo = {
    secure_url?: string;
};

function getCategorySlug(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
}

export default function NewCategoryPage() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onNameChange = (value: string) => {
        setName(value);
        setSlug(getCategorySlug(value));
    };

    const onSubmit = async () => {
        setIsSubmitting(true);

        const res = await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                slug,
                description,
                imageUrl,
            }),
        });

        if (!res.ok) {
            setIsSubmitting(false);
            return;
        }

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
                            onChange={(e) => onNameChange(e.target.value)}
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
                            uploadPreset={cloudinaryUploadPreset}
                            options={cloudinaryUploadOptions}
                            onSuccess={(result: CloudinaryUploadWidgetResults) => {
                                const info = result.info as CloudinaryUploadInfo | undefined;
                                if (info?.secure_url) setImageUrl(info.secure_url);
                            }}
                            className="mt-2 px-3 py-2 border rounded-md w-full text-sm"
                        >
                            Upload Image
                        </CldUploadButton>

                        {imageUrl && (
                            <img
                                src={imageUrl}
                                alt={name ? `${name} category` : "Category"}
                                className="h-28 w-full object-cover rounded-md mt-3 border"
                            />
                        )}
                    </div>

                    {/* ACTIONS */}
                    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                        <Button variant="outline" onClick={() => router.back()}>
                            Cancel
                        </Button>
                        <LoadingButton
                            onClick={onSubmit}
                            loading={isSubmitting}
                            loadingText="Saving..."
                            disabled={!name || !slug}
                        >
                            Save Category
                        </LoadingButton>
                    </div>
                </div>
            </div>
        </div>
    );
}
