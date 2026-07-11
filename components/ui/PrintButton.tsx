"use client";

export function PrintButton({ label = "Print report" }: { label?: string }) {
  return (
    <button className="btn-outline no-print" onClick={() => window.print()}>
      {label}
    </button>
  );
}
