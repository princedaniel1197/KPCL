// Canonical data model for the Sentinel synthetic world.
// Generated once by `npm run generate-data` into /data/*.json; read server-side.

import type { PlantCode } from "./nav";

export type ThermalPlant = "RTPS" | "BTPS" | "YTPS";

export interface Meta {
  generatedAt: string;
  months: string[]; // six YYYY-MM strings, oldest first
  seed: number;
  appName: string;
}

/* ── Coal & Fuel ──────────────────────────────────────────────── */

export interface Colliery {
  id: string; // "W-3"
  name: string; // "WCL — Colliery W-3"
  company: string; // fictionalized subsidiary
  state: string;
  typicalGrade: string; // G6..G14
  distanceKm: number;
  freightPerTonne: number;
  siding: string;
}

export interface Rake {
  id: string;
  date: string; // ISO
  month: string; // YYYY-MM
  source: string; // colliery id
  plant: ThermalPlant;
  wagons: number;
  wagonCapT: number; // per-wagon rated capacity
  billedTonnes: number;
  receivedTonnes: number;
  billedGCV: number;
  receivedGCV: number;
  firedGCV: number;
  billedGrade: string;
  freightPerTonne: number;
  placementHours: number; // placement-to-release at the tippler
  thirdPartySampled: boolean;
  moisturePct: number;
}

export interface Fsa {
  id: string;
  source: string; // colliery id
  plant: ThermalPlant;
  acqTonnes: number; // annual contracted quantity
  monthlyLifted: { month: string; tonnes: number }[];
  penaltySlabs: { belowPct: number; penaltyPctOfValue: number }[];
  avgPricePerTonne: number;
}

export interface Stockpile {
  id: string;
  plant: ThermalPlant;
  yard: string;
  bookTonnes: number;
  physicalTonnes: number;
  ageDays: number;
  gcv: number;
  formedOn: string;
}

export type ClaimStatus = "DRAFT" | "ISSUED" | "ACKNOWLEDGED" | "RECOVERED";

export interface CoalClaim {
  id: string;
  kind: "GRADE_SLIPPAGE" | "TRANSIT_SHORTAGE" | "FSA_SHORT_SUPPLY";
  source: string; // colliery id
  plant: ThermalPlant;
  month: string;
  rakeId: string | null;
  amount: number; // ₹
  basis: string;
  status: ClaimStatus;
  draftedOn: string;
}

/* ── Capital Projects ─────────────────────────────────────────── */

export type GateKey = "ToR" | "EC" | "FC1" | "FC2" | "NBWL" | "CONSTRUCTION";
export type GateStatus = "CLEARED" | "PENDING" | "BLOCKED";

export interface Gate {
  key: GateKey;
  label: string;
  status: GateStatus;
  date: string | null;
  note: string;
}

export interface Milestone {
  id: string;
  name: string;
  weightPct: number; // physical weight, sums to 100 per project
  plannedDate: string;
  completedDate: string | null;
  certified: boolean;
}

export interface RaBill {
  id: string;
  month: string;
  amountCr: number;
}

export interface RmChain {
  rlaDone: string | null;
  overhaulDone: string | null;
  pgTestDone: string | null;
  resyncPlanned: string;
  resyncActual: string | null;
  unitId: string;
}

export interface Project {
  id: string;
  name: string;
  type: "PSP" | "RM" | "FGD" | "CIVIL" | "SOLAR";
  plant: PlantCode;
  contractorId: string;
  contractValueCr: number;
  start: string;
  scheduledEnd: string; // the declared / reported timeline
  gates: Gate[] | null; // null when no statutory gates apply
  milestones: Milestone[];
  raBills: RaBill[];
  drawingsTotal: number;
  drawingsPending: number;
  drawingsAging: { bucket: string; count: number }[];
  courtStatus: { forum: string; caseId: string; status: "STAY" | "PENDING" | "NONE"; note: string } | null;
  mobilisationAdvance: { amountCr: number; disbursedOn: string; siteActive: boolean } | null;
  reportedActivity: string[]; // recent progress-report lines (for A7 contradiction)
  retenderCount: number;
  ldRatePctPerWeek: number;
  ldCapPct: number;
  rm: RmChain | null;
  description: string;
}

