import { requireSuperAdmin } from "@/lib/auth";

export default async function ProductImportLayout({ children }: { children: React.ReactNode }) {
    await requireSuperAdmin();

    return children;
}
