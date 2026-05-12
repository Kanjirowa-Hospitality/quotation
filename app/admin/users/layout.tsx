import { requireSuperAdmin } from "@/lib/auth";

export default async function UsersLayout({ children }: { children: React.ReactNode }) {
    await requireSuperAdmin();

    return children;
}
