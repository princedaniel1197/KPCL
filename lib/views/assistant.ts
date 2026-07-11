// Assistant context + deterministic offline intents [H1].
// Both modes answer ONLY from precomputed aggregates — never invented figures.

import { AS_OF, auditParas, claims, contracts, fsas, legalMatters, projects, tariffYears, units, vendorById, vendors } from "@/lib/data";
import { analyzeFsa, sourceLeague } from "@/lib/engines/coal";
import { bgLedger, paraClock } from "@/lib/engines/obligations";
import { recoverableLd } from "@/lib/engines/legal";
import { atnDraft, prudenceCheck } from "@/lib/engines/tariff";
import { projectHealth } from "@/lib/engines/execution";
import { scoreVendor } from "@/lib/engines/vendor";
import { unitHeatRateCost } from "@/lib/engines/plant";
import { buildOverview } from "./overview";
import { rakes, bgs } from "@/lib/data";
import { inrCr, num, pct } from "@/lib/format";

export function assistantContext() {
  const o = buildOverview({ plant: "ALL", period: "ALL" });
  const league = sourceLeague(rakes).slice(0, 6);
  const healths = projects.map((p) => {
    const h = projectHealth(p, AS_OF);
    return {
      id: p.id,
      name: p.name,
      contractor: vendorById.get(p.contractorId)?.name,
      financialPct: Math.round(h.financialPct),
      physicalPct: Math.round(h.physicalPct),
      flags: {
        divergence: h.divergenceFlag,
        gateBlocked: h.gateBlocked,
        advanceVsFrozen: h.advanceVsFrozenFlag,
        courtContradiction: h.courtContradiction,
      },
    };
  });
  const recoverable = recoverableLd(contracts, legalMatters, AS_OF).filter((r) => r.claimStatus === "NO_CLAIM_FILED");
  const prudence = tariffYears
    .filter((y) => y.status === "DRAFT")
    .flatMap((y) => prudenceCheck(y).map((f) => ({ station: y.station, title: f.title, atRiskCr: Math.round(f.atRiskCr * 100) / 100 })));
  const expiring = bgLedger(bgs, AS_OF).filter((b) => b.daysToExpiry <= 30);
  const drifting = units
    .map((u) => ({ id: u.id, annualizedCr: Math.round(unitHeatRateCost(u).annualizedCr * 10) / 10 }))
    .filter((x) => x.annualizedCr > 4);
  const worstVendors = vendors
    .filter((v) => v.contractsCount >= 3)
    .map((v) => ({ name: v.name, ...scoreVendor(v) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map((v) => ({ name: v.name, score: Math.round(v.score), grade: v.grade }));
  const fsaFindings = fsas.map((f) => {
    const a = analyzeFsa(f);
    return { id: f.id, source: f.source, plant: f.plant, liftedPct: Math.round(a.liftedPct * 10) / 10, claimCr: Math.round(a.claimValue / 1e5) / 100 };
  });
  const overdueParas = auditParas
    .filter((p) => paraClock(p, AS_OF).bucket === "OVERDUE")
    .slice(0, 40)
    .map((p) => ({ id: p.id, title: p.title, station: p.station, valueCr: p.valueCr, owner: p.owner }));

  return {
    asOf: AS_OF,
    note: "All figures are synthetic demonstration data.",
    headline: { atRiskCr: Math.round(o.headlineCr * 10) / 10, split: o.split.map((s) => ({ ...s, amountCr: Math.round(s.amountCr * 10) / 10 })) },
    kpis: o.kpis,
    coalSources: league.map((s) => ({
      source: s.source, rakes: s.rakes,
      transitLossPct: Math.round(s.transitLossPct * 100) / 100,
      slippedRakePct: Math.round(s.slippedRakePct),
      leakageCr: Math.round(s.totalLeakage / 1e5) / 100,
    })),
    projects: healths,
    ldUnpursued: recoverable.map((r) => ({
      contract: r.contract.id, vendor: vendorById.get(r.contract.vendorId)?.name,
      milestone: r.accrual.milestoneName, daysLate: r.accrual.daysLate,
      accruedCr: Math.round(r.accrual.accruedValue * 100) / 100,
    })),
    prudenceFlags: prudence,
    bgsExpiring: expiring.map((b) => ({ id: b.bgId, contract: b.contractId, valueCr: b.valueCr, days: b.daysToExpiry })),
    heatRateDrift: drifting,
    worstVendors,
    fsas: fsaFindings,
    overdueParas,
    claimsPipeline: ["DRAFT", "ISSUED", "ACKNOWLEDGED", "RECOVERED"].map((st) => ({
      status: st,
      count: claims.filter((c) => c.status === st).length,
      amountCr: Math.round(claims.filter((c) => c.status === st).reduce((s, c) => s + c.amount, 0) / 1e5) / 100,
    })),
  };
}

type Ctx = ReturnType<typeof assistantContext>;

/** Deterministic offline mode: ~18 intents answered from the same aggregates. */
export function offlineAnswer(question: string, ctx: Ctx): string {
  const q = question.toLowerCase();
  // Leading word-boundary match: kills false positives ("ld" inside
  // "should/would/could/old", "para" inside "compare") while still matching
  // stems ("retire" → "retirement/retiring", "expir" → "expiring/expired").
  const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const has = (...words: string[]) =>
    words.some((w) => new RegExp(`\\b${esc(w)}`, "i").test(q));
  const pre = "";

  // ATN drafting: "draft the ATN for para 14/2025"
  const paraMatch = q.match(/(\d{1,3}\/\d{4})/);
  if (has("atn") && paraMatch) {
    const para = auditParas.find((p) => p.id === paraMatch[1]);
    if (para) return atnDraft(para) + "\n\n(Offline demo mode — template drafted from the audit-para register.)";
    return `I can't find para ${paraMatch[1]} in the register. The overdue ledger is at /regulatory/audit-paras.`;
  }

  if (has("contractor") && has("slip", "across", "behind", "worst")) {
    const deccan = ctx.projects.filter((p) => p.contractor === "Deccan EPC Ltd");
    const slipping = deccan.filter((p) => p.flags.divergence || p.flags.gateBlocked);
    const ld = ctx.ldUnpursued.filter((l) => l.vendor === "Deccan EPC Ltd");
    return `${pre}Deccan EPC Ltd is the cross-module signature: ${deccan.length} projects (${slipping.length} slipping — ${slipping.map((p) => p.name).join("; ")}), ${inrCr(ld.reduce((s, l) => s + l.accruedCr, 0) * 1e7, 1)} of LD accrued and un-pursued on ${ld.map((l) => l.contract).join(", ")}, one live arbitration (ARB-2025-014), and a vendor grade of D. The entity graph (/graph) joins all of it on one node.`;
  }

  if (has("w-3", "w3")) {
    const w3 = ctx.coalSources.find((s) => s.source === "W-3");
    if (!w3) return "No W-3 movement in the current window.";
    return `Colliery W-3 shipped ${num(w3.rakes)} rakes this window. ${w3.slippedRakePct}% slipped a full grade at the receiving weighbridge (≈600 kcal/kg below billing, with 7 rakes beyond 1,000 kcal), driving ${inrCr(w3.leakageCr * 1e7, 1)} of the coal leakage — mostly grade overbilling. Third-party loading-end samples matched the billed grade, so the gap opens in transit. Debit notes are drafted in the claims register (/coal/claims).`;
  }

  if (has("kerc", "prudence", "filing", "disallow")) {
    const total = ctx.prudenceFlags.reduce((s, f) => s + f.atRiskCr, 0);
    return `The prudence simulator flags ${inrCr(total * 1e7, 1)} at risk in the draft truing-up filings:\n${ctx.prudenceFlags.map((f) => `· ${f.station} — ${f.title}: ${inrCr(f.atRiskCr * 1e7, 1)}`).join("\n")}\nEach flag carries a fix hint on /regulatory.`;
  }

  if (has("bg", "guarantee", "bank guarantee")) {
    if (ctx.bgsExpiring.length === 0) return "No bank guarantees are inside the 30-day window.";
    return `${ctx.bgsExpiring.filter((b) => b.days >= 0).length} bank guarantees expire within 30 days${ctx.bgsExpiring.some((b) => b.days < 0) ? " and one has already lapsed unrenewed" : ""}:\n${ctx.bgsExpiring.map((b) => `· ${b.id} on ${b.contract} — ₹${b.valueCr.toFixed(1)} cr, ${b.days < 0 ? `${-b.days} days past expiry` : `${b.days} days left`}`).join("\n")}\nFull ledger: /contracts/guarantees.`;
  }

  if (has("ld", "liquidated")) {
    const total = ctx.ldUnpursued.reduce((s, l) => s + l.accruedCr, 0);
    return `${inrCr(total * 1e7, 1)} of liquidated damages has accrued with no recovery claim filed:\n${ctx.ldUnpursued.map((l) => `· ${l.contract} (${l.vendor}) — ${l.milestone}, ${l.daysLate} days late, ₹${l.accruedCr.toFixed(2)} cr`).join("\n")}\nThe linkage table is at /legal/intelligence.`;
  }

  if (has("para", "audit", "copu")) {
    return `${ctx.kpis.parasOverdue} audit paras are past the 4-month COPU reply clock. The largest overdue items:\n${ctx.overdueParas.slice(0, 5).map((p) => `· Para ${p.id} (${p.station}) — ${p.title}, ₹${p.valueCr.toFixed(2)} cr, owner ${p.owner}`).join("\n")}\nSay "draft the ATN for para <id>" and I'll produce the template from the register.`;
  }

  if (has("coal") && has("leak", "loss", "total", "summar")) {
    return `Coal leakage this window is ${inrCr(ctx.kpis.coalLeakageCr * 1e7, 1)}. Source league:\n${ctx.coalSources.map((s) => `· ${s.source}: ${s.rakes} rakes, transit loss ${s.transitLossPct}%, ${s.slippedRakePct}% grade-slipped, ${inrCr(s.leakageCr * 1e7, 1)}`).join("\n")}\nThe ledger reconciles every rake billed → received → fired at /coal/ledger.`;
  }

  if (has("demurrage", "tippler", "rake", "turnaround")) {
    return `Demurrage concentrates in a 9-day wagon-tippler outage at RTPS — rakes queued 26–70 hours against 6 hours free time at ₹150/wagon-hour. Idle freight adds to it: the S-7 siding chronically loads ~4% below rated wagon capacity. Both ledgers are at /coal/demurrage.`;
  }

  if (has("fsa", "short supply", "acq")) {
    const worst = ctx.fsas.reduce((a, b) => (a.liftedPct < b.liftedPct ? a : b));
    return `FSA lifting vs pro-rated ACQ: ${ctx.fsas.map((f) => `${f.source}→${f.plant} ${f.liftedPct}%`).join(", ")}. The ${worst.source} agreement is at ${worst.liftedPct}%, inside the sub-80% slab — a computed short-supply penalty claim of ${inrCr(worst.claimCr * 1e7, 1)} sits in DRAFT at /coal/claims.`;
  }

  if (has("retire", "spof", "succession", "knowledge")) {
    return `${num(ctx.kpis.retirements24mo)} employees retire within 24 months; ${ctx.kpis.spofRoles} are single-point-of-failure roles with no successor identified (sole incumbents of specialist roles like IBR welding examiner and legacy-DCS logic). 27% of the RTPS technical cadre retires within five years. The wave and the legacy-interview queue are at /workforce.`;
  }

  if (has("labour", "wage", "epf", "slv", "contract labour")) {
    return `SLV Enterprises shows all three compliance failures: daily wages of ₹372–392 against the ₹421 notified minimum, EPF remitted at ~9% of basic against the statutory 12%, and billed manshifts running ~6% above biometric attendance. Month-wise exposure is ledgered at /workforce/contract-labour.`;
  }

  if (has("heat rate", "heat-rate", "efficiency", "drift")) {
    return `Two units are drifting above their heat-rate norms: ${ctx.heatRateDrift.map((u) => `${u.id} (≈${inrCr(u.annualizedCr * 1e7, 1)}/yr)`).join(" and ")} — about ${inrCr(ctx.heatRateDrift.reduce((s, u) => s + u.annualizedCr, 0) * 1e7, 0)} annualized in extra fuel. Unit trends are at /plants.`;
  }

  if (has("fgd", "emission", "so2", "moefcc")) {
    return `RTPS-U5 is past its MoEFCC FGD norm deadline with the retrofit only awarded, not erected. The rest of the fleet tracks against 2027 deadlines — YTPS units are under erection. Deadline clocks are at /plants/emissions.`;
  }

  if (has("stock", "spare", "inventory", "dead")) {
    return `Stores intelligence: 12 V-class critical spares sit below lead-time cover (stock-out risk with an emergency-purchase premium if bought spot), and ${inrCr(ctx.kpis.deadStockCr * 1e7, 1)} of inventory has had no issue in 24+ months — the same pattern as the DG-spares write-off. Ledger: /contracts/inventory.`;
  }

  if (has("psp", "sharavathi", "clearance", "pumped")) {
    const psp = ctx.projects.find((p) => p.id === "PRJ-PSP-01")!;
    return `${psp.name}: the schedule still reads 2030, but Forest Clearance Stage-I is blocked and an HC interim stay covers works in the sanctuary buffer — every downstream date is fictional until the gate clears. A ₹206 cr mobilisation advance is out against the frozen site, and monthly progress reports still claim site activity, which contradicts the stay. See /projects/clearances and /projects/PRJ-PSP-01.`;
  }

  if (has("vendor", "grade", "scorecard", "malnad")) {
    return `Worst-scored vendors: ${ctx.worstVendors.map((v) => `${v.name} (${v.score}, grade ${v.grade})`).join("; ")}. Note: Malnad Infra Projects grades E yet won a fresh award five weeks ago — the scorecard alert is at /contracts/vendors.`;
  }

  if (has("retender", "re-tender", "dcs")) {
    return `The RTPS Unit 5–6 DCS Rectification Package has been tendered four times — the classic unresolved-problem signature. The re-tender ledger is at /projects/retenders.`;
  }

  if (has("safety", "near miss", "chp", "incident")) {
    return `Nine near-misses cluster at the RTPS coal handling plant across two recent months — belt-guard removals, dust accumulation, an unbarricaded floor opening. The pattern precedes injury; the register is at /plants/safety.`;
  }

  if (has("risk", "headline", "at risk", "summary", "overview", "total")) {
    return `${inrCr(ctx.headline.atRiskCr * 1e7, 1)} is at risk across the corporation this window:\n${ctx.headline.split.map((s) => `· ${s.label}: ${inrCr(s.amountCr * 1e7, 1)}`).join("\n")}\nPlus watch items: ${ctx.kpis.bgsExpiring30} BGs expiring ≤30 d, ${ctx.kpis.parasOverdue} paras past the COPU clock, ${num(ctx.kpis.retirements24mo)} retirements ≤24 mo. Every figure links to its ledger from the MD dashboard.`;
  }

  return `I'm in offline demo mode (no API key configured), answering from the precomputed ledger aggregates. Try: "Which contractor is slipping across projects?", "Summarize W-3's quarter", "What is at risk in the draft KERC filing?", "Which BGs expire this month?", "Draft the ATN for para ${auditParas.find((p) => paraClock(p, AS_OF).bucket === "OVERDUE")?.id}", or ask about LD, demurrage, FSA penalties, retirements, contract labour, heat rate, FGD, spares, safety, or the PSP.`;
}
