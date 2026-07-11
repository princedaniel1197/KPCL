import { t, type Lang } from "@/lib/i18n";

export function Folio({ lang }: { lang: Lang }) {
  const date = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return (
    <footer className="mt-10 pt-3 border-t-[0.5px] border-rule text-[0.66rem] text-faint tracking-wide print-block">
      {t(lang, "appName")} · {t(lang, "generated")} {date} · {t(lang, "syntheticNote")}
    </footer>
  );
}
