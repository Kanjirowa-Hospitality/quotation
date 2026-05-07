type JsonLike = unknown

type SaleOptionLike = {
    id: string
    unit?: string | null
    quantity?: string | null
    price: number
    attributes?: JsonLike
}

type VariantLike = {
    id: string
    description: string | null
    weight: string | null
    size: string | null
    color: string | null
    attributes?: JsonLike
    saleOptions?: SaleOptionLike[]
}

type ProductWithVariants = {
    variants?: VariantLike[]
}

function asRecord(value: JsonLike): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {}
}

function cleanEntries(entries: Array<[string, unknown]>) {
    return Object.fromEntries(
        entries.filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    )
}

export function variantAttributes(variant: VariantLike, saleOption?: SaleOptionLike) {
    return cleanEntries([
        ['weight', variant.weight],
        ['size', variant.size],
        ['color', variant.color],
        ['unit', saleOption?.unit],
        ['quantity', saleOption?.quantity],
        ...Object.entries(asRecord(variant.attributes)),
        ...Object.entries(asRecord(saleOption?.attributes)),
    ])
}

export function flattenProductItems<T extends ProductWithVariants>(product: T) {
    return (product.variants ?? []).flatMap((variant) =>
        (variant.saleOptions ?? []).map((saleOption) => ({
            id: saleOption.id,
            variantId: variant.id,
            description: variant.description,
            price: saleOption.price,
            attributes: variantAttributes(variant, saleOption),
        }))
    )
}

export function withFlattenedItems<T extends ProductWithVariants>(product: T) {
    return {
        ...product,
        items: flattenProductItems(product),
    }
}
