// Legal world: 130 matters/cases with hearing histories.
// STORY injections (§4, set 6) flagged inline.

import { chance, pick, randFloat, randInt, stream } from "@/lib/rng";
import type { LegalMatter } from "@/lib/types";
import { AS_OF, COUNSEL, LAW_FIRMS } from "./context";

function addDays(base: string, days: number): string {
  const d = new Date(base + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const FORUMS = [
  "High Court of Karnataka", "High Court of Karnataka (Dharwad)", "KERC", "APTEL",
  "Prl District Court, Raichur", "Prl District Court, Ballari", "Arbitral Tribunal (Bengaluru)",
  "Supreme Court of India", "KSAT", "Labour Court, Kalaburagi", "NGT (Southern Zone)",
];
const STAGES = ["Notice", "Pleadings", "Evidence", "Arguments", "Reserved for orders", "Appeal"];
const TYPES = [
  "Land acquisition — enhanced compensation", "Service matter — promotion", "Service matter — regularisation",
  "Contract dispute — price variation", "Tax — entry tax demand", "Insurance — claim repudiation",
  "Environmental — compliance application", "Recovery suit", "Writ — tender challenge", "Electricity duty dispute",
];

function hearingsFor(rngKey: string, filed: string, n: number): { date: string; note: string }[] {
  const rng = stream(rngKey);
  const notes = [
    "Adjourned — counsel engaged in another matter", "Objections filed by respondent",
    "Affidavit of compliance taken on record", "Interim application heard; orders reserved",
    "Cross-examination continued", "Listed for arguments", "Fresh vakalath filed",
    "Court directed status report", "Part-heard; to continue",
  ];
  const out: { date: string; note: string }[] = [];
  let d = filed;
  for (let i = 0; i < n; i++) {
    d = addDays(d, randInt(rng, 35, 120));
    if (d >= AS_OF) break;
    out.push({ date: d, note: pick(rng, notes) });
  }
  return out;
}

export function genLegalMatters(): LegalMatter[] {
  const rng = stream("legal");
  const matters: LegalMatter[] = [];

  /* STORY: dispute #1 threatening milestones — the PSP writ + stay. */
  matters.push({
    id: "WP-2025-1187",
    title: "Conservation trust vs State & KPCL — PSP forest works",
    forum: "High Court of Karnataka",
    matterType: "Writ — Environmental / Stay of works",
    stage: "Arguments",
    filed: addDays(AS_OF, -400),
    exposureCr: 130,
    counsel: COUNSEL[0],
    firm: LAW_FIRMS[0],
    feePaidLakh: 38.5,
    hearings: hearingsFor("h-psp", addDays(AS_OF, -400), 6),
    nextHearing: addDays(AS_OF, 11),
    linkedProjectId: "PRJ-PSP-01",
    linkedContractId: null,
    claimKind: "OTHER",
    status: "OPEN",
    source: "eCourts",
  });

  /* STORY: dispute #2 threatening milestones — Deccan arbitration on the
     RTPS U-1 R&M package (its only LIVE dispute). */
  matters.push({
    id: "ARB-2025-014",
    title: "Deccan EPC Ltd vs KPCL — R&M package EOT & idle charges",
    forum: "Arbitral Tribunal (Bengaluru)",
    matterType: "Contract dispute — Injunction sought on encashment",
    stage: "Arbitration — hearings",
    filed: addDays(AS_OF, -260),
    exposureCr: 46.2,
    counsel: COUNSEL[2],
    firm: LAW_FIRMS[1],
    feePaidLakh: 22.0,
    hearings: hearingsFor("h-arb", addDays(AS_OF, -260), 4),
    nextHearing: addDays(AS_OF, 24),
    linkedProjectId: "PRJ-RM-01",
    linkedContractId: "C-EPC-1042",
    claimKind: "OTHER",
    status: "OPEN",
    source: "Manual",
  });

  /* STORY [E2]: LD-recovery claims EXIST for the four "claimed" contracts —
     so the un-pursued pool stays exactly the flagship ₹8.1 cr. */
  const ldClaims: [string, string, number][] = [
    ["C-CIV-2210", "KPCL vs Malnad Infra — LD recovery (township roads)", 1.2],
    ["C-ELE-2306", "KPCL vs Hoysala Electricals — LD set-off (bay extension)", 0.9],
    ["C-OMS-2118", "KPCL vs Vindhya Boiler Services — LD recovery (term contract)", 1.55],
    ["C-CHS-2401", "KPCL vs Kaveri Logistics — LD recovery (belt replacement)", 1.3],
  ];
  ldClaims.forEach(([contractId, title, exposure], k) => {
    matters.push({
      id: `OS-2025-${400 + k}`,
      title,
      forum: pick(rng, ["Prl District Court, Raichur", "Prl District Court, Ballari"]),
      matterType: "Recovery suit — liquidated damages",
      stage: pick(rng, ["Pleadings", "Evidence"]),
      filed: addDays(AS_OF, -randInt(rng, 90, 220)),
      exposureCr: exposure,
      counsel: pick(rng, COUNSEL),
      firm: pick(rng, LAW_FIRMS),
      feePaidLakh: Math.round(randFloat(rng, 2, 8) * 10) / 10,
      hearings: hearingsFor(`h-ld${k}`, addDays(AS_OF, -200), 3),
      nextHearing: addDays(AS_OF, randInt(rng, 8, 60)),
      linkedProjectId: null,
      linkedContractId: contractId,
      claimKind: "LD_RECOVERY",
      status: "OPEN",
      source: "eCourts",
    });
  });

  /* STORY [C1-adjacent]: coal-quality claims against colliery/railway. */
  matters.push({
    id: "ARB-2024-171",
    title: "KPCL vs Western Collieries — grade slippage debit notes (W-3)",
    forum: "Arbitral Tribunal (Bengaluru)",
    matterType: "Contract dispute — coal quality",
    stage: "Arbitration — claim filed",
    filed: addDays(AS_OF, -150),
    exposureCr: 11.4,
    counsel: pick(rng, COUNSEL),
    firm: pick(rng, LAW_FIRMS),
    feePaidLakh: 9.5,
    hearings: hearingsFor("h-coal", addDays(AS_OF, -150), 2),
    nextHearing: addDays(AS_OF, 34),
    linkedProjectId: null,
    linkedContractId: null,
    claimKind: "COAL_QUALITY",
    status: "OPEN",
    source: "Manual",
  });

  // Filler matters to 130 — routine portfolio, mixed open/closed.
  let i = matters.length + 1;
  while (matters.length < 130) {
    const filed = addDays(AS_OF, -randInt(rng, 60, 1800));
    const open = chance(rng, 0.72);
    const forum = pick(rng, FORUMS);
    matters.push({
      id: `${forum.includes("High Court") ? "WP" : forum.includes("Arbitral") ? "ARB" : forum.includes("KERC") ? "OP" : "OS"}-${filed.slice(0, 4)}-${String(1000 + i)}`,
      title: pick(rng, TYPES) + " — " + pick(rng, ["RTPS", "BTPS", "YTPS", "Corporate", "Hydro"]),
      forum,
      matterType: pick(rng, TYPES),
      stage: open ? pick(rng, STAGES) : "Disposed",
      filed,
      exposureCr: Math.round(randFloat(rng, 0.05, 24) * 100) / 100,
      counsel: pick(rng, COUNSEL),
      firm: pick(rng, LAW_FIRMS),
      feePaidLakh: Math.round(randFloat(rng, 0.8, 30) * 10) / 10,
      hearings: hearingsFor(`h-${i}`, filed, randInt(rng, 2, 8)),
      nextHearing: open ? addDays(AS_OF, randInt(rng, 3, 120)) : null,
      linkedProjectId: null,
      linkedContractId: null,
      claimKind: chance(rng, 0.06) ? "COAL_QUALITY" : "OTHER",
      status: open ? "OPEN" : "CLOSED",
      source: forum.includes("Arbitral") || forum === "KERC" ? "Manual" : "eCourts",
    });
    i++;
  }
  return matters;
}
