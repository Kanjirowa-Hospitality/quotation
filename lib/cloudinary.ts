export const cloudinaryUploadPreset =
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "kanjirowa_upload";

export const cloudinaryUploadFolder =
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER ?? "kanjirowa_dev/dev";

export const cloudinaryUploadOptions = {
    folder: cloudinaryUploadFolder,
    multiple: false,
    resourceType: "image",
} as const;
