"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CldUploadButton, type CloudinaryUploadWidgetResults } from "next-cloudinary";
import { ExternalLink, FileText, LoaderCircle, Pencil, Trash2, Upload, X } from "lucide-react";
import { Button, LoadingButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    cloudinaryFileUploadOptions,
    cloudinaryMaxFileSizeLabel,
    cloudinaryUploadPreset,
    getUploadedCloudinaryFileUrl,
    type CloudinaryUploadInfo,
} from "@/lib/cloudinary";

type QuotationFileType = "LINNEN" | "AMMENITIES" | "DIVERSY" | "ECOGENIS" | "KHARCHER";

type QuotationFile = {
    id: string;
    type: QuotationFileType;
    title: string;
    fileUrl: string;
    cloudinaryPublicId: string | null;
    cloudinaryResource: string | null;
    originalFilename: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
};

type FormState = {
    id: string | null;
    type: QuotationFileType;
    title: string;
    fileUrl: string;
    cloudinaryPublicId: string;
    cloudinaryResource: string;
    originalFilename: string;
    notes: string;
};

const fileTypes: Array<{ value: QuotationFileType; label: string }> = [
    { value: "LINNEN", label: "Linnen" },
    { value: "AMMENITIES", label: "Ammenities" },
    { value: "DIVERSY", label: "Diversy" },
    { value: "ECOGENIS", label: "Ecogenis" },
    { value: "KHARCHER", label: "Kharcher" },
];

const emptyForm = (): FormState => ({
    id: null,
    type: "LINNEN",
    title: "",
    fileUrl: "",
    cloudinaryPublicId: "",
    cloudinaryResource: "",
    originalFilename: "",
    notes: "",
});

function getTypeLabel(type: QuotationFileType) {
    return fileTypes.find((item) => item.value === type)?.label ?? type;
}

function getFileName(file: QuotationFile) {
    if (file.originalFilename) return file.originalFilename;

    try {
        return decodeURIComponent(new URL(file.fileUrl).pathname.split("/").pop() ?? "File");
    } catch {
        return "File";
    }
}

