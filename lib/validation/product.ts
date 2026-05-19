import { z } from "zod";

export const priceInputPattern = /^\d*(?:\.\d{0,2})?$/;

export const priceSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().replace(/,/g, "");
    return normalized && priceInputPattern.test(normalized) ? Number(normalized) : value;
  }

  return value;
}, z.number().finite("Price must be a valid number.").min(0, "Price cannot be negative."));

const jsonAttributeValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const jsonAttributesSchema = z.record(z.string(), jsonAttributeValueSchema);

const optionalTextSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => value || null);

const requiredTextSchema = (fieldName: string) =>
  z.string().trim().min(1, `${fieldName} is required.`);

const saleOptionSchema = z.object({
  unit: optionalTextSchema.transform((value) => value || "unit"),
  quantity: optionalTextSchema,
  price: priceSchema,
  attributes: jsonAttributesSchema.optional().default({}),
});

const variantSchema = z.object({
  description: optionalTextSchema,
  weight: optionalTextSchema,
  size: optionalTextSchema,
  color: optionalTextSchema,
  attributes: jsonAttributesSchema.optional().default({}),
  saleOptions: z.array(saleOptionSchema).min(1, "At least one sale option is required."),
});

export const productPayloadSchema = z.object({
  name: z.string().trim().min(1, "Product name is required."),
  categoryId: z.string().trim().min(1, "Category is required."),
  imageUrl: optionalTextSchema,
  variants: z.array(variantSchema).min(1, "At least one variant is required."),
});

export const importPriceSchema = z
  .number()
  .finite("Price must be a valid number.")
  .min(0, "Price cannot be negative.");

export const quotationExportSchema = z.object({
  items: z.array(
    z.object({
      productName: z.string().optional(),
      imageUrl: z.string().optional(),
      description: z.string().optional(),
      price: priceSchema.optional(),
      attributes: z.record(z.string(), z.unknown()).nullable().optional(),
    })
  ),
  fields: z.array(z.enum(["name", "image", "description", "price"])),
  format: z.enum(["excel", "word", "pdf"]),
  meta: z.object({
    quotationDate: requiredTextSchema("Date"),
    customerName: requiredTextSchema("Hotel / customer name"),
    customerAddress: requiredTextSchema("Hotel / customer address"),
    quotationTitle: requiredTextSchema("Quotation for"),
  }),
});

export function isValidPriceInput(value: string) {
  return priceInputPattern.test(value);
}

export function parsePriceInput(value: string) {
  const normalized = value.trim().replace(/,/g, "");

  if (!normalized || !isValidPriceInput(normalized)) return null;

  const price = Number(normalized);

  return Number.isFinite(price) && price >= 0 ? price : null;
}

export function getValidationError(error: z.ZodError) {
  return error.issues[0]?.message || "Invalid product data.";
}
