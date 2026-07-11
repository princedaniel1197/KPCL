// Capital-projects world: 9 projects, 12–30 milestones each, monthly RA bills,
// drawings registers, clearance gates, court status.
// STORY injections (§4, set 2) flagged inline.

import { chance, pick, randFloat, randInt, stream } from "@/lib/rng";
import type { Gate, Milestone, Project, RaBill } from "@/lib/types";
import { AS_OF, KEY_VENDORS, MONTHS } from "./context";

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(base: string, days: number): string {
  const d = new Date(base + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}
function monthsBack(n: number): string {
  const d = new Date(AS_OF + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() - n);
  return iso(d);
}

/**
 * Build milestones + RA bills so financial% and physical% land where the
 * story needs them. Milestone weights sum to 100.
 */
function buildProgress(opts: {
  rngKey: string;
  start: string;
  end: string;
  milestoneCount: number;
  physicalPct: number; // target completed weight
  financialPct: number; // target ΣRA / value
  valueCr: number;
  lateOpenMilestones?: number; // open milestones already past due
}): { milestones: Milestone[]; raBills: RaBill[] } {
  const rng = stream(opts.rngKey);
  const n = opts.milestoneCount;
  const span = Math.max(
    1,
    (Date.parse(opts.end) - Date.parse(opts.start)) / 86400000,
  );

  // Even weights with jitter, normalized to 100.
  let weights = Array.from({ length: n }, () => randFloat(rng, 0.7, 1.3));
  const wSum = weights.reduce((a, b) => a + b, 0);
  weights = weights.map((w) => (w / wSum) * 100);

  const milestones: Milestone[] = [];
  let cumWeight = 0;
  let completedWeight = 0;
  for (let i = 0; i < n; i++) {
    const planned = addDays(opts.start, Math.round(((i + 1) / n) * span));
    const shouldComplete = completedWeight + weights[i] <= opts.physicalPct + 0.01;
    let completedDate: string | null = null;
    if (shouldComplete) {
      completedDate = addDays(planned, randInt(rng, -20, 45));
      if (completedDate > AS_OF) completedDate = addDays(AS_OF, -randInt(rng, 5, 40));
      completedWeight += weights[i];
    }
    milestones.push({
      id: `M${String(i + 1).padStart(2, "0")}`,
      name: milestoneName(i, n),
      weightPct: Math.round(weights[i] * 100) / 100,
      plannedDate: planned,
      completedDate,
      certified: completedDate !== null && chance(rng, 0.85),
    });
    cumWeight += weights[i];
  }

  // Force `lateOpenMilestones` open milestones into the past (slippage).
  const open = milestones.filter((m) => m.completedDate === null);
  for (let i = 0; i < Math.min(opts.lateOpenMilestones ?? 0, open.length); i++) {
    open[i].plannedDate = addDays(AS_OF, -randInt(rng, 30, 160));
  }

  // RA bills across the last 6 months + a back-history lump so the
  // cumulative total hits financialPct × value.
  const totalRa = (opts.financialPct / 100) * opts.valueCr;
  const recentShare = randFloat(rng, 0.25, 0.4);
  const recentTotal = totalRa * recentShare;
  const raBills: RaBill[] = [];
  if (totalRa - recentTotal > 0.01) {
    raBills.push({
      id: "RA-00 (b/f)",
      month: monthsBack(7).slice(0, 7),
      amountCr: Math.round((totalRa - recentTotal) * 100) / 100,
    });
  }
  let spread = Array.from({ length: MONTHS.length }, () => randFloat(rng, 0.5, 1.5));
  const sSum = spread.reduce((a, b) => a + b, 0);
  spread = spread.map((s) => (s / sSum) * recentTotal);
  MONTHS.forEach((month, i) => {
    if (spread[i] > 0.05)
      raBills.push({
        id: `RA-${String(i + 1).padStart(2, "0")}`,
        month,
        amountCr: Math.round(spread[i] * 100) / 100,
      });
  });

  return { milestones, raBills };
}

function milestoneName(i: number, n: number): string {
  const names = [
    "Mobilisation & site establishment",
    "Survey and soil investigation",
    "Basic engineering sign-off",
    "Detailed engineering — package 1",
    "Detailed engineering — package 2",
    "Major equipment ordering",
    "Civil foundations — main block",
    "Structural steel erection",
    "Equipment delivery to site",
    "Erection — mechanical",
    "Erection — electrical & C&I",
    "Piping and ducting",
    "Cabling and termination",
    "Hydro test / pressure test",
    "Insulation and cladding",
    "Commissioning spares delivery",
    "Cold commissioning",
    "Hot commissioning",
    "Trial operation",
    "Performance guarantee test",
    "Punch-list liquidation",
    "Taking over certificate",
    "Documentation & as-builts",
    "Training & handover",
    "Defect liability mobilisation",
    "Final acceptance",
    "Vendor drawing approvals",
    "Statutory inspections",
    "Safety clearance",
    "Grid synchronisation",
  ];
  return names[i % names.length] + (i >= names.length ? ` (phase ${Math.floor(i / names.length) + 1})` : "");
}

const AGING_BUCKETS = ["<30 d", "30–90 d", "90–180 d", ">180 d"];

function drawingsFor(rngKey: string, total: number, pending: number) {
  const rng = stream(rngKey);
  let remaining = pending;
  const aging = AGING_BUCKETS.map((bucket, i) => {
    const share = i === AGING_BUCKETS.length - 1 ? remaining : Math.round(remaining * randFloat(rng, 0.2, 0.45));
    remaining -= share;
    return { bucket, count: share };
  });
  return { drawingsTotal: total, drawingsPending: pending, drawingsAging: aging };
}

export function genProjects(): Project[] {
  const projects: Project[] = [];

  /* ── STORY [A2/A4/A7/A8]: Sharavathi-class PSP frozen at the forest
     clearance gate; schedule still says 2030; mobilisation advance out;
     progress reports still claim site activity under an HC stay. ── */
  const pspGates: Gate[] = [
    { key: "ToR", label: "Terms of Reference (EIA)", status: "CLEARED", date: "2023-08-17", note: "Granted by EAC (River Valley)" },
    { key: "EC", label: "Environmental Clearance", status: "CLEARED", date: "2024-06-03", note: "EC with 14 special conditions" },
    { key: "FC1", label: "Forest Clearance — Stage I", status: "BLOCKED", date: null, note: "Returned for fresh wildlife-impact study; LTM plot dispute in the sanctuary buffer" },
    { key: "FC2", label: "Forest Clearance — Stage II", status: "PENDING", date: null, note: "Cannot proceed until Stage I" },
    { key: "NBWL", label: "NBWL Standing Committee", status: "PENDING", date: null, note: "Listed; awaiting site inspection report" },
    { key: "CONSTRUCTION", label: "Construction start", status: "PENDING", date: null, note: "Blocked by FC-I and HC interim order" },
  ];
  const psp = buildProgress({
    rngKey: "prj-psp",
    start: "2024-03-01",
    end: "2030-06-30",
    milestoneCount: 30,
    physicalPct: 3.2, // early works only
    financialPct: 8.5, // advance + design milestones — the A4 pattern
    valueCr: 4120,
    lateOpenMilestones: 3,
  });
  projects.push({
    id: "PRJ-PSP-01",
    name: "Sharavathi-class Pumped Storage Project (2,000 MW)",
    type: "PSP",
    plant: "PSP",
    contractorId: KEY_VENDORS.TUNGABHADRA.id,
    contractValueCr: 4120,
    start: "2024-03-01",
    scheduledEnd: "2030-06-30",
    gates: pspGates,
    milestones: psp.milestones,
    raBills: psp.raBills,
    ...drawingsFor("drw-psp", 640, 74),
    courtStatus: {
      forum: "High Court of Karnataka",
      caseId: "WP-2025-1187",
      status: "STAY",
      note: "Interim stay on tree-felling and all civil works within the sanctuary buffer",
    },
    mobilisationAdvance: { amountCr: 206, disbursedOn: "2024-09-12", siteActive: false },
    reportedActivity: [
      "Adit-2 approach road formation reported 40% complete (monthly progress report)",
      "Batching plant erection reported 'in progress' at the power-house bench",
    ],
    retenderCount: 0,
    ldRatePctPerWeek: 0.5,
    ldCapPct: 10,
    rm: null,
    description:
      "2,000 MW pumped storage scheme on a Sharavathi-class alignment. Declared commissioning 2030 — the binding constraint is the forest-clearance gate, not the construction schedule.",
  });

  /* ── STORY [A3]: RTPS Unit-1 R&M — RA bills 62% vs physical 48% ── */
  const rm1 = buildProgress({
    rngKey: "prj-rm1",
    start: monthsBack(14),
    end: addDays(AS_OF, 200),
    milestoneCount: 22,
    physicalPct: 48,
    financialPct: 62,
    valueCr: 412,
    lateOpenMilestones: 4,
  });
  projects.push({
    id: "PRJ-RM-01",
    name: "RTPS Unit-1 Renovation & Modernisation",
    type: "RM",
    plant: "RTPS",
    contractorId: KEY_VENDORS.DECCAN.id,
    contractValueCr: 412,
    start: monthsBack(14),
    scheduledEnd: addDays(AS_OF, 200),
    gates: null,
    milestones: rm1.milestones,
    raBills: rm1.raBills,
    ...drawingsFor("drw-rm1", 380, 42),
    courtStatus: null,
    mobilisationAdvance: { amountCr: 20.6, disbursedOn: monthsBack(13), siteActive: true },
    reportedActivity: ["Boiler pressure-parts replacement in progress", "ESP field-3 internals delivered"],
    retenderCount: 1,
    ldRatePctPerWeek: 0.5,
    ldCapPct: 5,
    rm: {
      unitId: "RTPS-U1",
      rlaDone: monthsBack(12),
      overhaulDone: null,
      pgTestDone: null,
      resyncPlanned: addDays(AS_OF, -45), // STORY: already 45 days past planned re-sync
      resyncActual: null,
    },
    description:
      "Residual-life-driven R&M of the 1985-vintage Unit-1: boiler pressure parts, turbine overhaul, ESP augmentation, C&I retrofit.",
  });

  /* ── R&M 2: RTPS Unit-2 — early stage, on track ── */
  const rm2 = buildProgress({
    rngKey: "prj-rm2",
    start: monthsBack(5),
    end: addDays(AS_OF, 420),
    milestoneCount: 18,
    physicalPct: 12,
    financialPct: 14,
    valueCr: 388,
  });
  projects.push({
    id: "PRJ-RM-02",
    name: "RTPS Unit-2 Renovation & Modernisation",
    type: "RM",
    plant: "RTPS",
    contractorId: KEY_VENDORS.VINDHYA.id,
    contractValueCr: 388,
    start: monthsBack(5),
    scheduledEnd: addDays(AS_OF, 420),
    gates: null,
    milestones: rm2.milestones,
    raBills: rm2.raBills,
    ...drawingsFor("drw-rm2", 350, 18),
    courtStatus: null,
    mobilisationAdvance: { amountCr: 19.4, disbursedOn: monthsBack(4), siteActive: true },
    reportedActivity: ["RLA test-points instrumentation complete"],
    retenderCount: 0,
    ldRatePctPerWeek: 0.5,
    ldCapPct: 5,
    rm: {
      unitId: "RTPS-U2",
      rlaDone: monthsBack(2),
      overhaulDone: null,
      pgTestDone: null,
      resyncPlanned: addDays(AS_OF, 400),
      resyncActual: null,
    },
    description: "Second R&M package sequenced behind Unit-1; RLA complete, overhaul scope frozen.",
  });

  /* ── R&M 3: BTPS Unit-1 — PG test pending after overhaul ── */
  const rm3 = buildProgress({
    rngKey: "prj-rm3",
    start: monthsBack(11),
    end: addDays(AS_OF, 60),
    milestoneCount: 16,
    physicalPct: 84,
    financialPct: 86,
    valueCr: 265,
  });
  projects.push({
    id: "PRJ-RM-03",
    name: "BTPS Unit-1 Overhaul & Efficiency Restoration",
    type: "RM",
    plant: "BTPS",
    contractorId: KEY_VENDORS.CAUVERY.id,
    contractValueCr: 265,
    start: monthsBack(11),
    scheduledEnd: addDays(AS_OF, 60),
    gates: null,
    milestones: rm3.milestones,
    raBills: rm3.raBills,
    ...drawingsFor("drw-rm3", 240, 9),
    courtStatus: null,
    mobilisationAdvance: null,
    reportedActivity: ["Unit boxed up; PG test scheduling with RLDC"],
    retenderCount: 0,
    ldRatePctPerWeek: 0.5,
    ldCapPct: 5,
    rm: {
      unitId: "BTPS-U1",
      rlaDone: monthsBack(10),
      overhaulDone: monthsBack(1),
      pgTestDone: null,
      resyncPlanned: addDays(AS_OF, 30),
      resyncActual: null,
    },
    description: "Capital overhaul targeting a 60 kcal/kWh heat-rate recovery on BTPS Unit-1.",
  });

  /* ── STORY [A6]: FGD at BTPS — Deccan EPC, 118-drawing backlog ── */
  const fgd1 = buildProgress({
    rngKey: "prj-fgd1",
    start: monthsBack(16),
    end: addDays(AS_OF, 300),
    milestoneCount: 24,
    physicalPct: 31,
    financialPct: 36,
    valueCr: 780,
    lateOpenMilestones: 3,
  });
  projects.push({
    id: "PRJ-FGD-01",
    name: "BTPS FGD Retrofit (Units 1–3)",
    type: "FGD",
    plant: "BTPS",
    contractorId: KEY_VENDORS.DECCAN.id,
    contractValueCr: 780,
    start: monthsBack(16),
    scheduledEnd: addDays(AS_OF, 300),
    gates: null,
    milestones: fgd1.milestones,
    raBills: fgd1.raBills,
    ...drawingsFor("drw-fgd1", 890, 118), // STORY: 118 pending drawings
    courtStatus: null,
    mobilisationAdvance: { amountCr: 39, disbursedOn: monthsBack(15), siteActive: true },
    reportedActivity: ["Absorber-A shell courses 1–4 erected", "Limestone handling civil 60%"],
    retenderCount: 0,
    ldRatePctPerWeek: 0.5,
    ldCapPct: 5,
    rm: null,
    description:
      "Wet limestone FGD across three units against the MoEFCC SO₂ norm deadline. Engineering throughput is the critical path.",
  });

  /* ── FGD 2: RTPS — awarded, early ── */
  const fgd2 = buildProgress({
    rngKey: "prj-fgd2",
    start: monthsBack(6),
    end: addDays(AS_OF, 700),
    milestoneCount: 20,
    physicalPct: 7,
    financialPct: 9,
    valueCr: 810,
  });
  projects.push({
    id: "PRJ-FGD-02",
    name: "RTPS FGD Retrofit (Units 5–8)",
    type: "FGD",
    plant: "RTPS",
    contractorId: KEY_VENDORS.HOYSALA.id,
    contractValueCr: 810,
    start: monthsBack(6),
    scheduledEnd: addDays(AS_OF, 700),
    gates: null,
    milestones: fgd2.milestones,
    raBills: fgd2.raBills,
    ...drawingsFor("drw-fgd2", 760, 31),
    courtStatus: null,
    mobilisationAdvance: { amountCr: 40.5, disbursedOn: monthsBack(5), siteActive: true },
    reportedActivity: ["Geotech investigation complete; absorber foundations set out"],
    retenderCount: 0,
    ldRatePctPerWeek: 0.5,
    ldCapPct: 5,
    rm: null,
    description: "FGD retrofit award for the RTPS 5–8 block, sequenced against the category norm deadline.",
  });

  /* ── STORY [A10]: DCS rectification re-tendered 4× ── */
  const dcs = buildProgress({
    rngKey: "prj-dcs",
    start: monthsBack(9),
    end: addDays(AS_OF, 120),
    milestoneCount: 12,
    physicalPct: 22,
    financialPct: 24,
    valueCr: 46,
    lateOpenMilestones: 2,
  });
  projects.push({
    id: "PRJ-CIV-01",
    name: "RTPS Unit 5–6 DCS Rectification Package",
    type: "CIVIL",
    plant: "RTPS",
    contractorId: KEY_VENDORS.HOYSALA.id,
    contractValueCr: 46,
    start: monthsBack(9),
    scheduledEnd: addDays(AS_OF, 120),
    gates: null,
    milestones: dcs.milestones,
    raBills: dcs.raBills,
    ...drawingsFor("drw-dcs", 120, 14),
    courtStatus: null,
    mobilisationAdvance: null,
    reportedActivity: ["Controller cabinet layout approved"],
    retenderCount: 4, // STORY: same scope tendered 4 times before award
    ldRatePctPerWeek: 0.5,
    ldCapPct: 5,
    rm: null,
    description:
      "Control-system rectification scope that went through four tender cycles before award — the unresolved-problem signature.",
  });

  /* ── STORY (divergence #2): Ash pond raising — fin 55 vs phy 44 ── */
  const ash = buildProgress({
    rngKey: "prj-ash",
    start: monthsBack(13),
    end: addDays(AS_OF, 150),
    milestoneCount: 14,
    physicalPct: 44,
    financialPct: 55,
    valueCr: 118,
    lateOpenMilestones: 2,
  });
  projects.push({
    id: "PRJ-CIV-02",
    name: "YTPS Ash Pond Lagoon-2 Raising",
    type: "CIVIL",
    plant: "YTPS",
    contractorId: KEY_VENDORS.DECCAN.id,
    contractValueCr: 118,
    start: monthsBack(13),
    scheduledEnd: addDays(AS_OF, 150),
    gates: null,
    milestones: ash.milestones,
    raBills: ash.raBills,
    ...drawingsFor("drw-ash", 60, 6),
    courtStatus: {
      forum: "NGT (Southern Zone)",
      caseId: "OA-2025-214",
      status: "PENDING",
      note: "Ash-dyke stability compliance application; no restraint on works",
    },
    mobilisationAdvance: null,
    reportedActivity: ["Dyke raising Zone-B at EL +12 m"],
    retenderCount: 1,
    ldRatePctPerWeek: 0.5,
    ldCapPct: 5,
    rm: null,
    description: "Lagoon-2 dyke raising for two more years of ash storage at YTPS.",
  });

  /* ── Solar extension — healthy ── */
  const sol = buildProgress({
    rngKey: "prj-sol",
    start: monthsBack(8),
    end: addDays(AS_OF, 240),
    milestoneCount: 13,
    physicalPct: 58,
    financialPct: 56,
    valueCr: 96,
  });
  projects.push({
    id: "PRJ-SOL-01",
    name: "Solar Park Extension — 40 MWp (Block C)",
    type: "SOLAR",
    plant: "HYDRO",
    contractorId: KEY_VENDORS.MALNAD.id,
    contractValueCr: 96,
    start: monthsBack(8),
    scheduledEnd: addDays(AS_OF, 240),
    gates: null,
    milestones: sol.milestones,
    raBills: sol.raBills,
    ...drawingsFor("drw-sol", 90, 4),
    courtStatus: null,
    mobilisationAdvance: null,
    reportedActivity: ["Module mounting structures 70% erected"],
    retenderCount: 0,
    ldRatePctPerWeek: 0.5,
    ldCapPct: 5,
    rm: null,
    description: "40 MWp extension block with grid-tie at the existing pooling station.",
  });

  /* ── Hydro civil — healthy ── */
  const hyd = buildProgress({
    rngKey: "prj-hyd",
    start: monthsBack(10),
    end: addDays(AS_OF, 320),
    milestoneCount: 15,
    physicalPct: 39,
    financialPct: 41,
    valueCr: 74,
  });
  projects.push({
    id: "PRJ-CIV-03",
    name: "Sharavathi Valley Penstock Protection Works",
    type: "CIVIL",
    plant: "HYDRO",
    contractorId: KEY_VENDORS.CAUVERY.id,
    contractValueCr: 74,
    start: monthsBack(10),
    scheduledEnd: addDays(AS_OF, 320),
    gates: null,
    milestones: hyd.milestones,
    raBills: hyd.raBills,
    ...drawingsFor("drw-hyd", 70, 3),
    courtStatus: null,
    mobilisationAdvance: null,
    reportedActivity: ["Slope stabilisation anchors 55% complete"],
    retenderCount: 0,
    ldRatePctPerWeek: 0.5,
    ldCapPct: 5,
    rm: null,
    description: "Rockfall protection and drainage works above penstocks 3–6.",
  });

  return projects;
}
