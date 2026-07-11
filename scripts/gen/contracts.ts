// Contracts & procurement world: 220 contracts, 260 BGs, 480 vendors,
// 3,500 spare SKUs. STORY injections (§4, set 3) flagged inline.

import { chance, pick, randFloat, randInt, stream } from "@/lib/rng";
import type { BankGuarantee, Contract, ContractMilestone, Spare, Vendor } from "@/lib/types";
import { AS_OF, BANKS, KEY_VENDORS, MONTHS, VENDOR_NAME_PARTS } from "./context";
import type { PlantCode } from "@/lib/nav";

function addDays(base: string, days: number): string {
  const d = new Date(base + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const CATEGORIES = [
  "EPC", "O&M Services", "Spares Supply", "Civil Works", "Coal Handling",
  "Electrical", "C&I", "Consultancy", "Transport", "Housekeeping",
];
const CITIES = ["Bengaluru", "Raichur", "Ballari", "Hubballi", "Mysuru", "Hyderabad", "Chennai", "Pune", "Mumbai", "Vadodara"];

/* ── Vendors [D3] ────────────────────────────────────────────── */

export function genVendors(): Vendor[] {
  const rng = stream("vendors");
  const vendors: Vendor[] = [];

  // Crafted key vendors first (ids V-0001..V-0008).
  vendors.push(
    // STORY: Deccan EPC — grade D, slipping across projects, yet everywhere.
    { id: KEY_VENDORS.DECCAN.id, name: KEY_VENDORS.DECCAN.name, category: "EPC", city: "Bengaluru", onTimePct: 50, rejectionRatePct: 12, ldIncidents: 3, contractsCount: 6, disputeCount: 2, registeredSince: 2011 },
    { id: KEY_VENDORS.CAUVERY.id, name: KEY_VENDORS.CAUVERY.name, category: "EPC", city: "Mysuru", onTimePct: 74, rejectionRatePct: 6, ldIncidents: 2, contractsCount: 7, disputeCount: 1, registeredSince: 2009 },
    { id: KEY_VENDORS.TUNGABHADRA.id, name: KEY_VENDORS.TUNGABHADRA.name, category: "Civil Works", city: "Hubballi", onTimePct: 78, rejectionRatePct: 5, ldIncidents: 1, contractsCount: 5, disputeCount: 1, registeredSince: 2014 },
    // STORY: Malnad Infra — grade E and still winning awards.
    { id: KEY_VENDORS.MALNAD.id, name: KEY_VENDORS.MALNAD.name, category: "Civil Works", city: "Shivamogga", onTimePct: 38, rejectionRatePct: 18, ldIncidents: 4, contractsCount: 7, disputeCount: 3, registeredSince: 2016 },
    { id: KEY_VENDORS.HOYSALA.id, name: KEY_VENDORS.HOYSALA.name, category: "Electrical", city: "Bengaluru", onTimePct: 86, rejectionRatePct: 3, ldIncidents: 1, contractsCount: 9, disputeCount: 0, registeredSince: 2007 },
    { id: KEY_VENDORS.KAVERI_LOG.id, name: KEY_VENDORS.KAVERI_LOG.name, category: "Coal Handling", city: "Raichur", onTimePct: 81, rejectionRatePct: 4, ldIncidents: 1, contractsCount: 8, disputeCount: 1, registeredSince: 2012 },
    { id: KEY_VENDORS.SLV.id, name: KEY_VENDORS.SLV.name, category: "Housekeeping", city: "Ballari", onTimePct: 72, rejectionRatePct: 7, ldIncidents: 1, contractsCount: 4, disputeCount: 0, registeredSince: 2018 },
    { id: KEY_VENDORS.VINDHYA.id, name: KEY_VENDORS.VINDHYA.name, category: "O&M Services", city: "Vadodara", onTimePct: 88, rejectionRatePct: 2, ldIncidents: 0, contractsCount: 6, disputeCount: 0, registeredSince: 2005 },
  );

  const used = new Set(vendors.map((v) => v.name));
  let i = vendors.length + 1;
  while (vendors.length < 480) {
    const name = `${pick(rng, VENDOR_NAME_PARTS.first)} ${pick(rng, VENDOR_NAME_PARTS.second)} ${pick(rng, VENDOR_NAME_PARTS.suffix)}`;
    if (used.has(name)) continue;
    used.add(name);
    // Healthy tail: mostly A–C vendors.
    const onTime = Math.min(99, Math.max(45, randFloat(rng, 68, 97)));
    vendors.push({
      id: `V-${String(i).padStart(4, "0")}`,
      name,
      category: pick(rng, CATEGORIES),
      city: pick(rng, CITIES),
      onTimePct: Math.round(onTime),
      rejectionRatePct: Math.round(randFloat(rng, 0.5, 9) * 10) / 10,
      ldIncidents: chance(rng, 0.25) ? randInt(rng, 1, 2) : 0,
      contractsCount: randInt(rng, 1, 12),
      disputeCount: chance(rng, 0.08) ? 1 : 0,
      registeredSince: randInt(rng, 1998, 2024),
    });
    i++;
  }
  return vendors;
}

/* ── Contracts [D1] + the LD story [A5] ──────────────────────── */

export function genContracts(vendors: Vendor[]): Contract[] {
  const rng = stream("contracts");
  const contracts: Contract[] = [];
  const plantPool: PlantCode[] = ["RTPS", "RTPS", "RTPS", "BTPS", "BTPS", "YTPS", "YTPS", "HYDRO", "PSP"];

  const mkCorrespondence = (award: string, n: number) => {
    const subjects = [
      "Submission of PERT/CPM programme",
      "Request for extension of time — monsoon",
      "Hindrance register — site front availability",
      "Quality NCR closure report",
      "Price-variation claim for steel",
      "Reminder: milestone slippage — showcause",
      "Insurance policy renewal confirmation",
      "Sub-vendor approval request",
    ];
    return Array.from({ length: n }, (_, k) => ({
      date: addDays(award, randInt(rng, 20, 400)),
      from: chance(rng, 0.5) ? "Contractor" : "Executive Engineer (KPCL)",
      subject: subjects[k % subjects.length],
    })).filter((c) => c.date <= AS_OF);
  };

  /* STORY [A5/E2]: the two flagship un-levied LD contracts — together ₹8.1 cr.
     1) Deccan EPC, value ₹84 cr, milestone ~12 weeks late, LD capped at 5% = ₹4.2 cr.
     2) Cauvery Engg, value ₹78 cr, milestone exactly 70 days late = 5% = ₹3.9 cr. */
  contracts.push({
    id: "C-EPC-1042",
    title: "RTPS U-1 R&M — Boiler Pressure Parts Package",
    vendorId: KEY_VENDORS.DECCAN.id,
    plant: "RTPS",
    category: "EPC",
    valueCr: 84,
    awardDate: addDays(AS_OF, -420),
    endDate: addDays(AS_OF, 120),
    ldRatePctPerWeek: 0.5,
    ldCapPct: 5,
    milestones: [
      { id: "CM1", name: "Material delivery — economiser coils", due: addDays(AS_OF, -320), completedOn: addDays(AS_OF, -326), valueCr: 22 },
      { id: "CM2", name: "Erection completion — water walls", due: addDays(AS_OF, -84), completedOn: null, valueCr: 34 }, // 12 weeks late, accruing
      { id: "CM3", name: "Hydro test", due: addDays(AS_OF, 60), completedOn: null, valueCr: 28 },
    ],
    tenderMode: "OPEN",
    cycleDays: { indentToNit: 44, nitToAward: 96 },
    projectId: "PRJ-RM-01",
    correspondence: mkCorrespondence(addDays(AS_OF, -420), 6),
  });
  contracts.push({
    id: "C-EPC-1077",
    title: "BTPS FGD — Absorber Island Mechanical Works",
    vendorId: KEY_VENDORS.CAUVERY.id,
    plant: "BTPS",
    category: "EPC",
    valueCr: 78,
    awardDate: addDays(AS_OF, -380),
    endDate: addDays(AS_OF, 180),
    ldRatePctPerWeek: 0.5,
    ldCapPct: 5,
    milestones: [
      { id: "CM1", name: "Absorber shell erection — courses 1–6", due: addDays(AS_OF, -70), completedOn: null, valueCr: 30 }, // exactly 70 days late
      { id: "CM2", name: "Recycle pump house handover", due: addDays(AS_OF, 90), completedOn: null, valueCr: 21 },
    ],
    tenderMode: "OPEN",
    cycleDays: { indentToNit: 38, nitToAward: 110 },
    projectId: "PRJ-FGD-01",
    correspondence: mkCorrespondence(addDays(AS_OF, -380), 5),
  });

  /* STORY [E2]: four late-but-CLAIMED contracts (recovery already pursued),
     so the un-pursued pool stays exactly the flagship ₹8.1 cr. */
  const claimedSpecs = [
    { id: "C-CIV-2210", vendor: KEY_VENDORS.MALNAD.id, plant: "YTPS" as PlantCode, value: 24, lateDays: 95, title: "YTPS Township Road Restoration" },
    { id: "C-ELE-2306", vendor: KEY_VENDORS.HOYSALA.id, plant: "RTPS" as PlantCode, value: 18, lateDays: 60, title: "RTPS Switchyard Bay Extension" },
    { id: "C-OMS-2118", vendor: KEY_VENDORS.VINDHYA.id, plant: "BTPS" as PlantCode, value: 31, lateDays: 45, title: "BTPS Mill Maintenance Term Contract" },
    { id: "C-CHS-2401", vendor: KEY_VENDORS.KAVERI_LOG.id, plant: "RTPS" as PlantCode, value: 26, lateDays: 80, title: "RTPS CHP Conveyor Belt Replacement" },
  ];
  for (const s of claimedSpecs) {
    contracts.push({
      id: s.id,
      title: s.title,
      vendorId: s.vendor,
      plant: s.plant,
      category: s.id.includes("CIV") ? "Civil Works" : s.id.includes("ELE") ? "Electrical" : s.id.includes("CHS") ? "Coal Handling" : "O&M Services",
      valueCr: s.value,
      awardDate: addDays(AS_OF, -randInt(rng, 300, 500)),
      endDate: addDays(AS_OF, randInt(rng, 60, 200)),
      ldRatePctPerWeek: 0.5,
      ldCapPct: 5,
      milestones: [
        { id: "CM1", name: "Principal completion milestone", due: addDays(AS_OF, -s.lateDays), completedOn: addDays(AS_OF, -randInt(rng, 2, 10)), valueCr: s.value * 0.5 },
      ],
      tenderMode: "OPEN",
      cycleDays: { indentToNit: randInt(rng, 25, 60), nitToAward: randInt(rng, 60, 130) },
      projectId: null,
      correspondence: mkCorrespondence(addDays(AS_OF, -400), 4),
    });
  }

  /* STORY [D3]: grade-E Malnad Infra still winning — award 5 weeks ago. */
  contracts.push({
    id: "C-CIV-2502",
    title: "RTPS Ash Dyke Toe-Drain Rectification",
    vendorId: KEY_VENDORS.MALNAD.id,
    plant: "RTPS",
    category: "Civil Works",
    valueCr: 14.5,
    awardDate: addDays(AS_OF, -35),
    endDate: addDays(AS_OF, 330),
    ldRatePctPerWeek: 0.5,
    ldCapPct: 5,
    milestones: [
      { id: "CM1", name: "Mobilisation", due: addDays(AS_OF, 10), completedOn: null, valueCr: 2 },
      { id: "CM2", name: "Toe drain Zone A", due: addDays(AS_OF, 150), completedOn: null, valueCr: 6 },
    ],
    tenderMode: "LIMITED",
    cycleDays: { indentToNit: 30, nitToAward: 55 },
    projectId: null,
    correspondence: [],
  });

  // EPC contracts for the remaining projects (graph glue).
  const projectContracts: [string, string, PlantCode, string, number][] = [
    ["C-EPC-1001", "PRJ-PSP-01", "PSP", KEY_VENDORS.TUNGABHADRA.id, 410],
    ["C-EPC-1105", "PRJ-RM-02", "RTPS", KEY_VENDORS.VINDHYA.id, 96],
    ["C-EPC-1119", "PRJ-RM-03", "BTPS", KEY_VENDORS.CAUVERY.id, 88],
    ["C-EPC-1132", "PRJ-FGD-02", "RTPS", KEY_VENDORS.HOYSALA.id, 202],
    ["C-CIV-1140", "PRJ-CIV-01", "RTPS", KEY_VENDORS.HOYSALA.id, 46],
    ["C-CIV-1141", "PRJ-CIV-02", "YTPS", KEY_VENDORS.DECCAN.id, 118],
    ["C-CIV-1142", "PRJ-CIV-03", "HYDRO", KEY_VENDORS.CAUVERY.id, 74],
    ["C-EPC-1143", "PRJ-SOL-01", "HYDRO", KEY_VENDORS.MALNAD.id, 96],
  ];
  for (const [id, projectId, plant, vendorId, value] of projectContracts) {
    const award = addDays(AS_OF, -randInt(rng, 200, 600));
    contracts.push({
      id,
      title: `${projectId} — Principal Works Contract`,
      vendorId,
      plant,
      category: id.includes("CIV") ? "Civil Works" : "EPC",
      valueCr: value,
      awardDate: award,
      endDate: addDays(AS_OF, randInt(rng, 200, 900)),
      ldRatePctPerWeek: 0.5,
      ldCapPct: id === "C-EPC-1001" ? 10 : 5,
      milestones: [
        { id: "CM1", name: "Engineering completion", due: addDays(AS_OF, randInt(rng, 30, 120)), completedOn: null, valueCr: value * 0.2 },
        { id: "CM2", name: "Supply completion", due: addDays(AS_OF, randInt(rng, 150, 400)), completedOn: null, valueCr: value * 0.4 },
      ],
      tenderMode: "OPEN",
      cycleDays: { indentToNit: randInt(rng, 30, 70), nitToAward: randInt(rng, 70, 150) },
      projectId,
      correspondence: mkCorrespondence(award, 3),
    });
  }

  // Filler contracts to 220 — milestones on time or in the future, so the
  // unclaimed-LD pool stays the crafted ₹8.1 cr.
  const titles = [
    "AMC — Air Conditioning & Ventilation", "Supply of LT Motors", "Cooling Tower Fills Replacement",
    "Ash Water Recirculation Piping", "Township Horticulture Services", "Fire Hydrant System Overhaul",
    "Supply of Bearings & Couplings", "CW Pump Overhaul", "Coal Sampling Services", "Weighbridge Calibration AMC",
    "ESP Internals Supply", "Chimney Aviation Lamp Renewal", "Security Services", "Canteen Services",
    "Battery Bank Replacement", "Transformer Oil Filtration", "HP/LP Bypass Valve Servicing",
    "Conveyor Idler Supply", "Stacker-Reclaimer Overhaul", "DM Plant Resin Replacement",
  ];
  let i = contracts.length + 1;
  while (contracts.length < 220) {
    const vendor = vendors[randInt(rng, 8, vendors.length - 1)];
    const award = addDays(AS_OF, -randInt(rng, 30, 700));
    const value = Math.round(randFloat(rng, 0.4, 38) * 100) / 100;
    const nMs = randInt(rng, 1, 4);
    const milestones: ContractMilestone[] = Array.from({ length: nMs }, (_, k) => {
      const due = addDays(award, randInt(rng, 60, 500));
      const inPast = due < AS_OF;
      return {
        id: `CM${k + 1}`,
        name: ["Mobilisation", "Supply completion", "Erection completion", "Final handover"][k],
        due,
        // Past milestones complete on/before due; future ones open.
        completedOn: inPast ? addDays(due, -randInt(rng, 0, 25)) : null,
        valueCr: Math.round((value / nMs) * 0.8 * 100) / 100,
      };
    });
    const mode = chance(rng, 0.7) ? "OPEN" : chance(rng, 0.65) ? "LIMITED" : "SINGLE";
    contracts.push({
      id: `C-GEN-${String(3000 + i)}`,
      title: pick(rng, titles),
      vendorId: vendor.id,
      plant: pick(rng, plantPool),
      category: vendor.category,
      valueCr: value,
      awardDate: award,
      endDate: addDays(award, randInt(rng, 300, 900)),
      ldRatePctPerWeek: 0.5,
      ldCapPct: 5,
      milestones,
      tenderMode: mode as Contract["tenderMode"],
      cycleDays: { indentToNit: randInt(rng, 15, 90), nitToAward: randInt(rng, 40, 170) },
      projectId: null,
      correspondence: mkCorrespondence(award, randInt(rng, 0, 3)),
    });
    i++;
  }
  return contracts;
}

/* ── Bank guarantees [D5] ────────────────────────────────────── */

export function genBgs(contracts: Contract[]): BankGuarantee[] {
  const rng = stream("bgs");
  const bgs: BankGuarantee[] = [];
  let i = 1;
  const push = (contractId: string, vendorId: string, valueCr: number, expiryDays: number, type: BankGuarantee["type"]) => {
    bgs.push({
      id: `BG-${String(i++).padStart(4, "0")}`,
      contractId,
      vendorId,
      bank: pick(rng, BANKS),
      type,
      valueCr: Math.round(valueCr * 100) / 100,
      issued: addDays(AS_OF, -randInt(rng, 100, 600)),
      expiry: addDays(AS_OF, expiryDays),
    });
  };

  /* STORY [D5]: 3 BGs inside the 30-day window (5 / 16 / 24 days),
     plus one already-expired PBG still unrenewed. */
  const big = contracts.filter((c) => c.valueCr >= 20);
  push(big[0].id, big[0].vendorId, big[0].valueCr * 0.1, 5, "PBG");
  push(big[1].id, big[1].vendorId, big[1].valueCr * 0.1, 16, "PBG");
  push(big[2].id, big[2].vendorId, big[2].valueCr * 0.05, 24, "ABG");
  push(big[3].id, big[3].vendorId, big[3].valueCr * 0.1, -12, "PBG"); // expired

  for (const c of contracts) {
    if (bgs.length >= 260) break;
    if (bgs.some((b) => b.contractId === c.id)) continue;
    // PBG for everything sizeable…
    if (c.valueCr >= 1) push(c.id, c.vendorId, c.valueCr * 0.1, randInt(rng, 45, 420), "PBG");
    // …ABG where an advance exists (EPC), retention BG occasionally.
    if (c.category === "EPC" && bgs.length < 260 && chance(rng, 0.8))
      push(c.id, c.vendorId, c.valueCr * 0.1, randInt(rng, 60, 300), "ABG");
    else if (chance(rng, 0.12) && bgs.length < 260)
      push(c.id, c.vendorId, c.valueCr * 0.05, randInt(rng, 90, 400), "RETENTION");
  }
  return bgs.slice(0, 260);
}

/* ── Spares [D2] ─────────────────────────────────────────────── */

const SPARE_NOUNS = [
  "Bearing DE", "Bearing NDE", "Mechanical seal", "Impeller", "Wear plate", "Gearbox",
  "Coupling element", "Journal shaft", "Grinding roll", "Classifier vane", "Mill liner",
  "Idler roller", "Pulley lagging", "Belt fastener", "Vibrating screen mesh", "Nozzle tip",
  "Igniter assembly", "Flame scanner", "Thermocouple K-type", "RTD element", "Pressure transmitter",
  "Control valve trim", "Actuator diaphragm", "Solenoid valve", "Limit switch", "Contactor",
  "Relay card", "I/O module", "Power supply unit", "VFD module", "HT fuse", "Bus-bar support",
  "Insulator disc", "Air filter element", "Oil filter cartridge", "Hydraulic hose", "O-ring kit",
  "Gasket sheet", "Expansion bellow", "Soot blower lance", "ESP emitting electrode",
  "ESP collecting plate", "Rapping hammer", "Ash slurry pump casing", "Clinker grinder tooth",
];
const SPARE_SYSTEMS = ["Boiler", "Turbine", "Generator", "Mill", "CHP", "AHP", "ESP", "CW system", "DM plant", "Switchyard"];

export function genSpares(): Spare[] {
  const rng = stream("spares");
  const spares: Spare[] = [];
  const plants = ["RTPS", "BTPS", "YTPS"] as const;

  for (let i = 1; i <= 3500; i++) {
    const plant = plants[i % 3];
    const ved: Spare["ved"] = chance(rng, 0.15) ? "V" : chance(rng, 0.41) ? "E" : "D";
    const unitCost = Math.round(randFloat(rng, 800, 480000));
    const active = chance(rng, 0.78);
    const monthlyIssues = MONTHS.map(() => (active ? randInt(rng, 0, ved === "D" ? 2 : 6) : 0));
    const leadTimeMonths = ved === "V" ? randInt(rng, 2, 6) : randInt(rng, 1, 4);
    const forecast = monthlyIssues.reduce((a, b) => a + b, 0) / 6;
    // Healthy default: comfortable cover for V-class.
    const onHand = active
      ? Math.max(1, Math.round(forecast * leadTimeMonths * randFloat(rng, 1.3, 3)))
      : randInt(rng, 1, 30);
    spares.push({
      sku: `SKU-${String(i).padStart(5, "0")}`,
      description: `${pick(rng, SPARE_SYSTEMS)} — ${pick(rng, SPARE_NOUNS)}`,
      plant,
      ved,
      unitCost,
      onHand,
      leadTimeMonths,
      monthlyIssues,
      monthsSinceLastIssue: active ? randInt(rng, 0, 5) : randInt(rng, 6, 22),
    });
  }

  /* STORY [D2]: 12 stock-out-risk V-class criticals… */
  const vIdx = spares.map((s, idx) => ({ s, idx })).filter((x) => x.s.ved === "V" && x.s.monthlyIssues.some((m) => m > 0));
  for (let k = 0; k < 12; k++) {
    const { s, idx } = vIdx[k * 7];
    const forecast = s.monthlyIssues.reduce((a, b) => a + b, 0) / 6;
    spares[idx] = { ...s, leadTimeMonths: 5, onHand: Math.max(0, Math.floor(forecast * 5 * 0.35)) };
  }
  /* …and a dead-stock pool echoing the ₹5.04 cr DG-spares write-off pattern. */
  let deadValue = 0;
  const target = 5.04e7;
  let j = 40;
  while (deadValue < target && j < spares.length) {
    const s = spares[j];
    if (s.ved === "D") {
      const onHand = randInt(rng, 4, 60);
      const unitCost = randInt(rng, 40000, 220000);
      spares[j] = {
        ...s,
        onHand,
        unitCost,
        monthlyIssues: MONTHS.map(() => 0),
        monthsSinceLastIssue: randInt(rng, 25, 70),
      };
      deadValue += onHand * unitCost;
    }
    j += 9;
  }
  return spares;
}
