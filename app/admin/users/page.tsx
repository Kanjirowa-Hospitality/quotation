"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, MailCheck, ShieldPlus, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    const [resetUser, setResetUser] = useState<AdminUser | null>(null);
    const [resetError, setResetError] = useState("");
    const [resetMessage, setResetMessage] = useState("");

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

    const sendResetCode = useMutation({
        mutationFn: async (userId: number) => {
            const response = await fetch(`/api/admin/users/${userId}/password-reset`, {
                method: "POST",
            });
            const result = await response.json().catch(() => ({ error: "Could not send the reset code." }));

            if (!response.ok) {
                throw new Error(result.error || "Could not send the reset code.");
            }

            return result;
        },
        onSuccess: () => {
            setResetError("");
            setResetMessage("Verification code sent to the user's email.");
        },
        onError: (mutationError) => {
            setResetMessage("");
            setResetError(mutationError instanceof Error ? mutationError.message : "Could not send the reset code.");
        },
    });

    const resetPassword = useMutation({
        mutationFn: async ({ userId, formData }: { userId: number; formData: FormData }) => {
            const response = await fetch(`/api/admin/users/${userId}/password-reset`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: formData.get("code"),
                    password: formData.get("password"),
                }),
            });
            const result = await response.json().catch(() => ({ error: "Could not reset the password." }));

            if (!response.ok) {
                throw new Error(result.error || "Could not reset the password.");
            }

            return result;
        },
        onSuccess: () => {
            setResetError("");
            setResetMessage("Password updated. The user can sign in with the new password.");
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        },
        onError: (mutationError) => {
            setResetMessage("");
            setResetError(mutationError instanceof Error ? mutationError.message : "Could not reset the password.");
        },
    });

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        createUser.mutate(new FormData(event.currentTarget));
        event.currentTarget.reset();
    }

    function openResetDialog(user: AdminUser) {
        setResetUser(user);
        setResetError("");
        setResetMessage("");
    }

    function onResetSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!resetUser) return;

        setResetError("");
        resetPassword.mutate({ userId: resetUser.id, formData: new FormData(event.currentTarget) });
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

                    <Button type="submit" className="w-full" disabled={createUser.isPending}>
                        <ShieldPlus className="size-4" />
                        {createUser.isPending ? "Creating..." : "Create Admin"}
                    </Button>
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
                                        <Button variant="outline" size="sm" onClick={() => openResetDialog(user)}>
                                            <KeyRound className="size-3" />
                                            Reset
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </table>
                </div>
            </section>

            <Dialog open={!!resetUser} onOpenChange={(open) => !open && setResetUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Send a verification code, then enter the code and the new password.
                        </DialogDescription>
                    </DialogHeader>

                    {resetUser && (
                        <div className="space-y-4">
                            <div className="rounded-md border bg-muted/30 p-3">
                                <p className="font-medium">{resetUser.name || resetUser.email}</p>
                                <p className="text-muted-foreground">{resetUser.email}</p>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                disabled={sendResetCode.isPending}
                                onClick={() => sendResetCode.mutate(resetUser.id)}
                            >
                                <MailCheck className="size-4" />
                                {sendResetCode.isPending ? "Sending..." : "Send verification code"}
                            </Button>

                            <form className="space-y-3" onSubmit={onResetSubmit}>
                                <div className="space-y-2">
                                    <Label htmlFor="reset-code">Verification code</Label>
                                    <Input id="reset-code" name="code" inputMode="numeric" maxLength={6} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reset-password">New password</Label>
                                    <Input
                                        id="reset-password"
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        minLength={8}
                                        required
                                    />
                                </div>

                                {resetError && <p className="text-sm text-destructive">{resetError}</p>}
                                {resetMessage && <p className="text-sm text-muted-foreground">{resetMessage}</p>}

                                <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
                                    <KeyRound className="size-4" />
                                    {resetPassword.isPending ? "Updating..." : "Set new password"}
                                </Button>
                            </form>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
