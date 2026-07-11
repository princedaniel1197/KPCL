// Global control state (plant scope, period, language) helpers.
// Plant + period travel in the URL query so server components can filter;
// language travels in a cookie so titles render server-side.

import { cookies } from "next/headers";
import type { Lang } from "./i18n";
import type { PlantCode } from "./nav";
import { PLANTS } from "./nav";

export type SearchParams = { [key: string]: string | string[] | undefined };

export type Scope = { plant: PlantCode; period: string };

export function getScope(searchParams?: SearchParams): Scope {
  const rawPlant = typeof searchParams?.plant === "string" ? searchParams.plant : "ALL";
  const plant = (PLANTS as readonly string[]).includes(rawPlant)
    ? (rawPlant as PlantCode)
    : "ALL";
  const period =
    typeof searchParams?.period === "string" && /^\d{4}-\d{2}$/.test(searchParams.period)
      ? searchParams.period
      : "ALL";
  return { plant, period };
}

export function getLang(): Lang {
  const c = cookies().get("lang")?.value;
  return c === "kn" ? "kn" : "en";
}

/** Does a record tagged with `plant` fall inside the current scope? */
export function inPlantScope(plant: string, scope: Scope): boolean {
  return scope.plant === "ALL" || plant === scope.plant;
}

/** Does a record with month `ym` (YYYY-MM) fall inside the period scope? */
export function inPeriodScope(ym: string, scope: Scope): boolean {
  return scope.period === "ALL" || ym === scope.period;
}

export function inDateScope(isoDate: string, scope: Scope): boolean {
  return scope.period === "ALL" || isoDate.slice(0, 7) === scope.period;
}
