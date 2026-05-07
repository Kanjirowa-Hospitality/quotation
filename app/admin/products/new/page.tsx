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
import { CldUploadButton } from "next-cloudinary";
import { Plus, Trash2 } from "lucide-react";

type Attribute = {
    key: string;
    value: string;
};

type Item = {
    price: string;
    description: string;
    attributes: Attribute[];
};

export default function NewProductPage() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [imageUrl, setImageUrl] = useState("");

    const [items, setItems] = useState<Item[]>([
        { price: "", description: "", attributes: [] },
    ]);

    const { data: categories } = useQuery<any[]>({
        queryKey: ["categories"],
        queryFn: () => fetch("/api/categories").then((r) => r.json()),
    });

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

    // ---------------- ATTRIBUTE HANDLERS ----------------

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

        await fetch("/api/products", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        router.push("/admin/products");
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl p-6 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-semibold mb-6">Create Product</h2>

                <div className="space-y-4">
                    {/* NAME */}
                    <div>
                        <Label>Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>

                    {/* CATEGORY */}
                    <div>
                        <Label>Category</Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
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
                            onSuccess={(res: any) =>
                                setImageUrl(res.info.secure_url)
                            }
                            className="mt-2 px-3 py-2 border rounded-md w-full"
                        >
                            Upload Image
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
                        <div className="flex justify-between items-center">
                            <Label>Items</Label>
                            <Button size="sm" onClick={addItem}>
                                <Plus size={16} />
                            </Button>
                        </div>

                        {items.map((item, i) => (
                            <div key={i} className="border p-4 rounded-lg space-y-3">
                                {/* ITEM BASIC */}
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Price"
                                        value={item.price}
                                        onChange={(e) =>
                                            updateItem(i, "price", e.target.value)
                                        }
                                    />

                                    <Input
                                        placeholder="Label (e.g. Carton Basic)"
                                        value={item.description}
                                        onChange={(e) =>
                                            updateItem(i, "description", e.target.value)
                                        }
                                    />

                                    <Button className="cursor-pointer" variant="ghost" onClick={() => removeItem(i)}>
                                        <Trash2 className="cursor-pointer" size={16} />
                                    </Button>
                                </div>

                                {/* ATTRIBUTES */}
                                <div className="space-y-2">
                                    <Label className="text-sm">Attributes</Label>

                                    {item.attributes.map((attr, j) => (
                                        <div key={j} className="flex gap-2">
                                            <Input
                                                placeholder="Key (e.g. weight)"
                                                value={attr.key}
                                                onChange={(e) =>
                                                    updateAttribute(i, j, "key", e.target.value)
                                                }
                                            />

                                            <Input
                                                placeholder="Value (e.g. 1kg)"
                                                value={attr.value}
                                                onChange={(e) =>
                                                    updateAttribute(i, j, "value", e.target.value)
                                                }
                                            />

                                            <Button
                                                variant="ghost"
                                                className="cursor-pointer"
                                                onClick={() => removeAttribute(i, j)}
                                            >
                                                <Trash2 className="cursor-pointer" size={16} />
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
                        <Button onClick={onSubmit}>Save Product</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
