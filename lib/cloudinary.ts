import type { CloudinaryUploadWidgetOptions } from "next-cloudinary";

export const cloudinaryUploadPreset =
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "kanjirowa_upload";

export const cloudinaryUploadFolder =
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER ?? "kanjirowa_dev/dev";

export const cloudinaryMaxImageSizeBytes = 2 * 1024 * 1024;
export const cloudinaryMaxImageSizeLabel = "2 MB";
export const cloudinaryMaxFileSizeBytes = 15 * 1024 * 1024;
export const cloudinaryMaxFileSizeLabel = "15 MB";

export const cloudinaryUploadOptions: CloudinaryUploadWidgetOptions = {
    folder: cloudinaryUploadFolder,
    multiple: false,
    resourceType: "image",
    clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
    maxFileSize: cloudinaryMaxImageSizeBytes,
    maxImageFileSize: cloudinaryMaxImageSizeBytes,
};

export const cloudinaryFileUploadOptions: CloudinaryUploadWidgetOptions = {
    folder: `${cloudinaryUploadFolder}/quotation-files`,
    multiple: false,
    resourceType: "auto",
    clientAllowedFormats: ["pdf", "doc", "docx", "xls", "xlsx", "csv", "jpg", "jpeg", "png", "webp"],
    maxFileSize: cloudinaryMaxFileSizeBytes,
};

export type CloudinaryUploadInfo = {
    secure_url?: string;
    bytes?: number;
    public_id?: string;
    resource_type?: string;
    original_filename?: string;
    format?: string;
};

export function getOptimizedCloudinaryImageUrl(url: string) {
    if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
        return url;
    }

    return url.replace("/upload/", "/upload/q_auto:eco,c_limit,w_1600/");
}

export function getUploadedCloudinaryImageUrl(info: CloudinaryUploadInfo | undefined) {
    if (!info?.secure_url) return "";
    if (info.bytes && info.bytes > cloudinaryMaxImageSizeBytes) return "";

    return getOptimizedCloudinaryImageUrl(info.secure_url);
}

export function getUploadedCloudinaryFileUrl(info: CloudinaryUploadInfo | undefined) {
    if (!info?.secure_url) return "";
    if (info.bytes && info.bytes > cloudinaryMaxFileSizeBytes) return "";

    return info.secure_url;
}
