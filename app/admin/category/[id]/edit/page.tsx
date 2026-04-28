"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CldUploadButton } from "next-cloudinary";

export default function EditCategoryPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);

    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [imageUrl, setImageUrl] = useState("");

    // FETCH CATEGORY
    useEffect(() => {
        const fetchCategory = async () => {
            const res = await fetch(`/api/categories/${id}`);
            console.log(res)
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
        await fetch(`/api/categories/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                slug,
                description,
                imageUrl,
            }),
        });

        router.push("/admin/category");
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
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
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
                            uploadPreset="kanjirow_upload"
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