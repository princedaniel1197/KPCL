// Workforce world: 4,600 employees, 38 labour contractors, drives, sanctions,
// skills. STORY injections (§4, set 5) flagged inline.

import { chance, pick, randFloat, randInt, stream } from "@/lib/rng";
import type { Employee, LabourContractor, RecruitmentDrive, SanctionRow, SkillArea, ThermalPlant } from "@/lib/types";
import { AS_OF, CADRES, FIRST_NAMES, LAST_NAMES, MONTHS, STATIONS } from "./context";

const ROLES: Record<string, string[]> = {
  Technical: ["Boiler operator", "Turbine operator", "Mill technician", "CHP operator", "AHP technician", "Welder (IBR)", "Fitter", "Rigger", "Electrician", "Instrument mechanic"],
  Engineering: ["Boiler desk engineer", "Turbine desk engineer", "C&I engineer", "Electrical maintenance engineer", "Efficiency engineer", "Shift charge engineer", "Civil maintenance engineer"],
  Operations: ["Control room operator", "Field operator", "Water treatment operator", "Shift supervisor"],
  Finance: ["Accounts officer", "Bills section officer", "Costing analyst", "Internal audit officer"],
  Admin: ["Administrative officer", "Establishment section", "Stores clerk", "Security supervisor"],
  Environment: ["Environment engineer", "Chemist", "Ash utilisation officer"],
  Stores: ["Stores officer", "Purchase assistant", "Inventory controller"],
};

// STORY [F1]: 14 single-point-of-failure roles — sole incumbent, retiring
// ≤24 months, no successor identified.
const SPOF_ROLES = [
  "Turbine vibration specialist", "IBR welding examiner", "Relay protection master tech",
  "DCS legacy-logic specialist (Max-DNA)", "Boiler pressure-parts metallurgist", "CHP PLC specialist",
  "Excitation systems specialist", "Hydro governor specialist", "Switchyard SF6 specialist",
  "Coal sampling referee analyst", "Turbine oil chemistry specialist", "ESP rapping-systems specialist",
  "Ash-dyke instrumentation specialist", "Station battery & DC systems specialist",
];

function dobForAge(rng: () => number, ageYears: number): string {
  const asOf = new Date(AS_OF + "T00:00:00Z");
  const y = asOf.getUTCFullYear() - ageYears;
  return `${y}-${String(randInt(rng, 1, 12)).padStart(2, "0")}-${String(randInt(rng, 1, 28)).padStart(2, "0")}`;
}

export function genEmployees(): Employee[] {
  const rng = stream("employees");
  const employees: Employee[] = [];
  let i = 1;

  for (const st of STATIONS) {
    for (let k = 0; k < st.headcount; k++) {
      const cadre = pick(rng, CADRES);
      // Aging pyramid: the 1980s intake cohort dominates the top.
      // STORY [F1]: RTPS Technical cadre — 27% retiring within 5 years.
      let age: number;
      const isRtpsTech = st.code === "RTPS" && cadre === "Technical";
      const oldShare = isRtpsTech ? 0.27 : 0.16;
      if (chance(rng, oldShare)) age = randInt(rng, 55, 59);
      else if (chance(rng, 0.3)) age = randInt(rng, 46, 54);
      else age = randInt(rng, 27, 45);

      const name = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
      const dob = dobForAge(rng, age);
      const doj = dobForAge(rng, age - randInt(rng, 22, 30));
      employees.push({
        id: `E-${String(i).padStart(4, "0")}`,
        name,
        dob,
        doj,
        cadre,
        designation: age >= 52 ? "Senior " + cadre + " Officer" : cadre + " Officer",
        station: st.code,
        role: pick(rng, ROLES[cadre]),
        soleIncumbent: false,
        successorIdentified: chance(rng, 0.35),
        interviewStatus: "NOT_QUEUED",
      });
      i++;
    }
  }

  // Inject the 14 SPOF roles across thermal stations.
  const spofStations: (typeof STATIONS)[number]["code"][] = ["RTPS", "RTPS", "RTPS", "RTPS", "RTPS", "BTPS", "BTPS", "BTPS", "YTPS", "YTPS", "HYDRO", "HYDRO", "RTPS", "BTPS"];
  SPOF_ROLES.forEach((role, k) => {
    // Age 58.5–59.6 → retirement within 5–18 months.
    const pool = employees.filter((e) => e.station === spofStations[k] && !e.soleIncumbent);
    const emp = pool[(k * 37) % pool.length];
    const ageMonths = randInt(stream(`spof-${k}`), 703, 715); // months old
    const asOf = new Date(AS_OF + "T00:00:00Z");
    asOf.setUTCMonth(asOf.getUTCMonth() - ageMonths);
    Object.assign(emp, {
      role,
      designation: "Senior Specialist",
      cadre: "Technical",
      dob: asOf.toISOString().slice(0, 10),
      soleIncumbent: true,
      successorIdentified: false,
      interviewStatus: k < 3 ? "SCHEDULED" : k < 6 ? "QUEUED" : "NOT_QUEUED",
    });
  });

  // Knowledge-capture queue for everyone else retiring soon.
  for (const e of employees) {
    if (e.soleIncumbent) continue;
    const age = (Date.parse(AS_OF) - Date.parse(e.dob)) / (86400000 * 365.25);
    if (age >= 57.5) {
      e.interviewStatus = chance(stream("iv" + e.id), 0.3)
        ? "CAPTURED"
        : chance(stream("iv2" + e.id), 0.4)
          ? "QUEUED"
          : "NOT_QUEUED";
    }
  }
  return employees;
}

