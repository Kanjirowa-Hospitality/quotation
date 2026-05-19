"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button, LoadingButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    cloudinaryMaxImageSizeLabel,
    cloudinaryUploadOptions,
    cloudinaryUploadPreset,
    getUploadedCloudinaryImageUrl,
    type CloudinaryUploadInfo,
} from "@/lib/cloudinary";
import { CldUploadButton, type CloudinaryUploadWidgetResults } from "next-cloudinary";
import { LoaderCircle } from "lucide-react";

export default function EditCategoryPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);

    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // FETCH CATEGORY
    useEffect(() => {
        const fetchCategory = async () => {
            const res = await fetch(`/api/categories/${id}`);
            const data = await res.json();

            setName(data.name);
            setSlug(data.slug);
            setDescription(data.description || "");
            setImageUrl(data.imageUrl || "");

            setLoading(false);
        };

        fetchCategory();
    }, [id]);

    const onUpdate = async () => {
        setIsSubmitting(true);

        const res = await fetch(`/api/categories/${id}`, {
            method: "PUT",
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

    if (loading) {
        return (
            <div className="flex min-h-40 items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading category...
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            {/* BACKDROP */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => router.back()}
            />

            {/* CARD */}
            <div className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-4 shadow-xl animate-in fade-in zoom-in-95 sm:p-6">
                <h2 className="text-xl font-semibold mb-6">Edit Category</h2>

                <div className="space-y-4">
                    {/* NAME */}
                    <div>
                        <Label>Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>

                    {/* SLUG */}
                    <div>
                        <Label>Slug</Label>
                        <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
                    </div>

                    {/* DESCRIPTION */}
                    <div>
                        <Label>Description</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
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
                            Replace Image
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
                            onClick={onUpdate}
                            loading={isSubmitting}
                            loadingText="Updating..."
                            disabled={!name || !slug}
                        >
                            Update
                        </LoadingButton>
                    </div>
                </div>
            </div>
        </div>
    );
}
