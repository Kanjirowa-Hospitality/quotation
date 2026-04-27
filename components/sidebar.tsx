'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Category } from '@/app/generated/prisma/client'
import { useQuery } from '@tanstack/react-query'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

export function Sidebar() {
    const { data: cats } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: () => fetch('/api/categories').then((r) => r.json()),
    })
    const pathname = usePathname()

    return (
        <aside className="w-64 bg-card border-r flex flex-col">
            <div className="p-4 flex items-center gap-2">
                <img src="/logo-png.png" alt="Kanjirow" className="h-16" />
                <span className="font-bold text-2xl uppercase">Kanjirow</span>
            </div>
            <Separator />
            <ScrollArea className="flex-1 px-4 py-4">

                <nav className='my-2'>
                    <Link href={'/admin/products'}> Products</Link>
                </nav>

                <nav className='my-4'>
                    <Link href={'/admin/items'}> Items</Link>
                </nav>
                <Link href={'/admin/category'}> Categories</Link>
                <Separator />
                <nav className="space-y-2">
                    {cats?.map((c) => (
                        <Link
                            key={c.id}
                            href={`/?category=${c.slug}`}
                            className={cn(
                                'flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent',
                                pathname === `/?category=${c.slug}` && 'bg-accent font-semibold'
                            )}
                        >
                            {c.name}
                        </Link>
                    ))}
                </nav>
            </ScrollArea>
        </aside >
    )
}