/* ── Contracts & Procurement ─────────────────────────────────── */

export interface ContractMilestone {
  id: string;
  name: string;
  due: string;
  completedOn: string | null;
  valueCr: number;
}

export interface Contract {
  id: string;
  title: string;
  vendorId: string;
  plant: PlantCode;
  category: string;
  valueCr: number;
  awardDate: string;
  endDate: string;
  ldRatePctPerWeek: number;
  ldCapPct: number;
  milestones: ContractMilestone[];
  tenderMode: "OPEN" | "LIMITED" | "SINGLE";
  cycleDays: { indentToNit: number; nitToAward: number };
  projectId: string | null;
  correspondence: { date: string; from: string; subject: string }[];
}

export interface BankGuarantee {
  id: string;
  contractId: string;
  vendorId: string;
  bank: string;
  type: "PBG" | "ABG" | "RETENTION";
  valueCr: number;
  issued: string;
  expiry: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  city: string;
  onTimePct: number; // milestone punctuality 0-100
  rejectionRatePct: number;
  ldIncidents: number;
  contractsCount: number;
  disputeCount: number;
  registeredSince: number;
}

export interface Spare {
  sku: string;
  description: string;
  plant: ThermalPlant;
  ved: "V" | "E" | "D";
  unitCost: number;
  onHand: number;
  leadTimeMonths: number;
  monthlyIssues: number[]; // aligned to meta.months
  monthsSinceLastIssue: number;
}

/* ── Plant Operations ─────────────────────────────────────────── */

export interface UnitMonth {
  month: string;
  plfPct: number;
  availabilityPct: number;
  heatRate: number; // kcal/kWh actual
  normHeatRate: number;
  auxPct: number;
  normAuxPct: number;
  genMU: number; // million units
  // ₹ per 1,000 kcal delivered (folds GCV into the rate). Consumed as such by
  // plant.ts heatRateFinding: monthFuelCost = gen × heatRate × rate / 1000.
  landedFuelCostPerKg: number;
}

export interface GenUnit {
  id: string; // "RTPS-U2"
  plant: ThermalPlant;
  capacityMW: number;
  commissioned: number;
  monthly: UnitMonth[];
  fgd: { required: boolean; status: "COMMISSIONED" | "UNDER_ERECTION" | "AWARDED" | "NOT_AWARDED"; normDeadline: string };
  sensorHealth: number; // 0-100 synthetic composite
  tubeLeakCount12mo: number;
}

export interface Outage {
  id: string;
  unitId: string;
  plant: ThermalPlant;
  start: string;
  hours: number;
  kind: "FORCED" | "PLANNED";
  cause: string; // taxonomy bucket
  equipment: string;
  note: string;
}

export interface EmissionMonth {
  unitId: string;
  month: string;
  so2: number; // mg/Nm3
  so2Norm: number;
  nox: number;
  noxNorm: number;
}

export interface Reservoir {
  id: string;
  name: string;
  river: string;
  stationMW: number;
  capacityMcm: number;
  levelPct: number;
  inflowCusecs: number;
  inflow5yrLow: number;
  inflow5yrHigh: number;
  genMU6mo: number;
}

export interface SolarMonth {
  month: string;
  forecastMU: number;
  actualMU: number;
}

export interface Incident {
  id: string;
  plant: ThermalPlant;
  area: string;
  date: string;
  kind: "NEAR_MISS" | "FIRST_AID" | "LTI" | "PROPERTY";
  severity: 1 | 2 | 3;
  description: string;
  status: "OPEN" | "CLOSED";
  actionsOpen: number;
}

/* ── Workforce ────────────────────────────────────────────────── */

export interface Employee {
  id: string;
  name: string;
  dob: string;
  doj: string;
  cadre: string;
  designation: string;
  station: PlantCode | "CORP";
  role: string;
  soleIncumbent: boolean;
  successorIdentified: boolean;
  interviewStatus: "NOT_QUEUED" | "QUEUED" | "SCHEDULED" | "CAPTURED";
}

