// Plant-operations world: 9 units with monthly series, 140 outages,
// emissions, 26 reservoirs, solar, 60 safety incidents.
// STORY injections (§4, set 4) flagged inline.

import { chance, pick, randFloat, randInt, randNormal, stream } from "@/lib/rng";
import type { EmissionMonth, GenUnit, Incident, Outage, Reservoir, SolarMonth, ThermalPlant } from "@/lib/types";
import { AS_OF, daysInMonth, MONTHS, UNITS } from "./context";

// STORY [B3]: heat-rate drift on two units costing ≈ ₹18 cr annualized.
const HEAT_DRIFT: Record<string, number> = { "BTPS-U2": 43, "YTPS-U1": 27 };

const NORM_HR: Record<string, number> = {
  "RTPS-U1": 2450, "RTPS-U2": 2450, "RTPS-U5": 2400, "RTPS-U8": 2380,
  "BTPS-U1": 2350, "BTPS-U2": 2330, "BTPS-U3": 2300,
  "YTPS-U1": 2280, "YTPS-U2": 2280,
};

export function genUnits(): GenUnit[] {
  const rng = stream("units");
  return UNITS.map((u) => {
    const normHr = NORM_HR[u.id];
    const drift = HEAT_DRIFT[u.id] ?? 0;
    const monthly = MONTHS.map((month) => {
      const plf = u.id === "RTPS-U1" ? randFloat(rng, 0, 8) : randFloat(rng, 58, 86); // U1 down for R&M
      const hours = daysInMonth(month) * 24;
      const genMU = (u.capacityMW * (plf / 100) * hours) / 1000;
      return {
        month,
        plfPct: Math.round(plf * 10) / 10,
        availabilityPct: Math.round((u.id === "RTPS-U1" ? randFloat(rng, 0, 10) : randFloat(rng, 78, 96)) * 10) / 10,
        heatRate: Math.round(normHr + drift + randNormal(rng, drift > 0 ? 2 : 6, 5)),
        normHeatRate: normHr,
        auxPct: Math.round((u.capacityMW <= 250 ? randFloat(rng, 8.6, 9.4) : randFloat(rng, 5.4, 6.6)) * 100) / 100,
        normAuxPct: u.capacityMW <= 250 ? 9.0 : 6.0,
        genMU: Math.round(genMU * 10) / 10,
        landedFuelCostPerKg: Math.round(randFloat(rng, 0.64, 0.7) * 1000) / 1000, // ₹ per 1000 kcal
      };
    });
    // FGD status. STORY [B9]: RTPS-U5 is past its category norm deadline.
    const fgd: GenUnit["fgd"] =
      u.plant === "YTPS"
        ? { required: true, status: "UNDER_ERECTION", normDeadline: "2027-12-31" }
        : u.plant === "BTPS"
          ? { required: true, status: "AWARDED", normDeadline: "2027-06-30" }
          : u.id === "RTPS-U5"
            ? { required: true, status: "AWARDED", normDeadline: addMonths(AS_OF, -4) }
            : u.id === "RTPS-U8"
              ? { required: true, status: "AWARDED", normDeadline: "2027-06-30" }
              : { required: true, status: "NOT_AWARDED", normDeadline: "2028-12-31" };
    return {
      id: u.id,
      plant: u.plant as ThermalPlant,
      capacityMW: u.capacityMW,
      commissioned: u.commissioned,
      monthly,
      fgd,
      // STORY [B1/B2]: RTPS-U2 carries the recurring boiler-tube signature.
      sensorHealth: u.id === "RTPS-U2" ? 58 : u.commissioned < 1995 ? randInt(rng, 62, 78) : randInt(rng, 80, 96),
      tubeLeakCount12mo: u.id === "RTPS-U2" ? 7 : u.commissioned < 1995 ? randInt(rng, 1, 3) : randInt(rng, 0, 1),
    };
  });
}

