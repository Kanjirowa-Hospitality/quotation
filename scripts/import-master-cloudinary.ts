import "dotenv/config";
import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFile, utils } from "xlsx";
import { PrismaClient } from "../app/generated/prisma/client";

type ExcelRow = Record<string, unknown>;
type ImageMap = Record<
  string,
  {
    contentHash?: string;
    publicId: string;
    secureUrl: string;
  }
>;

const MASTER_FILE = "master_data/product_master_data.xlsx";
const CLOUDINARY_MAP_FILE = "master_data/cloudinary-image-map.json";
const CLOUDINARY_CSV_FILE = "master_data/product_master_data_cloudinary.csv";
const CLOUDINARY_FOLDER =
  process.env.CLOUDINARY_UPLOAD_FOLDER ??
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER ??
  "quotation-dev/products";
const REQUIRED_COLUMNS = ["category", "product", "price"];
const RESERVED_COLUMNS = new Set([
  "SN",
  "category",
  "categorySlug",
  "categoryDescription",
  "categoryImageUrl",
  "product",
  "productImageUrl",
  "sourceImage",
  "price",
  "unit",
  "quantity",
  "description",
]);

function normalizeHeader(header: string) {
  const key = header.trim();
  const aliases: Record<string, string> = {
    sn: "SN",
    image: "sourceImage",
    category: "category",
    categoryname: "category",
    categoryslug: "categorySlug",
    categorydescription: "categoryDescription",
    categoryimage: "categoryImageUrl",
    categoryimageurl: "categoryImageUrl",
    product: "product",
    productname: "product",
    item: "product",
    itemname: "product",
    productimage: "productImageUrl",
    productimageurl: "productImageUrl",
    price: "price",
    rate: "price",
    amount: "price",
    unit: "unit",
    sellingunit: "unit",
    sellingbasis: "unit",
    basis: "unit",
    per: "unit",
    quantity: "quantity",
    qty: "quantity",
    description: "description",
    itemdescription: "description",
    label: "description",
  };

  return aliases[key.toLowerCase().replace(/[^a-z0-9]/g, "")] ?? key;
}

function normalizeRows(rows: ExcelRow[]) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
    )
  );
}

