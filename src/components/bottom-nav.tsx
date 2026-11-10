"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/challenges", label: "Challenges", icon: "🎡" },
  { href: "/squads", label: "Squads", icon: "👥" },
  { href: "/leagues", label: "Leagues", icon: "🏆" },
  { href: "/me", label: "Me", icon: "🙂" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-40 mt-auto border-t border-black/5 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                  active ? "text-brand" : "text-muted"
                }`}
              >
                <span className={`text-xl ${active ? "" : "grayscale opacity-70"}`}>{t.icon}</span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
