"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Package, Folder, LayoutDashboard, User } from "lucide-react";

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 h-screen flex flex-col border-r bg-white">
            {/* LOGO */}
            <div className="px-5 py-4 flex items-center gap-3 border-b">
                <img src="/logo-png.png" alt="Kanjirow" className="h-10" />
                <span className="font-semibold text-lg tracking-wide">
                    Kanjirowa
                </span>
            </div>

            {/* MAIN CONTENT */}
            <ScrollArea className="flex-1 px-3 py-4">
                {/* DASHBOARD */}
                <div className="mb-6">
                    <p className="text-xs text-muted-foreground px-2 mb-2 uppercase tracking-wider">
                        Dashboard
                    </p>

                    <SidebarLink
                        href="/"
                        icon={<LayoutDashboard size={18} />}
                        label="Overview"
                        active={pathname === "/"}
                    />
                </div>

                {/* MANAGEMENT */}
                <div className="mb-6">
                    <p className="text-xs text-muted-foreground px-2 mb-2 uppercase tracking-wider">
                        Management
                    </p>

                    <SidebarLink
                        href="/admin/products"
                        icon={<Package size={18} />}
                        label="Products"
                        active={pathname.startsWith("/admin/products")}
                    />

                    <SidebarLink
                        href="/admin/category"
                        icon={<Folder size={18} />}
                        label="Categories"
                        active={pathname.startsWith("/admin/category")}
                    />
                </div>

                <Separator className="my-4" />
            </ScrollArea>

            {/* BOTTOM USER SECTION */}
            <div className="border-t p-4">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                        <User size={16} />
                    </div>

                    <div className="flex-1">
                        <p className="text-sm font-medium">Admin User</p>
                        <p className="text-xs text-muted-foreground">
                            admin@kanjirowa.com
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}


function SidebarLink({
    href,
    icon,
    label,
    active,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    active?: boolean;
}) {
    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all",
                active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
        >
            {icon}
            <span>{label}</span>
        </Link>
    );
}
