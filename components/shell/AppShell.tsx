"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Folio } from "./Folio";
import { AssistantBubble } from "@/components/assistant/AssistantBubble";
import { ScopePreserver } from "./ScopePreserver";

export function AppShell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar: static on desktop, drawer on mobile */}
      <div
        className={`no-print fixed inset-y-0 left-0 z-40 w-60 transform transition-transform lg:translate-x-0 lg:static lg:shrink-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar lang={lang} onNavigate={() => setNavOpen(false)} />
      </div>
      {navOpen && (
        <div
          className="no-print fixed inset-0 z-30 bg-ink/30 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <Header lang={lang} onMenu={() => setNavOpen((v) => !v)} />
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-[1400px] w-full mx-auto">
          {/* keyed by pathname so the rise-and-settle entrance re-fires on every navigation */}
          <div key={pathname} className="page-enter">
            {children}
          </div>
          <Folio lang={lang} />
        </main>
      </div>

      <AssistantBubble lang={lang} />
      <ScopePreserver />
    </div>
  );
}