export interface LabourContractorMonth {
  month: string;
  manshiftsBilled: number;
  manshiftsAttendance: number;
  wagePaidPerDay: number;
  minWagePerDay: number;
  basicPerDay: number;
  epfPaidPctOfBasic: number;
}

export interface LabourContractor {
  id: string;
  name: string;
  plant: ThermalPlant;
  workers: number;
  licenceExpiry: string;
  months: LabourContractorMonth[];
}

export interface RecruitmentDrive {
  id: string;
  cadre: string;
  posts: number;
  startedYear: number;
  stage: string;
  note: string;
}

export interface SanctionRow {
  station: PlantCode | "CORP";
  cadre: string;
  sanctioned: number;
  actual: number;
}

export interface SkillArea {
  key: string;
  label: string;
  need: number; // required certified headcount
  have: number;
  trainingPlanned: number;
}

/* ── Legal ────────────────────────────────────────────────────── */

export interface LegalMatter {
  id: string;
  title: string;
  forum: string;
  matterType: string;
  stage: string;
  filed: string;
  exposureCr: number;
  counsel: string;
  firm: string;
  feePaidLakh: number;
  hearings: { date: string; note: string }[];
  nextHearing: string | null;
  linkedProjectId: string | null;
  linkedContractId: string | null;
  claimKind: "LD_RECOVERY" | "COAL_QUALITY" | "OTHER" | null;
  status: "OPEN" | "CLOSED";
  source: "eCourts" | "Manual";
}

/* ── Regulatory & Audit ──────────────────────────────────────── */

export interface TariffYear {
  fy: string; // "FY24"
  station: ThermalPlant;
  status: "TRUED_UP" | "FILED" | "DRAFT";
  // ₹ cr unless noted
  approved: TariffBlock;
  actual: TariffBlock;
}

export interface TariffBlock {
  roe: number;
  interest: number;
  depreciation: number;
  om: number;
  fuelCost: number;
  genMU: number;
  heatRate: number;
  auxPct: number;
  capexAdditions: number;
  capexCertified: boolean; // commissioning certificate available
}

export interface AuditPara {
  id: string; // "14/2025"
  irId: string;
  year: number;
  station: PlantCode | "CORP";
  title: string;
  category: string;
  valueCr: number;
  owner: string;
  receivedDate: string; // starts the 4-month COPU clock
  status: "OPEN" | "ATN_DRAFT" | "REPLIED" | "SETTLED";
}

export interface InspectionReport {
  id: string;
  year: number;
  station: PlantCode | "CORP";
  title: string;
  receivedDate: string;
}

export interface CloseTask {
  entity: string; // KPCL / JV
  task: string;
  status: "DONE" | "IN_PROGRESS" | "BLOCKED";
  owner: string;
  note: string;
}

/* ── Cross-cutting ────────────────────────────────────────────── */

export interface DataFeed {
  id: string;
  name: string;
  kind: string;
  lastSync: string;
  records: number;
  health: "OK" | "DEGRADED" | "STALE";
  note: string;
}

export interface SearchEntity {
  id: string;
  name: string;
  kind: string;
  href: string;
}

export interface World {
  meta: Meta;
  collieries: Colliery[];
  rakes: Rake[];
  fsas: Fsa[];
  stockpiles: Stockpile[];
  projects: Project[];
  contracts: Contract[];
  bgs: BankGuarantee[];
  vendors: Vendor[];
  spares: Spare[];
  units: GenUnit[];
  outages: Outage[];
  emissions: EmissionMonth[];
  reservoirs: Reservoir[];
  solar: SolarMonth[];
  incidents: Incident[];
  employees: Employee[];
  labourContractors: LabourContractor[];
  drives: RecruitmentDrive[];
  sanctions: SanctionRow[];
  skillAreas: SkillArea[];
  legalMatters: LegalMatter[];
  tariffYears: TariffYear[];
  auditParas: AuditPara[];
  inspectionReports: InspectionReport[];
  closeTasks: CloseTask[];
  dataFeeds: DataFeed[];
}
