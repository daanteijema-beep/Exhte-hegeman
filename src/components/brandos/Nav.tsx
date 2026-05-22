"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/brandos", label: "Hub" },
  { href: "/brandos/campagnes", label: "Campagnes" },
  { href: "/brandos/concurrentie", label: "Concurrentie" },
  { href: "/brandos/recruitee", label: "Recruitee" },
  { href: "/brandos/insights", label: "Inzichten" },
  { href: "/brandos/bedrijf", label: "Bedrijf" },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
        <Link href="/brandos" className="flex items-center gap-3">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full bg-accent"
            aria-hidden
          />
          <span className="font-display text-[15px] font-semibold tracking-tight">
            Hegeman <span className="text-text-dim">BrandOS</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active =
              link.href === "/brandos"
                ? pathname === "/brandos"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "rounded-full px-3.5 py-1.5 text-[13px] transition-colors",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-text-dim hover:bg-card-hover hover:text-text",
                ].join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