function valueToString(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function valueToNumber(value: unknown) {
  if (typeof value === "number") return value;

  const parsed = Number(valueToString(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getAttributes(row: ExcelRow) {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([key, value]) => !RESERVED_COLUMNS.has(key) && valueToString(value))
      .map(([key, value]) => [key, valueToString(value)])
  );
}

function getVariantKey(productId: string, row: ExcelRow) {
  return JSON.stringify({
    productId,
    description: valueToString(row.description).toLowerCase(),
    weight: valueToString(row.weight).toLowerCase(),
    size: valueToString(row.size).toLowerCase(),
    color: valueToString(row.color).toLowerCase(),
    attributes: getAttributes(row),
  });
}

function getLocalImagePath(value: unknown) {
  const imagePath = valueToString(value).replace(/\\/g, "/");
  if (!imagePath || imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return "";
  }

  return imagePath;
}

function getImageContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

function getPublicId(filePath: string) {
  const parsed = path.parse(filePath.replace(/\\/g, "/"));
  return parsed.name.replace(/[^a-zA-Z0-9_-]+/g, "_");
}

function getFileHash(filePath: string) {
  return crypto.createHash("sha1").update(readFileSync(path.resolve(filePath))).digest("hex");
}

function getCloudinarySignature(params: Record<string, string>, apiSecret: string) {
  const payload = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${payload}${apiSecret}`)
    .digest("hex");
}

function readImageMap() {
  if (!existsSync(CLOUDINARY_MAP_FILE)) return {};

  return JSON.parse(readFileSync(CLOUDINARY_MAP_FILE, "utf8")) as ImageMap;
}

async function uploadImage(filePath: string, contentHash: string) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary env vars are missing in .env.");
  }

  const normalizedPath = filePath.replace(/\\/g, "/");
  const absolutePath = path.resolve(normalizedPath);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const paramsToSign = {
    folder: CLOUDINARY_FOLDER,
    overwrite: "false",
    public_id: `${getPublicId(normalizedPath)}_${contentHash.slice(0, 10)}`,
    timestamp,
  };
  const signature = getCloudinarySignature(paramsToSign, apiSecret);
  const fileBuffer = readFileSync(absolutePath);
  const form = new FormData();

  form.append(
    "file",
    new Blob([fileBuffer], { type: getImageContentType(absolutePath) }),
    path.basename(absolutePath)
  );
  form.append("api_key", apiKey);
  form.append("folder", paramsToSign.folder);
  form.append("overwrite", paramsToSign.overwrite);
  form.append("public_id", paramsToSign.public_id);
  form.append("timestamp", timestamp);
  form.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: form,
    }
  );

  const result = (await response.json()) as {
    public_id?: string;
    secure_url?: string;
    error?: { message?: string };
  };

  if (!response.ok || !result.secure_url || !result.public_id) {
    throw new Error(
      `Cloudinary upload failed for ${filePath}: ${result.error?.message ?? response.statusText}`
    );
  }

  return {
    contentHash,
    publicId: result.public_id,
    secureUrl: result.secure_url,
  };
}

function getCloudinaryUrl(row: ExcelRow, imageMap: ImageMap) {
  const productImage = valueToString(row.productImageUrl);
  const sourceImage = valueToString(row.sourceImage);

  if (productImage.startsWith("http://") || productImage.startsWith("https://")) {
    return productImage;
  }

  if (sourceImage.startsWith("http://") || sourceImage.startsWith("https://")) {
    return sourceImage;
  }

  const localPath = getLocalImagePath(productImage) || getLocalImagePath(sourceImage);
  return localPath ? imageMap[localPath]?.secureUrl ?? "" : "";
}

async function main() {
  const workbook = readFile(MASTER_FILE);
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("The master workbook does not contain any sheets.");
  }

  const rows = normalizeRows(
    utils.sheet_to_json<ExcelRow>(workbook.Sheets[firstSheetName], {
      defval: "",
    })
  );

  if (rows.length === 0) {
    throw new Error("The master workbook does not contain any rows.");
  }

  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !Object.keys(rows[0]).includes(column)
  );

  if (missingColumns.length) {
    throw new Error(`Missing required columns: ${missingColumns.join(", ")}`);
  }

  const imageMap = readImageMap();
  const localImagePaths = [
    ...new Set(
      rows
        .map((row) => getLocalImagePath(row.productImageUrl) || getLocalImagePath(row.sourceImage))
        .filter(Boolean)
    ),
  ];

  for (const imagePath of localImagePaths) {
    if (!existsSync(imagePath.replace(/\//g, path.sep))) {
      throw new Error(`Missing image file: ${imagePath}`);
    }
  }

  let uploadedImages = 0;
  const hashMap = new Map(
    Object.values(imageMap)
      .filter((entry) => entry.contentHash)
      .map((entry) => [entry.contentHash as string, entry])
  );

  for (const [index, imagePath] of localImagePaths.entries()) {
    if (!imageMap[imagePath]) {
      const contentHash = getFileHash(imagePath);
      const existingUpload = hashMap.get(contentHash);

      if (existingUpload) {
        imageMap[imagePath] = existingUpload;
      } else {
        imageMap[imagePath] = await uploadImage(imagePath, contentHash);
        hashMap.set(contentHash, imageMap[imagePath]);
        uploadedImages += 1;
      }

      await writeFile(CLOUDINARY_MAP_FILE, JSON.stringify(imageMap, null, 2));
    }

    if ((index + 1) % 25 === 0 || index + 1 === localImagePaths.length) {
      console.log(`Prepared ${index + 1}/${localImagePaths.length} Cloudinary images...`);
    }
  }

  const csvRows = rows.map((row) => ({
    ...row,
    sourceImage: getCloudinaryUrl(row, imageMap),
  }));
  const csvSheet = utils.json_to_sheet(csvRows);
  await writeFile(CLOUDINARY_CSV_FILE, utils.sheet_to_csv(csvSheet));

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing. Check your .env file.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  let createdCategories = 0;
  let createdProducts = 0;
  let createdVariants = 0;
  let createdSaleOptions = 0;
  let updatedProductImages = 0;
  let updatedCategoryImages = 0;
  const categoryIds = new Map<string, string>();
  const productIds = new Map<string, string>();
  const variantIds = new Map<string, string>();

  try {
    await prisma.saleOption.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;
      const categoryName = valueToString(row.category);
      const productName = valueToString(row.product);
      const price = valueToNumber(row.price);
      const imageUrl = getCloudinaryUrl(row, imageMap);

      if (!categoryName || !productName || Number.isNaN(price)) {
        throw new Error(
          `Row ${rowNumber} must include category, product, and a valid price.`
        );
      }

      const categorySlug = valueToString(row.categorySlug) || slugify(categoryName);
      let categoryId = categoryIds.get(categorySlug);

      if (!categoryId) {
        const existingCategory = await prisma.category.findUnique({
          where: { slug: categorySlug },
          select: { id: true, imageUrl: true },
        });

        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          const category = await prisma.category.create({
            data: {
              name: categoryName,
              slug: categorySlug,
              description: valueToString(row.categoryDescription) || null,
              imageUrl: imageUrl || null,
            },
            select: { id: true },
          });
          categoryId = category.id;
          createdCategories += 1;
        }

        categoryIds.set(categorySlug, categoryId);
      }

      if (imageUrl) {
        const categoryUpdate = await prisma.category.updateMany({
          where: {
            id: categoryId,
            OR: [{ imageUrl: null }, { imageUrl: { startsWith: "/images/" } }],
          },
          data: { imageUrl },
        });
        updatedCategoryImages += categoryUpdate.count;
      }

      const productKey = `${categoryId}:${productName.toLowerCase()}`;
      let productId = productIds.get(productKey);

      if (!productId) {
        const existingProduct = await prisma.product.findFirst({
          where: {
            categoryId,
            name: { equals: productName, mode: "insensitive" },
          },
          select: { id: true },
        });

        if (existingProduct) {
          productId = existingProduct.id;
        } else {
          const product = await prisma.product.create({
            data: {
              name: productName,
              categoryId,
              imageUrl: imageUrl || null,
            },
            select: { id: true },
          });
          productId = product.id;
          createdProducts += 1;
        }

        productIds.set(productKey, productId);
      }

      if (imageUrl) {
        const productUpdate = await prisma.product.updateMany({
          where: {
            id: productId,
            OR: [
              { imageUrl: null },
              { imageUrl: { startsWith: "/images/" } },
              { imageUrl: { not: imageUrl } },
            ],
          },
          data: { imageUrl },
        });
        updatedProductImages += productUpdate.count;
      }

      const variantKey = getVariantKey(productId, row);
      let variantId = variantIds.get(variantKey);

      if (!variantId) {
        const variant = await prisma.productVariant.create({
          data: {
            productId,
            description: valueToString(row.description) || null,
            weight: valueToString(row.weight) || null,
            size: valueToString(row.size) || null,
            color: valueToString(row.color) || null,
            attributes: getAttributes(row),
          },
          select: { id: true },
        });

        variantId = variant.id;
        variantIds.set(variantKey, variantId);
        createdVariants += 1;
      }

      await prisma.saleOption.create({
        data: {
          variantId,
          unit: valueToString(row.unit) || "unit",
          quantity: valueToString(row.quantity) || null,
          price,
          attributes: {},
        },
      });
      createdSaleOptions += 1;

      if ((index + 1) % 25 === 0 || index + 1 === rows.length) {
        console.log(`Imported ${index + 1}/${rows.length} master rows...`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(
    [
      `Uploaded ${uploadedImages} new Cloudinary images.`,
      `Created ${createdCategories} categories, ${createdProducts} products, ${createdVariants} variants, ${createdSaleOptions} sale options.`,
      `Updated ${updatedCategoryImages} category image URLs and ${updatedProductImages} product image URLs.`,
    ].join(" ")
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
