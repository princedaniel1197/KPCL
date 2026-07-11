// Cross-module aggregates: MD dashboard [H2], assistant context [H1].

import { AS_OF, auditParas, bgs, contracts, employees, labourContractors, legalMatters, projects, rakes, spares, tariffYears, units, vendorById, vendors } from "@/lib/data";
import { analyzeRake } from "@/lib/engines/coal";
import { bgLedger, paraClock } from "@/lib/engines/obligations";
import { recoverableLd } from "@/lib/engines/legal";
import { prudenceCheck } from "@/lib/engines/tariff";
import { projectHealth } from "@/lib/engines/execution";
import { inventorySummary } from "@/lib/engines/inventory";
import { scoreVendor } from "@/lib/engines/vendor";
import { unitHeatRateCost } from "@/lib/engines/plant";
import { clmsFlags, retirementDate, monthsUntil, spofRoles } from "@/lib/engines/workforce";
import { coalAggregates } from "./coal";
import type { Scope } from "@/lib/params";

export interface Alert {
  severity: "danger" | "warning" | "info";
  module: string;
  text: string;
  href: string;
}

export interface Overview {
  asOf: string;
  headlineCr: number;
  split: { label: string; amountCr: number; href: string }[];
  kpis: {
    coalLeakageCr: number;
    projectsDiverging: number;
    ldUnclaimedCr: number;
    bgsExpiring30: number;
    bgsExpiringValueCr: number;
    parasOverdue: number;
    retirements24mo: number;
    prudenceCr: number;
    spofRoles: number;
    heatRateAnnualizedCr: number;
    deadStockCr: number;
    clmsExposureCr: number;
  };
  alerts: Alert[];
  byMonth: { month: string; overbilling: number; transit: number; efficiency: number; logistics: number }[];
}

