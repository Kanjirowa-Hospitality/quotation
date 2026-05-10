"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { CloudinaryUploadWidgetResults } from "next-cloudinary";
import { CldUploadButton } from "next-cloudinary";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cloudinaryUploadOptions, cloudinaryUploadPreset } from "@/lib/cloudinary";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Category = {
    id: string;
    name: string;
};

type Attribute = {
    key: string;
    value: string;
};

type SaleOption = {
    unit: string;
    price: string;
};

type Variant = {
    description: string;
    weight: string;
    size: string;
    color: string;
    attributes: Attribute[];
    saleOptions: SaleOption[];
};

type CloudinaryUploadInfo = {
    secure_url?: string;
};

const emptySaleOption = (): SaleOption => ({
    unit: "piece",
    price: "",
});

const emptyVariant = (): Variant => ({
    description: "",
    weight: "",
    size: "",
    color: "",
    attributes: [],
    saleOptions: [emptySaleOption()],
});

export default function NewProductPage() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [variants, setVariants] = useState<Variant[]>([emptyVariant()]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: categories } = useQuery<Category[]>({
        queryKey: ["categories"],
        queryFn: () => fetch("/api/categories").then((r) => r.json()),
    });

    const updateVariant = (index: number, patch: Partial<Variant>) => {
        setVariants((current) =>
            current.map((variant, variantIndex) =>
                variantIndex === index ? { ...variant, ...patch } : variant
            )
        );
    };

    const addVariant = () => {
        setVariants((current) => [...current, emptyVariant()]);
    };

    const removeVariant = (index: number) => {
        setVariants((current) =>
            current.length === 1 ? current : current.filter((_, variantIndex) => variantIndex !== index)
        );
    };

    const updateSaleOption = (variantIndex: number, optionIndex: number, patch: Partial<SaleOption>) => {
        const variant = variants[variantIndex];
        updateVariant(variantIndex, {
            saleOptions: variant.saleOptions.map((option, currentIndex) =>
                currentIndex === optionIndex ? { ...option, ...patch } : option
            ),
        });
    };

    const addSaleOption = (variantIndex: number) => {
        const variant = variants[variantIndex];
        updateVariant(variantIndex, {
            saleOptions: [...variant.saleOptions, emptySaleOption()],
        });
    };

    const removeSaleOption = (variantIndex: number, optionIndex: number) => {
        const variant = variants[variantIndex];
        updateVariant(variantIndex, {
            saleOptions:
                variant.saleOptions.length === 1
                    ? variant.saleOptions
                    : variant.saleOptions.filter((_, currentIndex) => currentIndex !== optionIndex),
        });
    };

    const addAttribute = (variantIndex: number) => {
        const variant = variants[variantIndex];
        updateVariant(variantIndex, {
            attributes: [...variant.attributes, { key: "", value: "" }],
        });
    };

    const updateAttribute = (
        variantIndex: number,
        attrIndex: number,
        field: "key" | "value",
        value: string
    ) => {
        const variant = variants[variantIndex];
        updateVariant(variantIndex, {
            attributes: variant.attributes.map((attribute, currentIndex) =>
                currentIndex === attrIndex ? { ...attribute, [field]: value } : attribute
            ),
        });
    };

    const removeAttribute = (variantIndex: number, attrIndex: number) => {
        const variant = variants[variantIndex];
        updateVariant(variantIndex, {
            attributes: variant.attributes.filter((_, currentIndex) => currentIndex !== attrIndex),
        });
    };

    const onSubmit = async () => {
        setIsSubmitting(true);

        const payload = {
            name,
            categoryId,
            imageUrl,
            variants: variants.map((variant) => ({
                description: variant.description,
                weight: variant.weight,
                size: variant.size,
                color: variant.color,
                attributes: Object.fromEntries(
                    variant.attributes
                        .filter((attribute) => attribute.key.trim())
                        .map((attribute) => [attribute.key, attribute.value])
                ),
                saleOptions: variant.saleOptions.map((option) => ({
                    unit: option.unit || "piece",
                    price: Number(option.price) || 0,
                })),
            })),
        };

        await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        router.back();
        router.refresh();
    };

    const onUploadSuccess = (res: CloudinaryUploadWidgetResults) => {
        const info = res.info as CloudinaryUploadInfo | undefined;
        if (info?.secure_url) setImageUrl(info.secure_url);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm sm:p-4">
            <div className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-4 shadow-xl sm:p-6">
                <h2 className="mb-6 text-xl font-semibold">Create Product</h2>

                <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label>Name</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} />
                        </div>

                        <div>
                            <Label>Category</Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories?.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label>Image</Label>
                        <CldUploadButton
                            uploadPreset={cloudinaryUploadPreset}
                            options={cloudinaryUploadOptions}
                            onSuccess={onUploadSuccess}
                            className="mt-2 w-full rounded-md border px-3 py-2"
                        >
                            Upload Image
                        </CldUploadButton>

                        {imageUrl && (
                            <img
                                src={imageUrl}
                                alt={name || "Product image"}
                                className="mt-2 h-32 w-full rounded object-cover"
                            />
                        )}
                    </div>

                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between gap-3">
                            <Label>Variants</Label>
                            <Button size="sm" onClick={addVariant}>
                                <Plus size={16} />
                                Variant
                            </Button>
                        </div>

                        {variants.map((variant, variantIndex) => (
                            <div key={variantIndex} className="space-y-4 rounded-md border p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-medium">Variant {variantIndex + 1}</p>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="cursor-pointer"
                                        aria-label="Remove variant"
                                        disabled={variants.length === 1}
                                        onClick={() => removeVariant(variantIndex)}
                                    >
                                        <Trash2 className="cursor-pointer" size={16} />
                                    </Button>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="md:col-span-2">
                                        <Label>Description</Label>
                                        <Input
                                            value={variant.description}
                                            onChange={(e) => updateVariant(variantIndex, { description: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Weight</Label>
                                        <Input
                                            value={variant.weight}
                                            onChange={(e) => updateVariant(variantIndex, { weight: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Size</Label>
                                        <Input
                                            value={variant.size}
                                            onChange={(e) => updateVariant(variantIndex, { size: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Color</Label>
                                        <Input
                                            value={variant.color}
                                            onChange={(e) => updateVariant(variantIndex, { color: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <Label>Sale Options</Label>
                                        <Button size="sm" variant="outline" onClick={() => addSaleOption(variantIndex)}>
                                            <Plus size={16} />
                                            Sale option
                                        </Button>
                                    </div>

                                    {variant.saleOptions.map((option, optionIndex) => (
                                        <div key={optionIndex} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                                            <Input
                                                placeholder="Unit, e.g. piece, packet, bundle"
                                                value={option.unit}
                                                onChange={(e) =>
                                                    updateSaleOption(variantIndex, optionIndex, { unit: e.target.value })
                                                }
                                            />
                                            <Input
                                                placeholder="Price"
                                                value={option.price}
                                                onChange={(e) =>
                                                    updateSaleOption(variantIndex, optionIndex, { price: e.target.value })
                                                }
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="cursor-pointer"
                                                aria-label="Remove sale option"
                                                disabled={variant.saleOptions.length === 1}
                                                onClick={() => removeSaleOption(variantIndex, optionIndex)}
                                            >
                                                <Trash2 className="cursor-pointer" size={16} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <Label>Extra Attributes</Label>
                                        <Button size="sm" variant="outline" onClick={() => addAttribute(variantIndex)}>
                                            <Plus size={16} />
                                            Attribute
                                        </Button>
                                    </div>

                                    {variant.attributes.map((attribute, attrIndex) => (
                                        <div key={attrIndex} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                                            <Input
                                                placeholder="Key"
                                                value={attribute.key}
                                                onChange={(e) =>
                                                    updateAttribute(variantIndex, attrIndex, "key", e.target.value)
                                                }
                                            />
                                            <Input
                                                placeholder="Value"
                                                value={attribute.value}
                                                onChange={(e) =>
                                                    updateAttribute(variantIndex, attrIndex, "value", e.target.value)
                                                }
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="cursor-pointer"
                                                aria-label="Remove attribute"
                                                onClick={() => removeAttribute(variantIndex, attrIndex)}
                                            >
                                                <Trash2 className="cursor-pointer" size={16} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
                        <Button variant="outline" onClick={() => router.back()}>
                            Cancel
                        </Button>
                        <Button onClick={onSubmit} disabled={isSubmitting || !name || !categoryId}>
                            {isSubmitting ? "Saving..." : "Save Product"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
