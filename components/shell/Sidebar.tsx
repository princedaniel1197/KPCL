"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { NAV } from "@/lib/nav";
import { t, type Lang } from "@/lib/i18n";

export function Sidebar({ lang, onNavigate }: { lang: Lang; onNavigate?: () => void }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString() ? `?${sp.toString()}` : "";

  // Longest-prefix match so /coal/ledger highlights only "Rake Ledger", not "Coal Dashboard".
  const allHrefs = NAV.flatMap((g) => g.items.map((i) => i.href));
  const activeHref = allHrefs
    .filter((h) => pathname === h || pathname.startsWith(h === "/" ? "/__never" : h + "/"))
    .sort((a, b) => b.length - a.length)[0] ?? (pathname === "/" ? "/" : undefined);

  return (
    <aside className="h-full overflow-y-auto bg-panel border-r border-rule/60 flex flex-col">
      <div className="px-5 pt-5 pb-3 border-b-[1.5px] border-gold">
        <Link href={`/${qs}`} onClick={onNavigate}>
          <div className="font-serif text-2xl font-semibold tracking-wide">{t(lang, "appName")}</div>
          <div className="text-[0.65rem] text-muted uppercase tracking-[0.14em] mt-0.5">
            {t(lang, "tagline")}
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-5">
        {NAV.map((group) => (
          <div key={group.key}>
            <div className="px-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-faint mb-1">
              {t(lang, group.key)}
            </div>
            <ul>
              {group.items.map((item) => {
                const active = item.href === activeHref;
                return (
                  <li key={item.href}>
                    <Link
                      href={`${item.href}${qs}`}
                      onClick={onNavigate}
                      className={`block px-2 py-[0.32rem] text-[0.8rem] rounded-sm ${
                        active
                          ? "bg-wash text-ink font-semibold border-l-2 border-gold"
                          : "text-muted hover:bg-wash hover:text-ink"
                      }`}
                    >
                      {t(lang, item.key)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-5 py-3 border-t border-rule/60 text-[0.62rem] text-faint leading-snug">
        {t(lang, "syntheticNote")}
      </div>
    </aside>
  );
}
