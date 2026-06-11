import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";

type AppShellUser = {
  name: string | null;
  email: string;
  role: string;
};

export function AppShell({ children, user }: { children: React.ReactNode; user: AppShellUser }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar className="hidden md:flex" user={user} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 sm:p-4 lg:p-5">{children}</main>
      </div>
    </div>
  );
}