/* ── Contract labour [F2] ────────────────────────────────────── */

const LC_NAMES = [
  "SLV Enterprises", "Annapurna Manpower Services", "Sri Banashankari Agencies", "Veerabhadreshwara Labour Co-op",
  "Gangamma Enterprises", "Sharanabasava Services", "Kotturswamy Manpower", "Huligemma Agencies",
  "Mailaralingeshwara Services", "Yellamma Enterprises", "Beereshwara Manpower", "Siddalingeshwara Agencies",
];

export function genLabourContractors(): LabourContractor[] {
  const rng = stream("labour");
  const out: LabourContractor[] = [];
  const plants: ThermalPlant[] = ["RTPS", "BTPS", "YTPS"];
  for (let i = 0; i < 38; i++) {
    const name = i < LC_NAMES.length ? LC_NAMES[i] : `${pick(rng, LC_NAMES).split(" ")[0]} ${pick(rng, ["Services", "Agencies", "Manpower"])} ${i}`;
    const plant = plants[i % 3];
    const workers = randInt(rng, 40, 380);
    const minWage = 421; // notified daily minimum for the zone (synthetic)
    const isSLV = name === "SLV Enterprises"; // STORY [F2]
    const months = MONTHS.map((month) => {
      const attendance = workers * randInt(rng, 22, 26);
      const billed = isSLV
        ? Math.round(attendance * randFloat(rng, 1.05, 1.08)) // billed > attendance
        : Math.round(attendance * randFloat(rng, 0.99, 1.02));
      const wagePaid = isSLV ? randInt(rng, 372, 392) : randInt(rng, 421, 468);
      const basic = Math.round(wagePaid * 0.62);
      return {
        month,
        manshiftsBilled: billed,
        manshiftsAttendance: attendance,
        wagePaidPerDay: wagePaid,
        minWagePerDay: minWage,
        basicPerDay: basic,
        epfPaidPctOfBasic: isSLV ? Math.round(randFloat(rng, 8.8, 9.6) * 10) / 10 : 12,
      };
    });
    const exp = new Date(AS_OF + "T00:00:00Z");
    exp.setUTCDate(exp.getUTCDate() + randInt(rng, isSLV ? 20 : 40, 500));
    out.push({
      id: `LC-${String(i + 1).padStart(2, "0")}`,
      name,
      plant,
      workers,
      licenceExpiry: exp.toISOString().slice(0, 10),
      months,
    });
  }
  return out;
}

/* ── Recruitment pipeline [F3] ───────────────────────────────── */

export function genDrives(): RecruitmentDrive[] {
  const y = Number(AS_OF.slice(0, 4));
  return [
    {
      id: "DR-01",
      cadre: "Junior Engineer / Technician",
      posts: 622,
      startedYear: y - 7, // STORY: the seven-year drive
      stage: "Provisional select list challenged — matter before KSAT",
      note: "Notified, examined, provisional list published, challenged; re-verification ordered twice.",
    },
    { id: "DR-02", cadre: "Assistant Engineer (Electrical)", posts: 118, startedYear: y - 2, stage: "Document verification", note: "KEA CET-based; verification in batches." },
    { id: "DR-03", cadre: "Chemist", posts: 24, startedYear: y - 1, stage: "Written examination scheduled", note: "" },
    { id: "DR-04", cadre: "Security Guard", posts: 90, startedYear: y - 3, stage: "Medical examination", note: "Physical tests complete." },
  ];
}

export function genSanctions(): SanctionRow[] {
  const rng = stream("sanctions");
  const rows: SanctionRow[] = [];
  for (const st of STATIONS) {
    for (const cadre of CADRES) {
      const sanctioned = randInt(rng, 40, st.code === "RTPS" ? 420 : 260);
      rows.push({
        station: st.code,
        cadre,
        sanctioned,
        actual: Math.round(sanctioned * randFloat(rng, 0.58, 0.88)),
      });
    }
  }
  return rows;
}

/* ── Skills matrix [F4] ──────────────────────────────────────── */

export function genSkillAreas(): SkillArea[] {
  return [
    { key: "supercritical", label: "Supercritical unit operation (YTPS class)", need: 160, have: 96, trainingPlanned: 24 },
    { key: "psp", label: "Pumped-storage O&M readiness", need: 80, have: 11, trainingPlanned: 8 },
    { key: "solar", label: "Utility-scale solar O&M", need: 60, have: 34, trainingPlanned: 12 },
    { key: "fgd", label: "FGD operation & limestone chemistry", need: 120, have: 41, trainingPlanned: 30 },
    { key: "dcs", label: "Modern DCS / cyber-secure C&I", need: 140, have: 78, trainingPlanned: 26 },
    { key: "hydroGov", label: "Digital hydro governors", need: 45, have: 29, trainingPlanned: 6 },
    { key: "ibr", label: "IBR-certified pressure-parts welding", need: 90, have: 52, trainingPlanned: 10 },
  ];
}
