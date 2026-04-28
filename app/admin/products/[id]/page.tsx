"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CldUploadButton } from "next-cloudinary";
import { Plus, Trash2 } from "lucide-react";

type Attribute = {
    key: string;
    value: string;
};

type Item = {
    id?: string;
    price: string;
    description: string;
    attributes: Attribute[];
};

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);

    const [name, setName] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [imageUrl, setImageUrl] = useState("");

    const [items, setItems] = useState<Item[]>([]);

    // ---------------- FETCH ----------------
    useEffect(() => {
        const fetchData = async () => {
            const res = await fetch(`/api/products/${id}`);
            const data = await res.json();

            setName(data.name);
            setCategoryId(data.categoryId);
            setImageUrl(data.imageUrl || "");

            // convert attributes object → array
            const formattedItems = data.items.map((item: any) => ({
                id: item.id,
                price: String(item.price),
                description: item.description || "",
                attributes: item.attributes
                    ? Object.entries(item.attributes).map(([k, v]) => ({
                        key: k,
                        value: String(v),
                    }))
                    : [],
            }));

            setItems(formattedItems);
            setLoading(false);
        };

        fetchData();
    }, [id]);

    // ---------------- ITEM HANDLERS ----------------
    const addItem = () => {
        setItems([
            ...items,
            { price: "", description: "", attributes: [] },
        ]);
    };

    const removeItem = (index: number) => {
        const copy = [...items];
        copy.splice(index, 1);
        setItems(copy);
    };

    const updateItem = (index: number, field: string, value: string) => {
        const copy: any = [...items];
        copy[index][field as keyof Item] = value;
        setItems(copy);
    };

    // ---------------- ATTRIBUTE ----------------
    const addAttribute = (itemIndex: number) => {
        const copy = [...items];
        copy[itemIndex].attributes.push({ key: "", value: "" });
        setItems(copy);
    };

    const updateAttribute = (
        itemIndex: number,
        attrIndex: number,
        field: "key" | "value",
        value: string
    ) => {
        const copy = [...items];
        copy[itemIndex].attributes[attrIndex][field] = value;
        setItems(copy);
    };

    const removeAttribute = (itemIndex: number, attrIndex: number) => {
        const copy = [...items];
        copy[itemIndex].attributes.splice(attrIndex, 1);
        setItems(copy);
    };

    // ---------------- SUBMIT ----------------
    const onSubmit = async () => {
        const payload = {
            name,
            categoryId,
            imageUrl,
            items: items.map((item) => ({
                price: parseFloat(item.price),
                description: item.description,
                attributes: Object.fromEntries(
                    item.attributes.map((a) => [a.key, a.value])
                ),
            })),
        };

        await fetch(`/api/products/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        router.push("/admin/products");
    };

    if (loading) return <div className="p-6">Loading...</div>;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl p-6 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-semibold mb-6">Edit Product</h2>

                <div className="space-y-4">
                    {/* NAME */}
                    <div>
                        <Label>Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>

                    {/* IMAGE */}
                    <div>
                        <Label>Image</Label>
                        <CldUploadButton
                            uploadPreset="kanjirow_upload"
                            onSuccess={(res: any) =>
                                setImageUrl(res.info.secure_url)
                            }
                            className="mt-2 px-3 py-2 border rounded-md w-full"
                        >
                            Replace Image
                        </CldUploadButton>

                        {imageUrl && (
                            <img
                                src={imageUrl}
                                className="h-32 w-full object-cover rounded mt-2"
                            />
                        )}
                    </div>

                    {/* ITEMS */}
                    <div className="space-y-4 pt-4">
                        <div className="flex justify-between">
                            <Label>Items</Label>
                            <Button size="sm" onClick={addItem}>
                                <Plus size={16} />
                            </Button>
                        </div>

                        {items.map((item, i) => (
                            <div key={i} className="border p-4 rounded space-y-3">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Price"
                                        value={item.price}
                                        onChange={(e) =>
                                            updateItem(i, "price", e.target.value)
                                        }
                                    />

                                    <Input
                                        placeholder="Label"
                                        value={item.description}
                                        onChange={(e) =>
                                            updateItem(i, "description", e.target.value)
                                        }
                                    />

                                    <Button onClick={() => removeItem(i)} variant="ghost">
                                        <Trash2 size={16} />
                                    </Button>
                                </div>

                                {/* ATTRIBUTES */}
                                <div className="space-y-2">
                                    {item.attributes.map((attr, j) => (
                                        <div key={j} className="flex gap-2">
                                            <Input
                                                placeholder="Key"
                                                value={attr.key}
                                                onChange={(e) =>
                                                    updateAttribute(i, j, "key", e.target.value)
                                                }
                                            />
                                            <Input
                                                placeholder="Value"
                                                value={attr.value}
                                                onChange={(e) =>
                                                    updateAttribute(i, j, "value", e.target.value)
                                                }
                                            />
                                            <Button
                                                variant="ghost"
                                                onClick={() => removeAttribute(i, j)}
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    ))}

                                    <Button size="sm" onClick={() => addAttribute(i)}>
                                        + Add Attribute
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ACTION */}
                    <div className="flex justify-end pt-4 space-x-3">
                        <Button variant="outline" onClick={() => router.back()}>
                            Cancel
                        </Button>
                        <Button onClick={onSubmit}>Update Product</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}