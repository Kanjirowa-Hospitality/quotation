import crypto from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { read, utils } from "xlsx";
import { PRODUCT_IMPORT_HEADERS } from "@/lib/product-import-headers";

export type ProductImportRow = {
    id: string;
    rowNumber: number;
    serialNumber: string;
    imageUrl: string;
    categoryName: string;
    productName: string;
    description: string;
    color: string;
    weight: string;
    size: string;
    brand: string;
    unit: string;
    price: number | null;
    warnings: string[];
};

export type ProductImportSession = {
    id: string;
    originalFileName: string;
    createdAt: string;
    rows: ProductImportRow[];
};

type ExcelRow = Record<string, unknown>;
type ExtractedImages = {
    byRow: Map<number, string>;
    byDispImgId: Map<string, string>;
};

const IMPORT_ROOT = path.join(os.tmpdir(), "kanjirowa-product-imports");
const SESSION_FILE = "session.json";

const HEADER_ALIASES: Record<string, keyof Omit<ProductImportRow, "id" | "rowNumber" | "price" | "warnings"> | "price"> = {
    sn: "serialNumber",
    serialnumber: "serialNumber",
    serialno: "serialNumber",
    sno: "serialNumber",
    "s.n": "serialNumber",
    image: "imageUrl",
    photo: "imageUrl",
    picture: "imageUrl",
    category: "categoryName",
    categoryname: "categoryName",
    product: "productName",
    productname: "productName",
    item: "productName",
    itemname: "productName",
    description: "description",
    color: "color",
    colour: "color",
    weight: "weight",
    wight: "weight",
    size: "size",
    brand: "brand",
    unit: "unit",
    price: "price",
    rate: "price",
};

function normalizeHeader(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9.]/g, "");
}

function valueToString(value: unknown) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

function valueToNumber(value: unknown) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;

    const text = valueToString(value).replace(/,/g, "");
    if (!text) return null;

    const number = Number(text);
    return Number.isFinite(number) ? number : null;
}

function slugPart(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function getSessionDir(sessionId: string) {
    return path.join(IMPORT_ROOT, sessionId);
}

export function getImportImageContentType(filePath: string) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".png") return "image/png";
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".webp") return "image/webp";
    return "application/octet-stream";
}

function getImportImagePath(sessionId: string, fileName: string) {
    return path.join(getSessionDir(sessionId), path.basename(fileName));
}

export function getProductImportImagePath(sessionId: string, fileName: string) {
    return getImportImagePath(sessionId, fileName);
}

export function getProductImportSessionPath(sessionId: string) {
    return path.join(getSessionDir(sessionId), SESSION_FILE);
}

function getImportImageUrl(sessionId: string, fileName: string) {
    return `/api/products/import/image?sessionId=${encodeURIComponent(sessionId)}&file=${encodeURIComponent(fileName)}`;
}

function getExtension(filePath: string) {
    const ext = path.extname(filePath).toLowerCase();
    return ext || ".png";
}

function getDispImgId(value: unknown) {
    return valueToString(value).match(/^=DISPIMG\("([^"]+)"/i)?.[1] ?? "";
}

function getCloudinarySignature(params: Record<string, string>, apiSecret: string) {
    const payload = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join("&");

    return crypto.createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

function getLocalImportPath(imageUrl: string) {
    if (!imageUrl.startsWith("/api/products/import/image?")) return "";

    const url = new URL(imageUrl, "http://localhost");
    const sessionId = url.searchParams.get("sessionId") ?? "";
    const fileName = url.searchParams.get("file") ?? "";

    if (!/^[a-zA-Z0-9-]+$/.test(sessionId) || !fileName) return "";

    return getImportImagePath(sessionId, fileName);
}

function getCloudinaryPublicId(sessionId: string, filePath: string) {
    const parsed = path.parse(filePath);
    const safeName = parsed.name.replace(/[^a-zA-Z0-9_-]+/g, "_");
    return `${sessionId}_${safeName}`;
}

function parseRelationships(xml: string) {
    const relationships = new Map<string, string>();
    const relationshipRegex = /<Relationship\b([^>]+?)\/?>/g;
    let match: RegExpExecArray | null;

    while ((match = relationshipRegex.exec(xml))) {
        const attrs = match[1];
        const id = attrs.match(/\bId="([^"]+)"/)?.[1];
        const target = attrs.match(/\bTarget="([^"]+)"/)?.[1];

        if (id && target) relationships.set(id, target);
    }

    return relationships;
}

