import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const user = await requireAdmin();

    return <AppShell user={{ name: user.name, email: user.email, role: user.role }}>{children}</AppShell>
}
