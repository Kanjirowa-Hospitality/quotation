"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft,
    ChevronRight,
    Folder,
    LayoutDashboard,
    Package,
    User,
} from "lucide-react";

export function Sidebar({
    className,
    showCollapse = true,
}: {
    className?: string;
    showCollapse?: boolean;
}) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const isCollapsed = showCollapse && collapsed;

    useEffect(() => {
        setCollapsed(localStorage.getItem("kanjirowa-sidebar-collapsed") === "true");
    }, []);

    const toggleCollapsed = () => {
        setCollapsed((current) => {
            const next = !current;
            localStorage.setItem("kanjirowa-sidebar-collapsed", String(next));
            return next;
        });
    };

    return (
        <aside
            className={cn(
                "h-screen flex shrink-0 flex-col border-r bg-white transition-[width] duration-200",
                isCollapsed ? "w-16" : "w-64",
                className
            )}
        >
            {/* LOGO */}
            <div
                className={cn(
                    "relative px-4 py-4 flex h-[73px] items-center gap-3 border-b",
                    isCollapsed && "justify-center px-2"
                )}
            >
                <img src="/logo-png.png" alt="Kanjirow" className="h-10 shrink-0" />
                <span
                    className={cn(
                        "min-w-0 flex-1 truncate font-semibold text-lg tracking-wide transition-opacity",
                        isCollapsed && "hidden"
                    )}
                >
                    Kanjirowa
                </span>
                {showCollapse && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn("shrink-0", collapsed && "absolute left-12 top-5 size-6 bg-white shadow-sm")}
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
                            "text-xs text-muted-foreground px-2 mb-2 uppercase tracking-wider",
                            isCollapsed && "sr-only"
                        )}
                    >
                        Dashboard
                    </p>

                    <SidebarLink
                        href="/"
                        icon={<LayoutDashboard size={18} />}
                        label="Overview"
                        active={pathname === "/"}
                        collapsed={isCollapsed}
                    />
                </div>

                {/* MANAGEMENT */}
                <div className="mb-6">
                    <p
                        className={cn(
                            "text-xs text-muted-foreground px-2 mb-2 uppercase tracking-wider",
                            isCollapsed && "sr-only"
                        )}
                    >
                        Management
                    </p>

                    <SidebarLink
                        href="/admin/products"
                        icon={<Package size={18} />}
                        label="Products"
                        active={pathname.startsWith("/admin/products")}
                        collapsed={isCollapsed}
                    />

                    <SidebarLink
                        href="/admin/category"
                        icon={<Folder size={18} />}
                        label="Categories"
                        active={pathname.startsWith("/admin/category")}
                        collapsed={isCollapsed}
                    />
                </div>

                <Separator className="my-4" />
            </ScrollArea>

            {/* BOTTOM USER SECTION */}
            <div className={cn("border-t p-4", isCollapsed && "px-2")}>
                <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                        <User size={16} />
                    </div>

                    <div className={cn("min-w-0 flex-1", isCollapsed && "hidden")}>
                        <p className="text-sm font-medium">Admin User</p>
                        <p className="truncate text-xs text-muted-foreground">
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
    collapsed,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    collapsed?: boolean;
}) {
    return (
        <Link
            href={href}
            title={collapsed ? label : undefined}
            className={cn(
                "flex h-9 items-center gap-3 rounded-md px-3 py-2 text-sm transition-all",
                collapsed && "justify-center px-2",
                active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
        >
            <span className="shrink-0">{icon}</span>
            <span className={cn("truncate", collapsed && "sr-only")}>{label}</span>
        </Link>
    );
}
