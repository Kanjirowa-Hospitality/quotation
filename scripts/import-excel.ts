import "dotenv/config";
import path from "node:path";
import process from "node:process";
import { readFile, utils } from "xlsx";

type ExcelRow = Record<string, unknown>;

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
  "description",
]);

function normalizeHeader(header: string) {
  const key = header.trim();
  const aliases: Record<string, string> = {
    categoryname: "category",
    category: "category",
    categoryslug: "categorySlug",
    categorydescription: "categoryDescription",
    categoryimage: "categoryImageUrl",
    categoryimageurl: "categoryImageUrl",
    image: "sourceImage",
    productname: "product",
    product: "product",
    item: "product",
    itemname: "product",
    productimage: "productImageUrl",
    productimageurl: "productImageUrl",
    price: "price",
    rate: "price",
    amount: "price",
    itemdescription: "description",
    description: "description",
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

function getPublicImageUrl(value: unknown) {
  const imagePath = valueToString(value).replace(/\\/g, "/");

  if (!imagePath) return "";
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  const parts = imagePath.split("/").filter(Boolean);
  const filename = parts[parts.length - 1];
  return filename ? `/images/${filename}` : "";
}

function printUsage() {
  console.log(`
Usage:
  bun run import:excel -- ./data.xlsx
  bun run import:excel -- ./data.csv

Required Excel columns:
  category, product, price

Optional columns:
  image, categorySlug, categoryDescription, categoryImageUrl, productImageUrl, description

Any other columns, like size, weight, color, unit, thickness, etc. are saved as item attributes.
`);
}

async function main() {
  const filePath = process.argv[2];

  if (!filePath || ["-h", "--help"].includes(filePath)) {
    printUsage();
    return;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL is missing. Check your .env file.");
    process.exit(1);
  }

  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("../app/generated/prisma/client"),
  ]);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const absolutePath = path.resolve(filePath);
    const workbook = readFile(absolutePath);
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error("The Excel file does not contain any sheets.");
    }

    const rows = normalizeRows(
      utils.sheet_to_json<ExcelRow>(workbook.Sheets[firstSheetName], {
        defval: "",
      })
    );

    if (rows.length === 0) {
      throw new Error("The first sheet does not contain any rows.");
    }

    const missingColumns = REQUIRED_COLUMNS.filter(
      (column) => !Object.keys(rows[0]).includes(column)
    );

    if (missingColumns.length) {
      throw new Error(`Missing required columns: ${missingColumns.join(", ")}`);
    }

    let createdCategories = 0;
    let createdProducts = 0;
    let createdItems = 0;
    let skippedItems = 0;
    const categoryIds = new Map<string, string>();
    const productIds = new Map<string, string>();

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;
      const categoryName = valueToString(row.category);
      const productName = valueToString(row.product);
      const price = valueToNumber(row.price);
      const rowImageUrl =
        getPublicImageUrl(row.productImageUrl) || getPublicImageUrl(row.sourceImage);

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
          select: { id: true },
        });

        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          const category = await prisma.category.create({
            data: {
              name: categoryName,
              slug: categorySlug,
              description: valueToString(row.categoryDescription) || null,
              imageUrl: getPublicImageUrl(row.categoryImageUrl) || rowImageUrl || null,
            },
            select: { id: true },
          });

          categoryId = category.id;
          createdCategories += 1;
        }

        categoryIds.set(categorySlug, categoryId);
      }

      if (rowImageUrl) {
        await prisma.category.updateMany({
          where: { id: categoryId, imageUrl: null },
          data: { imageUrl: rowImageUrl },
        });
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
              imageUrl: rowImageUrl || null,
            },
            select: { id: true },
          });

          productId = product.id;
          createdProducts += 1;
        }

        productIds.set(productKey, productId);
      }

      if (rowImageUrl) {
        await prisma.product.updateMany({
          where: { id: productId, imageUrl: null },
          data: { imageUrl: rowImageUrl },
        });
      }

      const description = valueToString(row.description) || null;
      const attributes = getAttributes(row);
      const existingItem = await prisma.item.findFirst({
        where: {
          productId,
          price,
          description,
          attributes: { equals: attributes },
        },
        select: { id: true },
      });

      if (existingItem) {
        skippedItems += 1;
      } else {
        await prisma.item.create({
          data: {
            productId,
            price,
            description,
            attributes,
          },
        });

        createdItems += 1;
      }

      if ((index + 1) % 25 === 0 || index + 1 === rows.length) {
        console.log(`Processed ${index + 1}/${rows.length} rows...`);
      }
    }

    console.log(
      `Imported ${createdItems} items. Skipped ${skippedItems} existing items. Created ${createdCategories} categories and ${createdProducts} products.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
