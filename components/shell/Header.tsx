"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PLANTS } from "@/lib/nav";
import { t, type Lang } from "@/lib/i18n";

type SearchHit = { id: string; name: string; kind: string; href: string };

export function Header({ lang, onMenu }: { lang: Lang; onMenu: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const plant = sp.get("plant") ?? "ALL";
  const period = sp.get("period") ?? "ALL";
  const [months, setMonths] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const indexRef = useRef<SearchHit[] | null>(null);

  useEffect(() => {
    fetch("/search-index.json")
      .then((r) => (r.ok ? r.json() : { months: [], entities: [] }))
      .then((d) => {
        setMonths(d.months ?? []);
        indexRef.current = d.entities ?? [];
      })
      .catch(() => {});
  }, []);

  // Close + clear the search whenever the route changes. Navigation may come
  // from a result click that the global ScopePreserver intercepts (its
  // stopPropagation would otherwise skip the link's own onClick), so tidy the
  // search UI here rather than relying on that handler.
  useEffect(() => {
    setQ("");
    setOpen(false);
  }, [pathname, sp]);

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(sp.toString());
      if (value === "ALL") next.delete(key);
      else next.set(key, value);
      router.push(`${pathname}${next.toString() ? `?${next}` : ""}`);
    },
    [sp, router, pathname],
  );

  const toggleLang = useCallback(() => {
    const next = lang === "en" ? "kn" : "en";
    document.cookie = `lang=${next};path=/;max-age=31536000`;
    router.refresh();
  }, [lang, router]);

  useEffect(() => {
    if (!q || !indexRef.current) {
      setHits([]);
      return;
    }
    const needle = q.toLowerCase();
    setHits(
      indexRef.current
        .filter((e) => e.name.toLowerCase().includes(needle) || e.id.toLowerCase().includes(needle))
        .slice(0, 8),
    );
  }, [q]);

  const monthLabel = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  };

  return (
    <header className="no-print sticky top-0 z-20 bg-paper/95 backdrop-blur border-b-[1.5px] border-gold">
      <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-2.5 max-w-[1400px] mx-auto">
        <button
          className="lg:hidden btn-outline !px-2 !py-1"
          onClick={onMenu}
          aria-label="Menu"
        >
          ☰
        </button>

        {/* Plant switcher */}
        <select
          value={plant}
          onChange={(e) => setParam("plant", e.target.value)}
          className="bg-panel border border-rule text-[0.78rem] px-2 py-1.5 rounded-sm font-medium hover:border-gold cursor-pointer"
          aria-label={t(lang, "plant")}
        >
          {PLANTS.map((p) => (
            <option key={p} value={p}>
              {p === "ALL" ? t(lang, "allPlants") : p}
            </option>
          ))}
        </select>

        {/* Period selector */}
        <select
          value={period}
          onChange={(e) => setParam("period", e.target.value)}
          className="bg-panel border border-rule text-[0.78rem] px-2 py-1.5 rounded-sm font-medium hover:border-gold cursor-pointer"
          aria-label={t(lang, "period")}
        >
          <option value="ALL">{lang === "kn" ? "ಪೂರ್ಣ ೬ ತಿಂಗಳು" : "Full 6 months"}</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>

        {/* Global search */}
        <div className="relative flex-1 max-w-md hidden sm:block">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onFocus={() => q && setOpen(true)}
            placeholder={t(lang, "search")}
            className="w-full bg-panel border border-rule text-[0.78rem] px-3 py-1.5 pl-8 rounded-sm placeholder:text-faint hover:border-gold focus:border-gold"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {open && hits.length > 0 && (
            <div className="search-pop absolute top-full mt-1 w-full panel z-30 max-h-80 overflow-y-auto shadow-lg">
              {hits.map((h) => (
                <Link
                  key={`${h.kind}:${h.id}`}
                  href={h.href}
                  className="flex items-center justify-between gap-2 px-3 py-2 rule-hair hover:bg-wash"
                  onClick={() => {
                    setQ("");
                    setOpen(false);
                  }}
                >
                  <span className="text-[0.8rem] font-medium truncate">{h.name}</span>
                  <span className="text-[0.6rem] uppercase tracking-wider text-faint shrink-0 border border-rule/60 rounded-sm px-1.5 py-0.5">
                    {h.kind}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 sm:hidden" />

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="btn-outline !px-2.5 !py-1 text-[0.75rem]"
          aria-label="Language"
        >
          {lang === "en" ? "ಕನ್ನಡ" : "EN"}
        </button>
      </div>
    </header>
  );
}