export default function AdminQuotationFilesPage() {
    const queryClient = useQueryClient();
    const [form, setForm] = useState<FormState>(emptyForm);
    const [typeFilter, setTypeFilter] = useState<QuotationFileType | "ALL">("ALL");
    const [error, setError] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const { data: files = [], isLoading, isFetching } = useQuery<QuotationFile[]>({
        queryKey: ["quotation-files"],
        queryFn: () => fetch("/api/quotation-files").then((res) => res.json()),
    });

    const filteredFiles = useMemo(() => {
        if (typeFilter === "ALL") return files;
        return files.filter((file) => file.type === typeFilter);
    }, [files, typeFilter]);

    const countsByType = useMemo(() => {
        return files.reduce<Record<string, number>>((counts, file) => {
            counts[file.type] = (counts[file.type] ?? 0) + 1;
            return counts;
        }, {});
    }, [files]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            setError("");
            const payload = {
                type: form.type,
                title: form.title,
                fileUrl: form.fileUrl,
                cloudinaryPublicId: form.cloudinaryPublicId,
                cloudinaryResource: form.cloudinaryResource,
                originalFilename: form.originalFilename,
                notes: form.notes,
            };
            const response = await fetch(form.id ? `/api/quotation-files/${form.id}` : "/api/quotation-files", {
                method: form.id ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Could not save quotation file.");
            }

            return result as QuotationFile;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quotation-files"] });
            setForm(emptyForm());
        },
        onError: (mutationError) => {
            setError(mutationError instanceof Error ? mutationError.message : "Could not save quotation file.");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/quotation-files/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Could not delete quotation file.");
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quotation-files"] });
        },
        onError: (mutationError) => {
            setError(mutationError instanceof Error ? mutationError.message : "Could not delete quotation file.");
        },
        onSettled: () => setDeletingId(null),
    });

    const onUploadSuccess = (result: CloudinaryUploadWidgetResults) => {
        const info = result.info as CloudinaryUploadInfo | undefined;
        const uploadedUrl = getUploadedCloudinaryFileUrl(info);

        if (!uploadedUrl) {
            alert(`File must be ${cloudinaryMaxFileSizeLabel} or less.`);
            return;
        }

        setForm((current) => ({
            ...current,
            fileUrl: uploadedUrl,
            cloudinaryPublicId: info?.public_id ?? "",
            cloudinaryResource: info?.resource_type ?? "",
            originalFilename: info?.original_filename
                ? `${info.original_filename}${info.format ? `.${info.format}` : ""}`
                : current.originalFilename,
            title: current.title || info?.original_filename || "",
        }));
    };

    const editFile = (file: QuotationFile) => {
        setError("");
        setForm({
            id: file.id,
            type: file.type,
            title: file.title,
            fileUrl: file.fileUrl,
            cloudinaryPublicId: file.cloudinaryPublicId ?? "",
            cloudinaryResource: file.cloudinaryResource ?? "",
            originalFilename: file.originalFilename ?? "",
            notes: file.notes ?? "",
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const deleteFile = (file: QuotationFile) => {
        const confirmed = confirm(`Delete "${file.title}"?`);
        if (!confirmed) return;

        setDeletingId(file.id);
        deleteMutation.mutate(file.id);
    };

    return (
        <div className="flex min-h-0 flex-col gap-4 md:h-[calc(100vh-10rem)] md:overflow-hidden">
            <div className="shrink-0 rounded-md border bg-background p-4 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                        <h2 className="text-2xl font-semibold">Quotation Files</h2>
                        <p className="text-sm text-muted-foreground">
                            {files.length} uploaded files
                            {isFetching && !isLoading ? " · refreshing..." : ""}
                        </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-5">
                        {fileTypes.map((type) => (
                            <Button
                                key={type.value}
                                type="button"
                                variant={typeFilter === type.value ? "default" : "outline"}
                                onClick={() => setTypeFilter(type.value)}
                                className="justify-between"
                            >
                                <span>{type.label}</span>
                                <span>{countsByType[type.value] ?? 0}</span>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[380px_1fr]">
                <div className="min-h-0 overflow-auto rounded-md border bg-background p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="font-semibold">{form.id ? "Edit file" : "Add file"}</h3>
                            <p className="text-sm text-muted-foreground">Upload the quotation file to Cloudinary.</p>
                        </div>
                        {form.id && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Cancel edit"
                                onClick={() => {
                                    setForm(emptyForm());
                                    setError("");
                                }}
                            >
                                <X />
                            </Button>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>File Group</Label>
                            <Select
                                value={form.type}
                                onValueChange={(value) =>
                                    setForm((current) => ({ ...current, type: value as QuotationFileType }))
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {fileTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Title</Label>
                            <Input
                                value={form.title}
                                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                                placeholder="Quotation file title"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>File</Label>
                            <CldUploadButton
                                uploadPreset={cloudinaryUploadPreset}
                                options={cloudinaryFileUploadOptions}
                                onSuccess={onUploadSuccess}
                                className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-dashed px-3 text-sm transition-colors hover:bg-muted"
                            >
                                <Upload className="h-4 w-4" />
                                Upload File
                            </CldUploadButton>
                            {form.fileUrl && (
                                <a
                                    href={form.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                                >
                                    <FileText className="h-4 w-4 shrink-0" />
                                    <span className="min-w-0 flex-1 truncate">
                                        {form.originalFilename || form.fileUrl}
                                    </span>
                                    <ExternalLink className="h-4 w-4 shrink-0" />
                                </a>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label>Notes</Label>
                            <Textarea
                                value={form.notes}
                                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                                placeholder="Optional notes"
                                rows={4}
                            />
                        </div>

                        {error && <p className="text-sm text-destructive">{error}</p>}

                        <LoadingButton
                            type="button"
                            loading={saveMutation.isPending}
                            loadingText="Saving..."
                            disabled={!form.title.trim() || !form.fileUrl}
                            onClick={() => saveMutation.mutate()}
                            className="w-full"
                        >
                            {form.id ? "Update File" : "Add File"}
                        </LoadingButton>
                    </div>
                </div>

                <div className="min-h-0 overflow-auto rounded-md border">
                    <table className="min-w-[780px] w-full caption-bottom text-xs">
                        <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:shadow-[inset_0_-1px_0_0_var(--border)]">
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Group</TableHead>
                                <TableHead>File</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead>Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Loading quotation files...
                                    </TableCell>
                                </TableRow>
                            )}

                            {!isLoading && filteredFiles.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No quotation files found.
                                    </TableCell>
                                </TableRow>
                            )}

                            {filteredFiles.map((file) => {
                                const isDeleting = deletingId === file.id && deleteMutation.isPending;

                                return (
                                    <TableRow key={file.id}>
                                        <TableCell className="font-medium whitespace-normal">{file.title}</TableCell>
                                        <TableCell>{getTypeLabel(file.type)}</TableCell>
                                        <TableCell>
                                            <a
                                                href={file.fileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex max-w-52 items-center gap-2 text-primary hover:underline"
                                            >
                                                <FileText className="h-4 w-4 shrink-0" />
                                                <span className="truncate">{getFileName(file)}</span>
                                            </a>
                                        </TableCell>
                                        <TableCell className="max-w-xs whitespace-normal text-muted-foreground">
                                            {file.notes || "-"}
                                        </TableCell>
                                        <TableCell>{new Date(file.updatedAt).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Edit ${file.title}`}
                                                    onClick={() => editFile(file)}
                                                >
                                                    <Pencil className="text-yellow-500" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Delete ${file.title}`}
                                                    aria-busy={isDeleting}
                                                    disabled={isDeleting}
                                                    onClick={() => deleteFile(file)}
                                                >
                                                    {isDeleting ? (
                                                        <LoaderCircle className="animate-spin text-red-500" />
                                                    ) : (
                                                        <Trash2 className="text-red-500" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </table>
                </div>
            </div>
        </div>
    );
}
