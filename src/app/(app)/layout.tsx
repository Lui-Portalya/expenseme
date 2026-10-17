import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import { Sidebar } from "@/components/Sidebar";
import { btnGhost } from "@/components/ui";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row">
      <aside className="md:w-52 md:shrink-0">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 font-bold text-white">$</div>
          <span className="font-semibold tracking-tight">Expense Me</span>
        </div>
        <Sidebar />
        <div className="mt-6 hidden border-t border-stone-200 pt-4 md:block">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="mb-3 truncate text-xs text-stone-500">{user.email}</p>
          <form action={logoutAction}>
            <button className={`${btnGhost} w-full`}>Sign out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        {children}
        <form action={logoutAction} className="mt-8 md:hidden">
          <button className={`${btnGhost} w-full`}>Sign out</button>
        </form>
      </main>
    </div>
  );
}
