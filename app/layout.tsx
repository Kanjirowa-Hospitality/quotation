import type { Metadata } from "next";
import { Geist_Mono, Monda } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import QueryProviders from "@/lib/query-client";

// Change the main app font here if Monda does not match the final brand direction.
const monda = Monda({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kanjirowa Quotation ",
  description: "A quotation management system for Kanjirowa, built with Next.js, Prisma, and Tailwind CSS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", monda.variable, geistMono.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col">
        <QueryProviders>
          {children}
        </QueryProviders>
      </body>
    </html>
  );
}
