"use client";

// Keeps the global plant/period selection when the user drills into a
// content link. Content pages use plain <Link href="/coal/ledger/RK-…">
// without the current ?plant/?period; without this, every drill-down would
// silently reset the header selectors to All / Full-6-months.
//
// Implemented as a capture-phase click interceptor rather than a custom Link
// so it covers every internal anchor (including ones added later) from one
// place. Links that already specify plant/period, external links, new-tab
// clicks, and modified clicks are left untouched.

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ScopePreserver() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const a = target?.closest("a");
      if (!a) return;
      if (a.target && a.target !== "_self") return; // new tab / frame
      if (a.hasAttribute("download")) return;

      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/")) return; // internal paths only

      const [path, query = ""] = href.split("?");
      const params = new URLSearchParams(query);
      const plant = sp.get("plant");
      const period = sp.get("period");

      let changed = false;
      if (plant && !params.has("plant")) {
        params.set("plant", plant);
        changed = true;
      }
      if (period && !params.has("period")) {
        params.set("period", period);
        changed = true;
      }
      if (!changed) return; // already scoped, or no active scope — let Next handle it

      const qs = params.toString();
      const dest = qs ? `${path}?${qs}` : path;
      if (dest === `${pathname}?${sp.toString()}`) return;

      // Fire before Next's <Link> click handler and navigate with scope kept.
      e.preventDefault();
      e.stopPropagation();
      router.push(dest);
    };

    document.addEventListener("click", onClick, true); // capture phase
    return () => document.removeEventListener("click", onClick, true);
  }, [router, sp, pathname]);

  return null;
}
