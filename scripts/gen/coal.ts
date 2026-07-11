// Coal world generator: ~3,200 rakes, 6 FSAs, 40 stockpiles.
// STORY injections (§4, set 1) are flagged inline.

import { chance, pick, randFloat, randInt, randNormal, stream } from "@/lib/rng";
import type { Colliery, Fsa, Rake, Stockpile, ThermalPlant } from "@/lib/types";
import { gradeByName, gradeForGcv, GRADE_BANDS } from "@/lib/engines/norms";
import { AS_OF, COLLIERIES, daysInMonth, MONTHS } from "./context";

// Which collieries feed which plant, with rough monthly rake counts.
const SUPPLY: { source: string; plant: ThermalPlant; rakesPerMonth: number }[] = [
  { source: "W-3", plant: "RTPS", rakesPerMonth: 34 }, // STORY: grade slippage source
  { source: "W-1", plant: "RTPS", rakesPerMonth: 105 },
  { source: "S-7", plant: "RTPS", rakesPerMonth: 48 }, // STORY: chronic under-loading siding
  { source: "M-5", plant: "BTPS", rakesPerMonth: 75 }, // STORY: 2.2% transit-loss route
  { source: "W-1", plant: "BTPS", rakesPerMonth: 50 },
  { source: "S-7", plant: "BTPS", rakesPerMonth: 28 },
  { source: "M-2", plant: "YTPS", rakesPerMonth: 80 }, // STORY: FSA lifted at 78% ACQ
  { source: "K-1", plant: "YTPS", rakesPerMonth: 85 },
  { source: "W-3", plant: "YTPS", rakesPerMonth: 12 },
];

const colById = new Map(COLLIERIES.map((c) => [c.id, c]));

// STORY: 9-day RTPS wagon-tippler outage → demurrage cluster in month index 3.
const TIPPLER_OUTAGE = { month: MONTHS[3], fromDay: 9, toDay: 17 };

// STORY: monsoon moisture dip in the last two months (received GCV sags,
// fired GCV follows — an EXPLAINED loss, unlike W-3's).
const MONSOON = new Set([MONTHS[4], MONTHS[5]]);

export function genRakes(): Rake[] {
  const rng = stream("rakes");
  const rakes: Rake[] = [];
  let seq = 1;
  let w3Seq = 0;
  // The 7 egregious >1,000 kcal rakes land on these W-3 rake ordinals.
  const egregiousW3 = new Set([3, 45, 90, 135, 180, 225, 262]);

  for (const month of MONTHS) {
    for (const s of SUPPLY) {
      const col = colById.get(s.source)!;
      const n = Math.round(s.rakesPerMonth * randFloat(rng, 0.92, 1.08));
      for (let i = 0; i < n; i++) {
        const id = `RK-${String(seq).padStart(4, "0")}`;
        const day = randInt(rng, 1, daysInMonth(month));
        const date = `${month}-${String(day).padStart(2, "0")}`;
        const wagons = randInt(rng, 56, 59);
        const wagonCapT = 66;

        // ── Loading: billed tonnage vs rated capacity ──
        // STORY: S-7 siding chronically under-loads ~4%; the rest load near rated.
        const loadFactor =
          s.source === "S-7" ? randFloat(rng, 0.952, 0.968) : randFloat(rng, 0.998, 1.0);
        const billedTonnes = Math.round(wagons * wagonCapT * loadFactor);

        // ── Billed GCV: upper-mid band, so a norm transit drop (≤120 kcal)
        // does not cross the grade floor — grade slips stay a signature, not noise.
        const band = gradeByName(col.typicalGrade);
        const billedGCV = Math.round(randFloat(rng, band.minGcv + 160, band.maxGcv - 40));

        // ── Transit quantity loss ──
        // Norm 1.5%. STORY: M-5 route runs ~2.2%.
        const lossPct =
          s.source === "M-5"
            ? randNormal(rng, 2.2, 0.25)
            : Math.max(0.4, randNormal(rng, 1.15, 0.3));
        const receivedTonnes = Math.round(billedTonnes * (1 - Math.max(0.2, lossPct) / 100));

        // ── Transit GCV drop ──
        // STORY: ~40% of W-3 rakes slip ~600 kcal (a full grade at the
        // receiving weighbridge); 7 egregious rakes slip >1,000 kcal.
        let transitDrop: number;
        if (s.source === "W-3") {
          w3Seq++;
          if (egregiousW3.has(w3Seq)) transitDrop = randFloat(rng, 1010, 1180);
          else if (chance(rng, 0.4)) transitDrop = randNormal(rng, 600, 60);
          else transitDrop = Math.max(15, randNormal(rng, 85, 30));
        } else {
          transitDrop = Math.max(15, randNormal(rng, 85, 30));
        }
        const monsoonExtra = MONSOON.has(month) ? randFloat(rng, 25, 70) : 0;
        const receivedGCV = Math.round(billedGCV - transitDrop - monsoonExtra);

        // ── Yard → boiler: fired GCV ──
        // Mostly inside the 85 kcal storage tolerance; ~6% of rakes exceed it.
        const firedDrop = chance(rng, 0.06)
          ? randFloat(rng, 95, 140)
          : randFloat(rng, 30, 80);
        const firedGCV = Math.round(receivedGCV - firedDrop - (MONSOON.has(month) ? randFloat(rng, 10, 35) : 0));

        // ── Tippler turnaround ──
        // Free time 6 h. STORY: 9-day RTPS tippler outage → 30–90 h queues.
        const inOutage =
          s.plant === "RTPS" &&
          month === TIPPLER_OUTAGE.month &&
          day >= TIPPLER_OUTAGE.fromDay &&
          day <= TIPPLER_OUTAGE.toDay;
        const placementHours = inOutage
          ? randFloat(rng, 26, 70)
          : Math.max(3, randNormal(rng, 5.4, 1.4));

        rakes.push({
          id,
          date,
          month,
          source: s.source,
          plant: s.plant,
          wagons,
          wagonCapT,
          billedTonnes,
          receivedTonnes,
          billedGCV,
          receivedGCV,
          firedGCV,
          billedGrade: band.grade,
          freightPerTonne: col.freightPerTonne,
          placementHours: Math.round(placementHours * 10) / 10,
          thirdPartySampled: chance(rng, 0.15), // STORY: ~15% third-party sampled
          moisturePct:
            Math.round((MONSOON.has(month) ? randFloat(rng, 14, 19) : randFloat(rng, 9, 13)) * 10) / 10,
        });
        seq++;
      }
    }
  }
  return rakes;
}

