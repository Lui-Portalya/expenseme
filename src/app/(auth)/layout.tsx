import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-700 text-xl font-bold text-white">
            $
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Expense Me</h1>
          <p className="mt-1 text-sm text-stone-500">Know where your money goes.</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
