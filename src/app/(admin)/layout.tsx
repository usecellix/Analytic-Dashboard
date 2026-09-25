import { Sidebar } from "@/components/shell/Sidebar";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
