import crypto from "crypto";

type DeleteCloudinaryAssetInput = {
    publicId?: string | null;
    resourceType?: string | null;
};

function getCloudinarySignature(params: Record<string, string>, apiSecret: string) {
    const payload = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join("&");

    return crypto.createHash("sha1").update(payload + apiSecret).digest("hex");
}

export async function deleteCloudinaryAsset({ publicId, resourceType }: DeleteCloudinaryAssetInput) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret || !publicId) return;

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const paramsToSign = {
        public_id: publicId,
        timestamp,
    };
    const signature = getCloudinarySignature(paramsToSign, apiSecret);
    const body = new URLSearchParams({
        ...paramsToSign,
        api_key: apiKey,
        signature,
    });
    const safeResourceType = resourceType === "image" || resourceType === "video" || resourceType === "raw"
        ? resourceType
        : "raw";

    await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${safeResourceType}/destroy`, {
        method: "POST",
        body,
    });
}