export function genFsas(rakes: Rake[]): Fsa[] {
  const rng = stream("fsas");
  const slabs = [
    { belowPct: 80, penaltyPctOfValue: 20 },
    { belowPct: 85, penaltyPctOfValue: 10 },
    { belowPct: 90, penaltyPctOfValue: 5 },
  ];
  const pairs: { source: string; plant: ThermalPlant }[] = [
    { source: "W-3", plant: "RTPS" },
    { source: "W-1", plant: "RTPS" },
    { source: "S-7", plant: "RTPS" },
    { source: "M-5", plant: "BTPS" },
    { source: "M-2", plant: "YTPS" }, // STORY: lifted ≈78% of pro-rated ACQ
    { source: "K-1", plant: "YTPS" },
  ];
  return pairs.map((p, i) => {
    const monthly = MONTHS.map((month) => ({
      month,
      tonnes: rakes
        .filter((r) => r.source === p.source && r.plant === p.plant && r.month === month)
        .reduce((s, r) => s + r.receivedTonnes, 0),
    }));
    const lifted = monthly.reduce((s, m) => s + m.tonnes, 0);
    // Set ACQ so lifted% lands where the story wants it.
    const targetPct = p.source === "M-2" ? 0.78 : randFloat(rng, 0.93, 1.0);
    const acqTonnes = Math.round((lifted / targetPct) * 2); // annualize the 6-mo window
    const band = gradeByName(colTypicalGrade(p.source));
    return {
      id: `FSA-${String(i + 1).padStart(2, "0")}`,
      source: p.source,
      plant: p.plant,
      acqTonnes,
      monthlyLifted: monthly,
      penaltySlabs: slabs,
      avgPricePerTonne: band.pitheadPrice,
    };
  });
}

function colTypicalGrade(source: string): string {
  return COLLIERIES.find((c) => c.id === source)?.typicalGrade ?? "G10";
}

export function genStockpiles(): Stockpile[] {
  const rng = stream("stockpiles");
  const out: Stockpile[] = [];
  const plants: { plant: ThermalPlant; yards: number }[] = [
    { plant: "RTPS", yards: 16 },
    { plant: "BTPS", yards: 12 },
    { plant: "YTPS", yards: 12 },
  ];
  let i = 1;
  for (const p of plants) {
    for (let y = 1; y <= p.yards; y++) {
      const ageDays = randInt(rng, 6, 90);
      const bookTonnes = randInt(rng, 8000, 42000);
      // Book-vs-physical gap: mostly ≈ storage norm; a few yards run hot.
      const gapPct = chance(rng, 0.15) ? randFloat(rng, 1.2, 2.6) : randFloat(rng, 0.05, 0.7);
      const gcv = randInt(rng, 3400, 4900);
      const formed = new Date(AS_OF + "T00:00:00Z");
      formed.setUTCDate(formed.getUTCDate() - ageDays);
      out.push({
        id: `SP-${String(i).padStart(2, "0")}`,
        plant: p.plant,
        yard: `Yard ${p.plant}-${String.fromCharCode(64 + Math.ceil(y / 4))}${((y - 1) % 4) + 1}`,
        bookTonnes,
        physicalTonnes: Math.round(bookTonnes * (1 - gapPct / 100)),
        ageDays,
        gcv,
        formedOn: formed.toISOString().slice(0, 10),
      });
      i++;
    }
  }
  // STORY: combustion-risk piles — old AND big (age>45d & >20k t).
  out[4] = { ...out[4], ageDays: 68, bookTonnes: 31000, physicalTonnes: 30400 };
  out[20] = { ...out[20], ageDays: 55, bookTonnes: 24500, physicalTonnes: 24100 };
  return out;
}