export function buildOverview(scope: Scope): Overview {
  const coal = coalAggregates(scope);
  const coalCr = coal.leakage.total / 1e7;

  // Scope contracts/BGs/paras to the selected plant so the headline sum mixes
  // like-for-like — not plant-scoped coal against corporate-wide LD.
  const scopedContracts = contracts.filter((c) => scope.plant === "ALL" || c.plant === scope.plant);
  const ldRows = recoverableLd(scopedContracts, legalMatters, AS_OF);
  const unclaimed = ldRows.filter((r) => r.claimStatus === "NO_CLAIM_FILED");
  const ldCr = unclaimed.reduce((s, r) => s + r.accrual.accruedValue, 0);

  const prudenceFlags = tariffYears
    .filter((y) => y.status === "DRAFT")
    .filter((y) => scope.plant === "ALL" || y.station === scope.plant)
    .flatMap((y) => prudenceCheck(y).map((f) => ({ ...f, station: y.station })));
  const prudenceCr = prudenceFlags.reduce((s, f) => s + f.atRiskCr, 0);

  const scopedProjects = projects.filter((p) => scope.plant === "ALL" || p.plant === scope.plant);
  const healths = scopedProjects.map((p) => ({ p, h: projectHealth(p, AS_OF) }));
  const diverging = healths.filter((x) => x.h.divergenceFlag);

  // BGs carry no plant; scope them via their contract's plant.
  const scopedContractIds = new Set(scopedContracts.map((c) => c.id));
  const scopedBgs = scope.plant === "ALL" ? bgs : bgs.filter((b) => scopedContractIds.has(b.contractId));
  const ledger = bgLedger(scopedBgs, AS_OF);
  const expiring = ledger.filter((b) => b.level === "T7" || b.level === "T30");
  const expired = ledger.filter((b) => b.level === "EXPIRED");

  const scopedParas = auditParas.filter((p) => scope.plant === "ALL" || p.station === scope.plant);
  const overdueParas = scopedParas.filter((p) => paraClock(p, AS_OF).bucket === "OVERDUE");

  const scopedEmployees = employees.filter((e) => scope.plant === "ALL" || e.station === scope.plant);
  const retirements24 = scopedEmployees.filter((e) => {
    const m = monthsUntil(retirementDate(e.dob), AS_OF);
    return m >= 0 && m <= 24;
  }).length;
  const spofs = spofRoles(scopedEmployees, AS_OF);

  const inv = inventorySummary(spares.filter((s) => scope.plant === "ALL" || s.plant === scope.plant));

  const heat = units
    .filter((u) => scope.plant === "ALL" || u.plant === scope.plant)
    .map((u) => ({ u, c: unitHeatRateCost(u) }))
    .filter((x) => x.c.annualizedCr > 4);
  const heatCr = heat.reduce((s, x) => s + x.c.annualizedCr, 0);

  const clms = labourContractors
    .filter((c) => scope.plant === "ALL" || c.plant === scope.plant)
    .flatMap((c) => clmsFlags(c));
  const clmsCr = clms.reduce((s, f) => s + f.exposure, 0) / 1e7;

  /* ── Alert ledger ── */
  const alerts: Alert[] = [];
  const psp = healths.find((x) => x.p.id === "PRJ-PSP-01");
  if (psp?.h.gateBlocked)
    alerts.push({ severity: "danger", module: "Projects", text: `${psp.p.name}: FC-I gate blocked under HC stay while the schedule still reads 2030 — downstream dates are fictional`, href: "/projects/clearances" });
  if (psp?.h.advanceVsFrozenFlag)
    alerts.push({ severity: "danger", module: "Projects", text: `Mobilisation advance ₹206 cr disbursed against a frozen PSP site`, href: "/projects/PRJ-PSP-01" });
  for (const d of diverging)
    alerts.push({ severity: "danger", module: "Projects", text: `${d.p.name}: paid ${d.h.financialPct.toFixed(0)}% vs ${d.h.physicalPct.toFixed(0)}% physical (+${d.h.divergencePp.toFixed(0)} pp)`, href: `/projects/${d.p.id}` });
  if (unclaimed.length > 0)
    alerts.push({ severity: "danger", module: "Legal × Contracts", text: `₹${ldCr.toFixed(1)} cr of accrued LD sits un-pursued across ${unclaimed.length} contracts — claim windows are running`, href: "/legal/intelligence" });
  for (const b of expiring)
    alerts.push({ severity: "warning", module: "Contracts", text: `BG ${b.bgId} (${vendorById.get(b.vendorId)?.name ?? b.vendorId}, ₹${b.valueCr.toFixed(1)} cr) expires in ${b.daysToExpiry} days`, href: "/contracts/guarantees" });
  for (const b of expired)
    alerts.push({ severity: "danger", module: "Contracts", text: `BG ${b.bgId} lapsed ${-b.daysToExpiry} days ago and remains unrenewed`, href: "/contracts/guarantees" });
  if (coal.slippedRakes > 0)
    alerts.push({ severity: "danger", module: "Coal", text: `${coal.slippedRakes} rakes slipped a full grade in the window — ₹${(coal.leakage.overbilling / 1e7).toFixed(1)} cr overbilling, concentrated at W-3`, href: "/coal/sources" });
  if (overdueParas.length > 0)
    alerts.push({ severity: "warning", module: "Audit", text: `${overdueParas.length} audit paras are past the 4-month COPU reply clock`, href: "/regulatory/audit-paras" });
  const malnad = vendors.find((v) => v.name === "Malnad Infra Projects");
  if (malnad && scoreVendor(malnad).grade === "E")
    alerts.push({ severity: "warning", module: "Procurement", text: `Grade-E vendor Malnad Infra Projects won a fresh award 5 weeks ago`, href: "/contracts/vendors?focus=" + malnad.id });
  const fgdBreach = units.find((u) => u.fgd.status !== "COMMISSIONED" && u.fgd.normDeadline < AS_OF);
  if (fgdBreach)
    alerts.push({ severity: "warning", module: "Plants", text: `${fgdBreach.id} FGD is past its MoEFCC norm deadline with erection not started`, href: "/plants/emissions" });
  if (heat.length > 0)
    alerts.push({ severity: "warning", module: "Plants", text: `Heat-rate drift on ${heat.map((x) => x.u.id).join(" & ")} is costing ≈₹${heatCr.toFixed(0)} cr annualized`, href: "/plants" });
  if (clms.length > 0)
    alerts.push({ severity: "warning", module: "Workforce", text: `SLV Enterprises: paid below minimum wage with EPF at ~9% of basic and billed manshifts exceeding attendance`, href: "/workforce/contract-labour" });
  if (spofs.length > 0)
    alerts.push({ severity: "info", module: "Workforce", text: `${spofs.length} single-point-of-failure roles retire within 24 months with no successor identified`, href: "/workforce" });
  if (inv.stockoutCount > 0)
    alerts.push({ severity: "info", module: "Stores", text: `${inv.stockoutCount} V-class critical spares are below lead-time cover; dead stock holds ₹${(inv.deadValue / 1e7).toFixed(1)} cr`, href: "/contracts/inventory" });

  return {
    asOf: AS_OF,
    headlineCr: coalCr + ldCr + prudenceCr,
    split: [
      { label: "Coal reconciliation leakage", amountCr: coalCr, href: "/coal" },
      { label: "LD accrued, un-pursued", amountCr: ldCr, href: "/legal/intelligence" },
      { label: "Tariff prudence exposure", amountCr: prudenceCr, href: "/regulatory" },
    ],
    kpis: {
      coalLeakageCr: coalCr,
      projectsDiverging: diverging.length,
      ldUnclaimedCr: ldCr,
      bgsExpiring30: expiring.length,
      bgsExpiringValueCr: expiring.reduce((s, b) => s + b.valueCr, 0),
      parasOverdue: overdueParas.length,
      retirements24mo: retirements24,
      prudenceCr,
      spofRoles: spofs.length,
      heatRateAnnualizedCr: heatCr,
      deadStockCr: inv.deadValue / 1e7,
      clmsExposureCr: clmsCr,
    },
    alerts,
    byMonth: coal.byMonth,
  };
}
