import type { Lang } from "./i18n";
import { t } from "./i18n";
import type { Scope } from "./params";
import { monthFmt } from "./format";
import { meta } from "./data";

/** "Plant scope · period · module" subtitle line for every page header. */
export function subtitle(lang: Lang, scope: Scope, moduleKey: string): string {
  const plant = scope.plant === "ALL" ? t(lang, "allPlants") : scope.plant;
  const period =
    scope.period === "ALL"
      ? `${monthFmt(meta.months[0])} – ${monthFmt(meta.months[meta.months.length - 1])}`
      : monthFmt(scope.period);
  return `${plant} · ${period} · ${t(lang, moduleKey)}`;
}