function resolveZipPath(fromDir: string, target: string) {
    return path.posix.normalize(path.posix.join(fromDir, target)).replace(/^\/+/, "");
}

function getSheetPath(zip: JSZip, workbookXml: string) {
    const firstSheetRelationshipId =
        workbookXml.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1] ??
        workbookXml.match(/<sheet\b[^>]*\bid="([^"]+)"/)?.[1];

    if (!firstSheetRelationshipId) return "xl/worksheets/sheet1.xml";

    const relsFile = zip.file("xl/_rels/workbook.xml.rels");
    if (!relsFile) return "xl/worksheets/sheet1.xml";

    return firstSheetRelationshipId;
}

async function getFirstWorksheetPath(zip: JSZip) {
    const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
    const workbookRelsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");

    if (!workbookXml || !workbookRelsXml) return "xl/worksheets/sheet1.xml";

    const relId = getSheetPath(zip, workbookXml);
    const relationships = parseRelationships(workbookRelsXml);
    const target = relationships.get(relId);

    return target ? resolveZipPath("xl", target) : "xl/worksheets/sheet1.xml";
}

function getDrawingRelationshipsPath(drawingPath: string) {
    const parsed = path.posix.parse(drawingPath);
    return path.posix.join(parsed.dir, "_rels", `${parsed.base}.rels`);
}

async function extractEmbeddedImages(buffer: Buffer, sessionId: string) {
    const zip = await JSZip.loadAsync(buffer);
    const byDispImgId = await extractDispImgImages(zip, sessionId);
    const worksheetPath = await getFirstWorksheetPath(zip);
    const worksheetXml = await zip.file(worksheetPath)?.async("string");

    if (!worksheetXml) return { byRow: new Map<number, string>(), byDispImgId };

    const worksheetRelsPath = path.posix.join(
        path.posix.dirname(worksheetPath),
        "_rels",
        `${path.posix.basename(worksheetPath)}.rels`
    );
    const worksheetRelsXml = await zip.file(worksheetRelsPath)?.async("string");

    if (!worksheetRelsXml) return { byRow: new Map<number, string>(), byDispImgId };

    const worksheetRels = parseRelationships(worksheetRelsXml);
    const drawingRelId = worksheetXml.match(/<drawing\b[^>]*\br:id="([^"]+)"/)?.[1];
    const drawingTarget = drawingRelId ? worksheetRels.get(drawingRelId) : "";

    if (!drawingTarget) return { byRow: new Map<number, string>(), byDispImgId };

    const drawingPath = resolveZipPath(path.posix.dirname(worksheetPath), drawingTarget);
    const drawingXml = await zip.file(drawingPath)?.async("string");
    const drawingRelsXml = await zip.file(getDrawingRelationshipsPath(drawingPath))?.async("string");

    if (!drawingXml || !drawingRelsXml) return { byRow: new Map<number, string>(), byDispImgId };

    const drawingRels = parseRelationships(drawingRelsXml);
    const imageByRow = new Map<number, string>();
    const anchorRegex = /<xdr:(?:twoCellAnchor|oneCellAnchor)[\s\S]*?<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/g;
    let match: RegExpExecArray | null;

    while ((match = anchorRegex.exec(drawingXml))) {
        const anchorXml = match[0];
        const row = Number(anchorXml.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/)?.[1]);
        const embedId = anchorXml.match(/<a:blip\b[^>]*\br:embed="([^"]+)"/)?.[1];
        const mediaTarget = embedId ? drawingRels.get(embedId) : "";

        if (!Number.isFinite(row) || !mediaTarget) continue;

        const mediaPath = resolveZipPath(path.posix.dirname(drawingPath), mediaTarget);
        const mediaFile = zip.file(mediaPath);
        if (!mediaFile) continue;

        const imageBuffer = await mediaFile.async("nodebuffer");
        const excelRowNumber = row + 1;
        const fileName = `row-${excelRowNumber}${getExtension(mediaPath)}`;

        await writeFile(getImportImagePath(sessionId, fileName), imageBuffer);
        imageByRow.set(excelRowNumber, getImportImageUrl(sessionId, fileName));
    }

    return { byRow: imageByRow, byDispImgId };
}

