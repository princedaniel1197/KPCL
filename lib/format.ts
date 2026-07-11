// Indian-format number utilities. Every number in the UI flows through these.

const CR = 1e7;
const LAKH = 1e5;

export function inr(n: number, decimals = 0): string {
  return (
    "₹" +
    n.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

/** ₹ value auto-scaled to cr / lakh with unit suffix. */
export function inrCr(n: number, decimals = 2): string {
  const abs = Math.abs(n);
  if (abs >= CR) return `₹${(n / CR).toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })} cr`;
  if (abs >= LAKH) return `₹${(n / LAKH).toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })} lakh`;
  return inr(n);
}

/** Bare crore number (no ₹), for chart axes. */
export function crNum(n: number, decimals = 1): string {
  return (n / CR).toLocaleString("en-IN", { maximumFractionDigits: decimals });
}

export function num(n: number, decimals = 0): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function pct(n: number, decimals = 1): string {
  return `${n.toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}%`;
}

export function tonnes(n: number): string {
  return `${num(Math.round(n))} t`;
}

export function kcal(n: number): string {
  return `${num(Math.round(n))} kcal/kg`;
}

export function dateFmt(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function monthFmt(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
