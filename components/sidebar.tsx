"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft,
    ChevronRight,
    FileText,
    Folder,
    LayoutDashboard,
    Package,
    Users,
    User,
} from "lucide-react";

const SIDEBAR_COLLAPSED_KEY = "kanjirowa-sidebar-collapsed";
const SIDEBAR_COLLAPSED_EVENT = "kanjirowa-sidebar-collapsed-change";
const sidebarLinks = [
    {
        href: "/",
        label: "Overview",
        icon: LayoutDashboard,
        iconClassName: "bg-sky-400/15 text-sky-200 ring-sky-300/20",
        isActive: (pathname: string) => pathname === "/",
    },
    {
        href: "/admin/products",
        label: "Products",
        icon: Package,
        iconClassName: "bg-amber-300/15 text-amber-200 ring-amber-200/20",
        isActive: (pathname: string) => pathname.startsWith("/admin/products"),
    },
    {
        href: "/admin/category",
        label: "Categories",
        icon: Folder,
        iconClassName: "bg-emerald-300/15 text-emerald-200 ring-emerald-200/20",
        isActive: (pathname: string) => pathname.startsWith("/admin/category"),
    },
    {
        href: "/admin/quotation-files",
        label: "Quotation Files",
        icon: FileText,
        iconClassName: "bg-violet-300/15 text-violet-200 ring-violet-200/20",
        isActive: (pathname: string) => pathname.startsWith("/admin/quotation-files"),
    },
    {
        href: "/admin/users",
        label: "Users",
        icon: Users,
        iconClassName: "bg-rose-300/15 text-rose-200 ring-rose-200/20",
        isActive: (pathname: string) => pathname.startsWith("/admin/users"),
        superAdminOnly: true,
    },
] as const;

function getCollapsedSnapshot() {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

function getServerCollapsedSnapshot() {
    return false;
}

function subscribeToCollapsedChange(onStoreChange: () => void) {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener(SIDEBAR_COLLAPSED_EVENT, onStoreChange);

    return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, onStoreChange);
    };
}

type SidebarUser = {
    name: string | null;
    email: string;
    role: string;
};

export function Sidebar({
    className,
    showCollapse = true,
    user,
}: {
    className?: string;
    showCollapse?: boolean;
    user: SidebarUser;
}) {
    const pathname = usePathname();
    const collapsed = useSyncExternalStore(
        subscribeToCollapsedChange,
        getCollapsedSnapshot,
        getServerCollapsedSnapshot
    );
    const isCollapsed = showCollapse && collapsed;

    const toggleCollapsed = () => {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(!collapsed));
        window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_EVENT));
    };

    return (
        <aside
            className={cn(
                "flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl shadow-primary/10 transition-[width] duration-200",
                isCollapsed ? "w-16" : "w-64",
                className
            )}
            >
                {/* LOGO */}
                <div
                    className={cn(
                    "relative flex h-[73px] items-center gap-3 border-b border-sidebar-border px-4 py-4",
                        isCollapsed && "justify-center px-2"
                    )}
                >
                    <Link
                        href="/"
                        className={cn(
                            "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1.5 py-1 transition-colors hover:bg-sidebar-accent",
                            isCollapsed && "justify-center"
                        )}
                        title="Go to dashboard"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element -- Sidebar uses the existing small logo asset. */}
                        <img src="/main-logo.png" alt="Kanjirowa" className="h-10 shrink-0" />
                        <span
                            className={cn(
                                "min-w-0 flex-1 truncate text-lg font-semibold tracking-wide text-sidebar-foreground transition-opacity",
                                isCollapsed && "hidden"
                            )}
                        >
                            Kanjirowa
                        </span>
                    </Link>
                {showCollapse && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            collapsed && "absolute left-12 top-5 size-6 bg-card text-primary shadow-sm"
                        )}
                        onClick={toggleCollapsed}
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                )}
            </div>

            {/* MAIN CONTENT */}
            <ScrollArea className={cn("flex-1 py-4", isCollapsed ? "px-2" : "px-3")}>
                {/* DASHBOARD */}
                <div className="mb-6">
                    <p
                        className={cn(
                            "mb-2 px-2 text-xs uppercase tracking-wider text-sidebar-foreground/55",
                            isCollapsed && "sr-only"
                        )}
                    >
                        Dashboard
                    </p>

                    <SidebarLink {...sidebarLinks[0]} active={sidebarLinks[0].isActive(pathname)} collapsed={isCollapsed} />
                </div>

                {/* MANAGEMENT */}
                <div className="mb-6">
                    <p
                        className={cn(
                            "mb-2 px-2 text-xs uppercase tracking-wider text-sidebar-foreground/55",
                            isCollapsed && "sr-only"
                        )}
                    >
                        Management
                    </p>

                    {sidebarLinks.slice(1).map((item) =>
                        "superAdminOnly" in item && item.superAdminOnly && user.role !== "SUPER_ADMIN" ? null : (
                        <SidebarLink
                            key={item.href}
                            {...item}
                            active={item.isActive(pathname)}
                            collapsed={isCollapsed}
                        />
                        )
                    )}
                </div>

                <Separator className="my-4 bg-sidebar-border" />
            </ScrollArea>

            {/* BOTTOM USER SECTION */}
            <div className={cn("border-t border-sidebar-border p-4", isCollapsed && "px-2")}>
                <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-sidebar-primary/20">
                        <User size={16} />
                    </div>

                    <div className={cn("min-w-0 flex-1", isCollapsed && "hidden")}>
                        <p className="truncate text-sm font-medium">{user.name || "Admin User"}</p>
                        <p className="truncate text-xs text-sidebar-foreground/60">
                            {user.email}
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}


function SidebarLink({
    href,
    icon: Icon,
    iconClassName,
    label,
    active,
    collapsed,
}: {
    href: string;
    icon: typeof LayoutDashboard;
    iconClassName: string;
    label: string;
    active?: boolean;
    collapsed?: boolean;
}) {
    return (
        <Link
            href={href}
            title={collapsed ? label : undefined}
            className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-2 py-2 text-sm transition-all",
                collapsed && "justify-center px-2",
                active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
        >
            <span
                className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md ring-1",
                    active ? "bg-sidebar-primary-foreground/18 text-sidebar-primary-foreground ring-sidebar-primary-foreground/25" : iconClassName
                )}
            >
                <Icon size={17} />
            </span>
            <span className={cn("truncate", collapsed && "sr-only")}>{label}</span>
        </Link>
    );
}
