"use client";

import Image from "next/image";
import Link from "next/link";

import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuSub,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar";

import { Home, Package, FileText } from "lucide-react";

const categories = [
    "Housekeeping",
    "Cleaning",
    "Kitchen",
    "Laundry",
    "Amenities",
    "Furniture",
    "Electronics",
    "Safety",
    "Stationery",
    "Outdoor",
    "Misc",
];

export default function AppSidebar() {
    return (
        <Sidebar>

            {/* 🔥 HEADER */}
            <SidebarHeader>
                <Link href="/admin" className="flex items-center gap-2 px-2 py-2">
                    <Image
                        src="/logo.png"   // put your logo in public/
                        alt="Kanjirowa"
                        width={32}
                        height={32}
                    />
                    <span className="font-semibold text-3xl">Kanjirowa</span>
                </Link>
            </SidebarHeader>

            <SidebarContent>

                {/* 🔥 DASHBOARD + SUBMENU */}
                <SidebarGroup>
                    <SidebarGroupContent>

                        <SidebarMenu>

                            {/* Dashboard Main */}
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <Home />
                                    Dashboard
                                </SidebarMenuButton>

                                {/* Submenu */}
                                <SidebarMenuSub>

                                    <SidebarMenuSubItem>
                                        <Link href="/">
                                            All Categories
                                        </Link>
                                    </SidebarMenuSubItem>

                                    {categories.map((cat) => (
                                        <SidebarMenuSubItem key={cat}>
                                            <Link href={`/admin/category/${cat.toLowerCase()}`}>
                                                {cat}
                                            </Link>
                                        </SidebarMenuSubItem>
                                    ))}

                                </SidebarMenuSub>
                            </SidebarMenuItem>

                            {/* Products */}
                            {/* <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <Link href="/admin/products">
                                        <Package />
                                        Products
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem> */}

                            {/* Quotations */}
                            {/* <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <Link href="/admin/quotation">
                                        <FileText />
                                        Quotations
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem> */}

                        </SidebarMenu>

                    </SidebarGroupContent>
                </SidebarGroup>

            </SidebarContent>
        </Sidebar>
    );
}