async function extractDispImgImages(zip: JSZip, sessionId: string) {
    const cellImagesXml = await zip.file("xl/cellimages.xml")?.async("string");
    const cellImagesRelsXml = await zip.file("xl/_rels/cellimages.xml.rels")?.async("string");
    const images = new Map<string, string>();

    if (!cellImagesXml || !cellImagesRelsXml) return images;

    const relationships = parseRelationships(cellImagesRelsXml);
    const cellImageRegex = /<[^:>]*:?cellImage\b[\s\S]*?<\/[^:>]*:?cellImage>/g;
    let match: RegExpExecArray | null;

    while ((match = cellImageRegex.exec(cellImagesXml))) {
        const cellImageXml = match[0];
        const id = cellImageXml.match(/\bname="([^"]+)"/)?.[1];
        const embedId = cellImageXml.match(/\b(?:r:)?embed="([^"]+)"/)?.[1];
        const mediaTarget = embedId ? relationships.get(embedId) : "";

        if (!id || !mediaTarget) continue;

        const mediaPath = resolveZipPath("xl", mediaTarget);
        const mediaFile = zip.file(mediaPath);
        if (!mediaFile) continue;

        const imageBuffer = await mediaFile.async("nodebuffer");
        const fileName = `${id.replace(/[^a-zA-Z0-9_-]/g, "_")}${getExtension(mediaPath)}`;

        await writeFile(getImportImagePath(sessionId, fileName), imageBuffer);
        images.set(id, getImportImageUrl(sessionId, fileName));
    }

    return images;
}

function normalizeRows(rows: ExcelRow[], extractedImages: ExtractedImages) {
    return rows.map((row, index) => {
        const mapped: Record<string, unknown> = {};
        const excelRowNumber = index + 2;

        for (const [header, value] of Object.entries(row)) {
            const alias = HEADER_ALIASES[normalizeHeader(header)];
            if (alias) mapped[alias] = value;
        }

        const imageValue = valueToString(mapped.imageUrl);
        const dispImgId = getDispImgId(imageValue);
        const imageUrl =
            extractedImages.byRow.get(excelRowNumber) ||
            extractedImages.byDispImgId.get(dispImgId) ||
            (dispImgId ? "" : imageValue);
        const price = valueToNumber(mapped.price);
        const importRow: ProductImportRow = {
            id: `row-${excelRowNumber}`,
            rowNumber: excelRowNumber,
            serialNumber: valueToString(mapped.serialNumber) || String(index + 1),
            imageUrl,
            categoryName: valueToString(mapped.categoryName),
            productName: valueToString(mapped.productName),
            description: valueToString(mapped.description),
            color: valueToString(mapped.color),
            weight: valueToString(mapped.weight),
            size: valueToString(mapped.size),
            brand: valueToString(mapped.brand),
            unit: valueToString(mapped.unit) || "unit",
            price,
            warnings: [],
        };

        if (!importRow.categoryName) importRow.warnings.push("Missing category");
        if (!importRow.productName) importRow.warnings.push("Missing product name");
        if (importRow.price === null) importRow.warnings.push("Invalid price");
        if (!importRow.imageUrl) {
            importRow.warnings.push(dispImgId ? "Could not extract image" : "Missing image");
        }

        return importRow;
    });
}

