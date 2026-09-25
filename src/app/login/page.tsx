import type { Metadata } from "next";
import { Logo } from "@/components/shell/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
          <h1 className="text-lg font-semibold text-ink">Sign in to admin</h1>
          <p className="mt-1 mb-6 text-sm text-ink-2">Internal dashboard for the Cellix team.</p>
          <LoginForm next={next ?? "/"} />
        </div>
      </div>
    </main>
  );
}
