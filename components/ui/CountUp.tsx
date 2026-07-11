"use client";

// Count-up for hero numerals. Animates 0 → value once on mount with an
// ease-out curve; respects prefers-reduced-motion. Server passes the final
// number + formatting so there is no hydration text mismatch on first paint
// (we render the final value on the server frame, then animate on the client).

import { useEffect, useState } from "react";

export function CountUp({
  value,
  decimals = 1,
  prefix = "",
  suffix = "",
  durationMs = 900,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
}) {
  const [display, setDisplay] = useState(value); // final value first → SSR-safe

  useEffect(() => {
    // Re-runs whenever `value` changes (e.g. plant scope switch), so the numeral
    // always animates to — and lands on — the current value rather than a stale one.
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // Reduced motion, or a backgrounded/hidden tab where rAF is paused:
    // keep the true value rather than animating.
    if (reduce || (typeof document !== "undefined" && document.hidden)) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    let startTs = 0;
    // NOTE: we do NOT pre-set display to 0. The first frame drives it toward 0
    // via the easing curve, so if rAF never fires the true value stays on screen.
    const tick = (ts: number) => {
      if (!startTs) startTs = ts;
      const p = Math.min(1, (ts - startTs) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    // Absolute guarantee: whatever happens with rAF, land on the true value.
    const safety = setTimeout(() => setDisplay(value), durationMs + 250);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
    };
  }, [value, durationMs]);

  const text = display.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <span className="tnum">
      {prefix}
      {text}
      {suffix}
    </span>
  );
}