function getWorksheetHeaders(sheet: NonNullable<ReturnType<typeof read>["Sheets"][string]>) {
    const rows = utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: "",
        blankrows: false,
    });

    const headers = (rows[0] ?? []).map((value) => valueToString(value));

    while (headers.length && !headers[headers.length - 1]) {
        headers.pop();
    }

    return headers;
}

function validateImportHeaders(headers: string[]) {
    const received = PRODUCT_IMPORT_HEADERS.map((_, index) => headers[index] ?? "");
    const matches = PRODUCT_IMPORT_HEADERS.every(
        (header, index) => normalizeHeader(received[index] ?? "") === normalizeHeader(header)
    );

    if (matches && headers.length === PRODUCT_IMPORT_HEADERS.length) return;

    throw new Error(
        [
            "Required field doesn't match.",
            `Expected columns in this exact order: ${PRODUCT_IMPORT_HEADERS.join(", ")}`,
            `Received columns: ${headers.length ? headers.join(", ") : "none"}`,
        ].join(" ")
    );
}

export async function createProductImportSession(file: File) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const sessionId = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const workbook = read(bytes, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
        throw new Error("The Excel file does not contain any sheets.");
    }

    const sheet = workbook.Sheets[firstSheetName];
    validateImportHeaders(getWorksheetHeaders(sheet));

    await mkdir(getSessionDir(sessionId), { recursive: true });

    const rawRows = utils.sheet_to_json<ExcelRow>(sheet, {
        defval: "",
    });
    const extractedImages = await extractEmbeddedImages(bytes, sessionId);
    const session: ProductImportSession = {
        id: sessionId,
        originalFileName: file.name,
        createdAt: new Date().toISOString(),
        rows: normalizeRows(rawRows, extractedImages),
    };

    await writeFile(getProductImportSessionPath(sessionId), JSON.stringify(session, null, 2));

    return session;
}

export async function readProductImportSession(sessionId: string) {
    const contents = await readFile(getProductImportSessionPath(sessionId), "utf8");
    return JSON.parse(contents) as ProductImportSession;
}

export async function uploadImportImagesToCloudinary(sessionId: string, rows: ProductImportRow[]) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const folder =
        process.env.CLOUDINARY_UPLOAD_FOLDER ??
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER ??
        "quotation-dev/products";

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error("Cloudinary env vars are missing.");
    }

    const uploads = new Map<string, string>();

    for (const row of rows) {
        const localPath = getLocalImportPath(row.imageUrl);

        if (!localPath || uploads.has(row.imageUrl)) continue;

        const fileBuffer = await readFile(localPath);
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const paramsToSign = {
            folder,
            overwrite: "true",
            public_id: getCloudinaryPublicId(sessionId, localPath),
            timestamp,
        };
        const signature = getCloudinarySignature(paramsToSign, apiSecret);
        const form = new FormData();

        form.append(
            "file",
            new Blob([fileBuffer], { type: getImportImageContentType(localPath) }),
            path.basename(localPath)
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
            secure_url?: string;
            error?: { message?: string };
        };

        if (!response.ok || !result.secure_url) {
            throw new Error(
                `Cloudinary upload failed for row ${row.rowNumber}: ${result.error?.message ?? response.statusText}`
            );
        }

        uploads.set(row.imageUrl, result.secure_url);
    }

    return rows.map((row) => ({
        ...row,
        imageUrl: uploads.get(row.imageUrl) ?? row.imageUrl,
    }));
}

export async function deleteProductImportSession(sessionId: string) {
    await rm(getSessionDir(sessionId), { recursive: true, force: true });
}

export async function deleteProductImportRoot() {
    await rm(IMPORT_ROOT, { recursive: true, force: true });
}

export function slugifyImportValue(value: string) {
    return slugPart(value) || "category";
}
