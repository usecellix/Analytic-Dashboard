"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";
import { Logo } from "./Logo";

const NAV = [
  { href: "/", label: "Overview", icon: "M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z" },
  { href: "/prompts", label: "Prompts", icon: "M4 5h16M4 12h16M4 19h10" },
  { href: "/models", label: "Models & cost", icon: "M4 20V10m6 10V4m6 16v-7m4 7H2" },
  { href: "/users", label: "Users", icon: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1m18 0v-1a4 4 0 0 0-3-3.87M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8m7-7.87a4 4 0 0 1 0 7.75" },
  { href: "/billing", label: "Billing", icon: "M2 7h20v12H2zM2 11h20M6 15h4" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function Icon({ d }: { d: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  const links = NAV.map((item) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm transition ${
          active ? "bg-surface font-medium text-ink shadow-card ring-1 ring-line" : "text-ink-2 hover:bg-surface-hover hover:text-ink"
        }`}
      >
        <Icon d={item.icon} />
        {item.label}
      </Link>
    );
  });

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface-2 px-3 py-4 md:flex">
        <div className="px-2.5 pb-6">
          <Logo />
        </div>
        <nav className="flex flex-col gap-0.5">{links}</nav>
        <form action={logout} className="mt-auto">
          <button type="submit" className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-ink-2 transition hover:bg-surface-hover hover:text-ink">
            Sign out
          </button>
        </form>
      </aside>

      <header className="sticky top-0 z-10 border-b border-line bg-surface-2/95 backdrop-blur md:hidden" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="flex items-center justify-between px-4 py-3">
          <Logo />
          <form action={logout}>
            <button type="submit" className="text-sm text-ink-2">Sign out</button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">{links}</nav>
      </header>
    </>
  );
}
