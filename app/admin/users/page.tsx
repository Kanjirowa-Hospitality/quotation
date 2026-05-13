"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, ShieldPlus, Trash2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, LoadingButton } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    createAdminUserSchema,
    deleteAdminUserSchema,
    getValidationError,
    updateAdminUserSchema,
} from "@/lib/validation/auth";

type AdminUser = {
    id: number;
    name: string | null;
    email: string;
    role: "ADMIN" | "SUPER_ADMIN";
    createdAt: string;
};

type UsersResponse = {
    users: AdminUser[];
};

export default function AdminUsersPage() {
    const queryClient = useQueryClient();
    const [error, setError] = useState("");
    const [editUser, setEditUser] = useState<AdminUser | null>(null);
    const [editError, setEditError] = useState("");
    const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
    const [deleteEmail, setDeleteEmail] = useState("");
    const [deleteError, setDeleteError] = useState("");

    const { data, isLoading } = useQuery<UsersResponse>({
        queryKey: ["admin-users"],
        queryFn: () => fetch("/api/admin/users").then((res) => res.json()),
    });

    const createUser = useMutation({
        mutationFn: async (formData: FormData) => {
            const response = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.get("name"),
                    email: formData.get("email"),
                    password: formData.get("password"),
                    role: "ADMIN",
                }),
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Could not create admin.");
            }

            return result;
        },
        onSuccess: () => {
            setError("");
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        },
        onError: (mutationError) => {
            setError(mutationError instanceof Error ? mutationError.message : "Could not create admin.");
        },
    });

    const updateUser = useMutation({
        mutationFn: async ({ userId, formData }: { userId: number; formData: FormData }) => {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.get("name"),
                    email: formData.get("email"),
                    password: formData.get("password"),
                }),
            });
            const result = await response.json().catch(() => ({ error: "Could not update user." }));

            if (!response.ok) {
                throw new Error(result.error || "Could not update user.");
            }

            return result;
        },
        onSuccess: () => {
            setEditError("");
            setEditUser(null);
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        },
        onError: (mutationError) => {
            setEditError(mutationError instanceof Error ? mutationError.message : "Could not update user.");
        },
    });

    const removeUser = useMutation({
        mutationFn: async ({ userId, email }: { userId: number; email: string }) => {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const result = await response.json().catch(() => ({ error: "Could not delete user." }));

            if (!response.ok) {
                throw new Error(result.error || "Could not delete user.");
            }

            return result;
        },
        onSuccess: () => {
            setDeleteError("");
            setDeleteEmail("");
            setDeleteUser(null);
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        },
        onError: (mutationError) => {
            setDeleteError(mutationError instanceof Error ? mutationError.message : "Could not delete user.");
        },
    });

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        const formData = new FormData(event.currentTarget);
        const validation = createAdminUserSchema.safeParse({
            name: formData.get("name"),
            email: formData.get("email"),
            password: formData.get("password"),
        });

        if (!validation.success) {
            setError(getValidationError(validation.error));
            return;
        }

        createUser.mutate(formData);
        event.currentTarget.reset();
    }

    function openEditDialog(user: AdminUser) {
        setEditUser(user);
        setEditError("");
    }

    function openDeleteDialog(user: AdminUser) {
        setDeleteUser(user);
        setDeleteEmail("");
        setDeleteError("");
    }

    function onEditSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!editUser) return;

        setEditError("");
        const formData = new FormData(event.currentTarget);
        const validation = updateAdminUserSchema.safeParse({
            name: formData.get("name"),
            email: formData.get("email"),
            password: formData.get("password"),
        });

        if (!validation.success) {
            setEditError(getValidationError(validation.error));
            return;
        }

        updateUser.mutate({ userId: editUser.id, formData });
    }

    function onDeleteSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!deleteUser) return;

        setDeleteError("");
        const validation = deleteAdminUserSchema.safeParse({ email: deleteEmail });

        if (!validation.success) {
            setDeleteError(getValidationError(validation.error));
            return;
        }

        if (validation.data.email !== deleteUser.email) {
            setDeleteError("Type the user's email exactly to confirm deletion.");
            return;
        }

        removeUser.mutate({ userId: deleteUser.id, email: validation.data.email });
    }

    return (
        <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
            <section className="rounded-md border bg-background p-4 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <UserPlus className="size-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold">Add Admin</h2>
                        <p className="text-sm text-muted-foreground">Create an account for a new admin.</p>
                    </div>
                </div>

                <form className="space-y-4" onSubmit={onSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" type="text" autoComplete="name" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" autoComplete="email" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Temporary password</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            minLength={8}
                            required
                        />
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <LoadingButton
                        type="submit"
                        className="w-full"
                        loading={createUser.isPending}
                        loadingText="Creating..."
                    >
                        <ShieldPlus className="size-4" />
                        Create Admin
                    </LoadingButton>
                </form>
            </section>

            <section className="min-w-0 rounded-md border bg-background shadow-sm">
                <div className="border-b p-4">
                    <h2 className="text-xl font-semibold">Users</h2>
                    <p className="text-sm text-muted-foreground">{data?.users.length ?? 0} accounts</p>
                </div>

                <div className="overflow-auto">
                    <table className="min-w-[640px] w-full caption-bottom text-xs">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        Loading users...
                                    </TableCell>
                                </TableRow>
                            )}
                            {data?.users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name || "-"}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === "SUPER_ADMIN" ? "default" : "secondary"}>
                                            {user.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                                                <Pencil className="size-3" />
                                                Edit
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(user)}>
                                                <Trash2 className="size-3" />
                                                Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </table>
                </div>
            </section>

            <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Update this admin account directly. Leave password blank to keep the current password.
                        </DialogDescription>
                    </DialogHeader>

                    {editUser && (
                        <form className="space-y-4" onSubmit={onEditSubmit}>
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Name</Label>
                                <Input
                                    id="edit-name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    defaultValue={editUser.name || ""}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-email">Email</Label>
                                <Input
                                    id="edit-email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    defaultValue={editUser.email}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-password">New password</Label>
                                <Input
                                    id="edit-password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    minLength={8}
                                    placeholder="Leave blank to keep current password"
                                />
                            </div>

                            {editError && <p className="text-sm text-destructive">{editError}</p>}

                            <LoadingButton
                                type="submit"
                                className="w-full"
                                loading={updateUser.isPending}
                                loadingText="Saving..."
                            >
                                <Pencil className="size-4" />
                                Save changes
                            </LoadingButton>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                            This permanently deletes the account and its sessions. Type the user&apos;s email to confirm.
                        </DialogDescription>
                    </DialogHeader>

                    {deleteUser && (
                        <form className="space-y-4" onSubmit={onDeleteSubmit}>
                            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
                                <p className="font-medium text-destructive">{deleteUser.email}</p>
                                <p className="text-muted-foreground">{deleteUser.name || "No name"}</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="delete-email">Confirm email</Label>
                                <Input
                                    id="delete-email"
                                    value={deleteEmail}
                                    onChange={(event) => setDeleteEmail(event.target.value)}
                                    autoComplete="off"
                                    placeholder={deleteUser.email}
                                    required
                                />
                            </div>

                            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}

                            <LoadingButton
                                type="submit"
                                variant="destructive"
                                className="w-full"
                                loading={removeUser.isPending}
                                loadingText="Deleting..."
                                disabled={removeUser.isPending || deleteEmail.trim().toLowerCase() !== deleteUser.email}
                            >
                                <Trash2 className="size-4" />
                                Delete user
                            </LoadingButton>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
