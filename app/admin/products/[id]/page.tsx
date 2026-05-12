"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CldUploadButton, type CloudinaryUploadWidgetResults } from "next-cloudinary";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cloudinaryUploadOptions, cloudinaryUploadPreset } from "@/lib/cloudinary";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getValidationError, isValidPriceInput, productPayloadSchema } from "@/lib/validation/product";

type Attribute = {
    key: string;
    value: string;
};

type SaleOption = {
    id?: string;
    unit: string;
    price: string;
};

type Variant = {
    id?: string;
    description: string;
    weight: string;
    size: string;
    color: string;
    attributes: Attribute[];
    saleOptions: SaleOption[];
};

type ProductResponse = {
    name?: string | null;
    categoryId?: string | null;
    imageUrl?: string | null;
    variants?: {
        id?: string;
        description?: string | null;
        weight?: string | null;
        size?: string | null;
        color?: string | null;
        attributes?: Record<string, unknown> | null;
        saleOptions?: {
            id?: string;
            unit?: string | null;
            quantity?: string | null;
            price?: number | null;
        }[];
    }[];
};

type CloudinaryUploadInfo = {
    secure_url?: string;
};

function attributesToArray(attributes: Record<string, unknown> | null | undefined): Attribute[] {
    return Object.entries(attributes ?? {}).map(([key, value]) => ({
        key,
        value: String(value),
    }));
}

const emptySaleOption = (): SaleOption => ({
    unit: "unit",
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

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [variants, setVariants] = useState<Variant[]>([]);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            const res = await fetch(`/api/products/${id}`);
            const data = (await res.json()) as ProductResponse;

            setName(data.name ?? "");
            setCategoryId(data.categoryId ?? "");
            setImageUrl(data.imageUrl ?? "");

            setVariants(
                (data.variants ?? []).map((variant) => ({
                    id: variant.id,
                    description: variant.description ?? "",
                    weight: variant.weight ?? "",
                    size: variant.size ?? "",
                    color: variant.color ?? "",
                    attributes: attributesToArray(variant.attributes),
                    saleOptions: (variant.saleOptions ?? []).map((option) => ({
                        id: option.id,
                        unit: option.unit ?? "unit",
                        quantity: option.quantity ?? "",
                        price: String(option.price ?? ""),
                    })),
                }))
            );
            setLoading(false);
        };

        fetchData();
    }, [id]);

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
        setVariants((current) => current.filter((_, variantIndex) => variantIndex !== index));
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
            saleOptions: variant.saleOptions.filter((_, currentIndex) => currentIndex !== optionIndex),
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
        setError("");
        const result = productPayloadSchema.safeParse({
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
                    unit: option.unit || "unit",
                    price: option.price,
                })),
            })),
        });

        if (!result.success) {
            setError(getValidationError(result.error));
            return;
        }

        await fetch(`/api/products/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result.data),
        });

        router.back();
    };

    if (loading) return <div className="p-6">Loading...</div>;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm sm:p-4">
            <div className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-4 shadow-xl sm:p-6">
                <h2 className="mb-6 text-xl font-semibold">Edit Product</h2>

                <div className="space-y-5">
                    <div>
                        <Label>Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>

                    <div>
                        <Label>Image</Label>
                        <CldUploadButton
                            uploadPreset={cloudinaryUploadPreset}
                            options={cloudinaryUploadOptions}
                            onSuccess={(res: CloudinaryUploadWidgetResults) => {
                                const info = res.info as CloudinaryUploadInfo | undefined;
                                if (info?.secure_url) setImageUrl(info.secure_url);
                            }}
                            className="mt-2 w-full rounded-md border px-3 py-2"
                        >
                            Replace Image
                        </CldUploadButton>

                        {imageUrl && (
                            <img
                                src={imageUrl}
                                alt={name}
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
                            <div key={variant.id ?? variantIndex} className="space-y-4 rounded-md border p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-medium">Variant {variantIndex + 1}</p>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="cursor-pointer"
                                        aria-label="Remove variant"
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
                                        <div key={option.id ?? optionIndex} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                                            <Input
                                                placeholder="Unit, e.g. piece, packet, bundle"
                                                value={option.unit}
                                                onChange={(e) =>
                                                    updateSaleOption(variantIndex, optionIndex, { unit: e.target.value })
                                                }
                                            />

                                            <Input
                                                placeholder="Price"
                                                inputMode="decimal"
                                                value={option.price}
                                                onChange={(e) => {
                                                    const value = e.target.value.trim();
                                                    if (isValidPriceInput(value)) {
                                                        updateSaleOption(variantIndex, optionIndex, { price: value });
                                                    }
                                                }}
                                            />


                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="cursor-pointer"
                                                aria-label="Remove sale option"
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
                        {error && <p className="text-sm text-destructive sm:mr-auto">{error}</p>}
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