function addMonths(base: string, n: number): string {
  const d = new Date(base + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

/* ── Outages [B5] ────────────────────────────────────────────── */

const FORCED_CAUSES: { cause: string; equipment: string[]; weight: number; hrs: [number, number] }[] = [
  { cause: "Boiler tube leak", equipment: ["Water wall", "Economiser", "Superheater", "Reheater"], weight: 0.22, hrs: [40, 100] },
  { cause: "Mill outage", equipment: ["Mill 3A", "Mill 5B", "Mill 2C"], weight: 0.2, hrs: [6, 28] },
  { cause: "ESP / draft system", equipment: ["ID fan", "ESP field", "FD fan"], weight: 0.14, hrs: [8, 36] },
  { cause: "Turbine vibration", equipment: ["HP rotor", "IP gland", "Bearing 3"], weight: 0.1, hrs: [24, 90] },
  { cause: "Generator / electrical", equipment: ["Stator cooling", "GT protection", "Exciter"], weight: 0.11, hrs: [12, 60] },
  { cause: "CHP conveyor", equipment: ["Conveyor 4B", "Crusher house", "Stacker"], weight: 0.09, hrs: [4, 18] },
  { cause: "C&I malfunction", equipment: ["DCS controller", "Flame scanner", "Transmitter loop"], weight: 0.08, hrs: [3, 14] },
  { cause: "Grid backdown", equipment: ["SLDC instruction"], weight: 0.06, hrs: [2, 10] },
];

export function genOutages(): Outage[] {
  const rng = stream("outages");
  const outages: Outage[] = [];
  let i = 1;
  const activeUnits = UNITS.filter((u) => u.id !== "RTPS-U1"); // U1 is in R&M

  /* STORY [B2]: five boiler-tube-leak trips on RTPS-U2 in six months. */
  for (let k = 0; k < 5; k++) {
    const month = MONTHS[k === 4 ? 4 : k];
    outages.push({
      id: `OT-${String(i++).padStart(3, "0")}`,
      unitId: "RTPS-U2",
      plant: "RTPS",
      start: `${month}-${String(randInt(rng, 2, 26)).padStart(2, "0")}`,
      hours: randInt(rng, 52, 110),
      kind: "FORCED",
      cause: "Boiler tube leak",
      equipment: pick(rng, ["Water wall", "Economiser", "Superheater"]),
      note: "Recurring failure band near burner elevation — same zone as prior leaks",
    });
  }

  // Forced outages, taxonomy-weighted (boiler tubes ≈ half of forced hours).
  while (outages.filter((o) => o.kind === "FORCED").length < 96) {
    const u = pick(rng, activeUnits);
    const roll = rng();
    let acc = 0;
    let sel = FORCED_CAUSES[0];
    for (const c of FORCED_CAUSES) {
      acc += c.weight;
      if (roll <= acc) { sel = c; break; }
    }
    const month = pick(rng, MONTHS);
    outages.push({
      id: `OT-${String(i++).padStart(3, "0")}`,
      unitId: u.id,
      plant: u.plant as ThermalPlant,
      start: `${month}-${String(randInt(rng, 1, daysInMonth(month))).padStart(2, "0")}`,
      hours: randInt(rng, sel.hrs[0], sel.hrs[1]),
      kind: "FORCED",
      cause: sel.cause,
      equipment: pick(rng, sel.equipment),
      note: "",
    });
  }

  // Planned outages to 140 total.
  while (outages.length < 140) {
    const u = pick(rng, activeUnits);
    const month = pick(rng, MONTHS);
    outages.push({
      id: `OT-${String(i++).padStart(3, "0")}`,
      unitId: u.id,
      plant: u.plant as ThermalPlant,
      start: `${month}-${String(randInt(rng, 1, daysInMonth(month))).padStart(2, "0")}`,
      hours: randInt(rng, 8, 240),
      kind: "PLANNED",
      cause: pick(rng, ["Annual overhaul", "Opportunity maintenance", "Statutory inspection", "Reserve shutdown"]),
      equipment: "—",
      note: "",
    });
  }
  return outages;
}

/* ── Emissions [B9] ──────────────────────────────────────────── */

export function genEmissions(units: GenUnit[]): EmissionMonth[] {
  const rng = stream("emissions");
  const rows: EmissionMonth[] = [];
  for (const u of units) {
    const so2Norm = u.commissioned >= 2017 ? 100 : u.capacityMW >= 500 ? 200 : 600;
    const noxNorm = u.commissioned >= 2017 ? 100 : 300;
    for (const month of MONTHS) {
      const fgdOn = u.fgd.status === "COMMISSIONED";
      rows.push({
        unitId: u.id,
        month,
        so2: Math.round(fgdOn ? randFloat(rng, 60, 95) : randFloat(rng, 880, 1350)),
        so2Norm,
        nox: Math.round(randFloat(rng, 220, 420)),
        noxNorm,
      });
    }
  }
  return rows;
}

/* ── Hydro (light) [B6] ──────────────────────────────────────── */

const RESERVOIR_SEEDS: [string, string, number][] = [
  ["Linganamakki", "Sharavathi", 1035], ["Supa", "Kali", 100], ["Mani", "Varahi", 460],
  ["Bhadra", "Bhadra", 39], ["Tunga Anicut", "Tunga", 12], ["Kadra", "Kali", 150],
  ["Kodasalli", "Kali", 120], ["Gerusoppa", "Sharavathi", 240], ["Talakalale", "Sharavathi", 0],
  ["Chakra", "Chakra", 0], ["Savehaklu", "Savehaklu", 0], ["Pickup Dam", "Varahi", 0],
  ["Mala", "Mala", 0], ["Alamatti", "Krishna", 290], ["Narayanpur", "Krishna", 0],
  ["Bhima Barrage", "Bhima", 0], ["Ghataprabha", "Ghataprabha", 32], ["Munirabad", "Tungabhadra", 28],
  ["Shivanasamudra", "Cauvery", 42], ["Shimsha", "Shimsha", 17], ["Bhadra Right Bank", "Bhadra", 6],
  ["Kalmala", "Krishna", 0.4], ["Sirwar", "Krishna", 1], ["Ganekal", "Ganekal", 0.35],
  ["Mallapur", "Tungabhadra", 9], ["Hampi", "Tungabhadra", 0],
];

export function genReservoirs(): Reservoir[] {
  const rng = stream("reservoirs");
  return RESERVOIR_SEEDS.map(([name, river, mw], i) => {
    const low = randInt(rng, 800, 4000);
    const high = low + randInt(rng, 2000, 9000);
    return {
      id: `RSV-${String(i + 1).padStart(2, "0")}`,
      name,
      river,
      stationMW: mw,
      capacityMcm: randInt(rng, 40, 4300),
      levelPct: Math.round(randFloat(rng, 28, 88) * 10) / 10,
      inflowCusecs: randInt(rng, low, high),
      inflow5yrLow: low,
      inflow5yrHigh: high,
      genMU6mo: Math.round(mw * randFloat(rng, 900, 2100) / 1000),
    };
  });
}

export function genSolar(): SolarMonth[] {
  const rng = stream("solar");
  return MONTHS.map((month) => {
    const forecast = randFloat(rng, 95, 135);
    return {
      month,
      forecastMU: Math.round(forecast * 10) / 10,
      actualMU: Math.round(forecast * randFloat(rng, 0.88, 1.06) * 10) / 10,
    };
  });
}

/* ── Safety [B8] ─────────────────────────────────────────────── */

export function genIncidents(): Incident[] {
  const rng = stream("incidents");
  const incidents: Incident[] = [];
  let i = 1;
  const areas = ["Boiler area", "Turbine hall", "CHP", "AHP", "Switchyard", "Mill bay", "Workshop", "Cooling tower"];
  const desc: Record<Incident["kind"], string[]> = {
    NEAR_MISS: [
      "Idler pulley guard found removed during belt run",
      "Coal dust accumulation near conveyor transfer point",
      "Unbarricaded floor opening on operating floor",
      "Sling failure during lift — load grounded safely",
      "Hot ash line flange leak noticed on rounds",
    ],
    FIRST_AID: ["Minor abrasion during valve overhaul", "Steam trace burn — first aid", "Foreign body in eye during grinding"],
    LTI: ["Fall from scaffold — fracture (14-day LTI)", "Finger crush during coupling alignment"],
    PROPERTY: ["Cable gallery flash — localized damage", "Conveyor belt fire — extinguished, belt section lost"],
  };

  /* STORY [B8]: near-miss cluster at RTPS CHP in the two recent months. */
  for (let k = 0; k < 9; k++) {
    const month = pick(rng, [MONTHS[3], MONTHS[4]]);
    incidents.push({
      id: `INC-${String(i++).padStart(3, "0")}`,
      plant: "RTPS",
      area: "CHP",
      date: `${month}-${String(randInt(rng, 1, 28)).padStart(2, "0")}`,
      kind: "NEAR_MISS",
      severity: 2,
      description: pick(rng, desc.NEAR_MISS),
      status: chance(rng, 0.55) ? "OPEN" : "CLOSED",
      actionsOpen: randInt(rng, 0, 3),
    });
  }

  const plants: ThermalPlant[] = ["RTPS", "BTPS", "YTPS"];
  while (incidents.length < 60) {
    const kind: Incident["kind"] = chance(rng, 0.55) ? "NEAR_MISS" : chance(rng, 0.6) ? "FIRST_AID" : chance(rng, 0.5) ? "LTI" : "PROPERTY";
    const month = pick(rng, MONTHS);
    incidents.push({
      id: `INC-${String(i++).padStart(3, "0")}`,
      plant: pick(rng, plants),
      area: pick(rng, areas),
      date: `${month}-${String(randInt(rng, 1, 28)).padStart(2, "0")}`,
      kind,
      severity: (kind === "LTI" ? 3 : randInt(rng, 1, 2)) as Incident["severity"],
      description: pick(rng, desc[kind]),
      status: chance(rng, 0.4) ? "OPEN" : "CLOSED",
      actionsOpen: randInt(rng, 0, 2),
    });
  }
  return incidents;
}
