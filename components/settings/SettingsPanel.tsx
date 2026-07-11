"use client";

// Norms workbench — edits a client-side copy of every engine norm
// (persisted to localStorage) and recomputes worked examples live through
// the pure engines, so the effect of each norm is visible immediately.

import { useEffect, useState } from "react";
import { Chip, SectionHead } from "@/components/ui/Kpi";
import {
  COAL_NORMS, GRADE_BANDS, OBLIGATION_NORMS, PLANT_NORMS, VENDOR_WEIGHTS,
  gradeForGcv,
  type CoalNorms, type ObligationNorms, type PlantNorms, type VendorWeights,
} from "@/lib/engines/norms";
import { analyzeRake } from "@/lib/engines/coal";
import { bgAlert, ldForMilestone, paraClock } from "@/lib/engines/obligations";
import { dateFmt, inr, inrCr, num, pct } from "@/lib/format";
import type { BankGuarantee, ContractMilestone, Rake } from "@/lib/types";

const STORAGE_KEY = "sentinel-norms";
// Fixed reference date for the worked examples (matches the world's as-of).
const SAMPLE_AS_OF = "2026-07-10";

interface NormsState {
  coal: CoalNorms;
  obligation: ObligationNorms;
  plant: PlantNorms;
  vendor: VendorWeights;
  gradePrices: Record<string, number>; // grade → pithead ₹/t
}

function defaultState(): NormsState {
  return {
    coal: { ...COAL_NORMS },
    obligation: { ...OBLIGATION_NORMS, bgAlertDays: [...OBLIGATION_NORMS.bgAlertDays] },
    plant: { ...PLANT_NORMS },
    vendor: { ...VENDOR_WEIGHTS },
    gradePrices: Object.fromEntries(GRADE_BANDS.map((b) => [b.grade, b.pitheadPrice])),
  };
}

/* ── Worked-example fixtures (inline, synthetic) ─────────────── */

const SAMPLE_RAKE: Rake = {
  id: "RK-SAMPLE", date: "2026-06-18", month: "2026-06", source: "W-3", plant: "RTPS",
  wagons: 59, wagonCapT: 64, billedTonnes: 3720, receivedTonnes: 3620,
  billedGCV: 4650, receivedGCV: 4480, firedGCV: 4340, billedGrade: "G9",
  freightPerTonne: 1180, placementHours: 11, thirdPartySampled: false, moisturePct: 12.4,
};

const SAMPLE_CONTRACT = { id: "CT-SAMPLE", valueCr: 48, ldRatePctPerWeek: 0.5, ldCapPct: 10 };
const SAMPLE_MILESTONE: ContractMilestone = {
  id: "MS-01", name: "Boiler pressure-parts erection", due: "2026-03-31", completedOn: null, valueCr: 12,
};
const SAMPLE_BG: BankGuarantee = {
  id: "BG-SAMPLE", contractId: "CT-SAMPLE", vendorId: "V-SAMPLE", bank: "Canara Bank (mock)",
  type: "PBG", valueCr: 4.8, issued: "2025-08-01", expiry: "2026-08-05",
};
const SAMPLE_DIVERGENCE = { financialPct: 78, physicalPct: 64 };

/* ── Small building blocks ───────────────────────────────────── */

function NumField({
  label, unit, value, step, onChange,
}: {
  label: string;
  unit?: string;
  value: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  // Hold a string draft so the user can clear the field to retype without it
  // snapping to 0. Only commit when the draft parses to a finite number.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);
  return (
    <label className="block">
      <span className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="number"
          step={step ?? "any"}
          value={shown}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = e.target.valueAsNumber;
            if (Number.isFinite(n)) onChange(n);
          }}
          onBlur={() => setDraft(null)} // snap back to the committed value on blur
          className="w-full border border-rule bg-panel rounded-sm px-2 py-1 text-sm"
        />
        {unit && <span className="text-[0.68rem] text-muted whitespace-nowrap">{unit}</span>}
      </div>
    </label>
  );
}

function PriceInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      type="number"
      step={10}
      value={draft ?? String(value)}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = e.target.valueAsNumber;
        if (Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => setDraft(null)}
      className="w-28 border border-rule bg-panel rounded-sm px-2 py-0.5 text-sm text-right"
    />
  );
}

function GroupPanel({
  title, onReset, children,
}: {
  title: string;
  onReset: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif text-lg font-semibold">{title}</h3>
        <button className="btn-outline text-[0.72rem]" onClick={onReset}>Reset to norms</button>
      </div>
      {children}
    </div>
  );
}

/* ── Panel ───────────────────────────────────────────────────── */

export function SettingsPanel() {
  const [state, setState] = useState<NormsState>(defaultState);

  // Hydrate from localStorage once, merging over defaults for forward compatibility.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as Partial<NormsState>;
      setState((prev) => ({
        coal: { ...prev.coal, ...(p.coal ?? {}) },
        obligation: {
          ...prev.obligation,
          ...(p.obligation ?? {}),
          bgAlertDays:
            Array.isArray(p.obligation?.bgAlertDays) && p.obligation.bgAlertDays.length === 3
              ? [...p.obligation.bgAlertDays]
              : prev.obligation.bgAlertDays,
        },
        plant: { ...prev.plant, ...(p.plant ?? {}) },
        vendor: { ...prev.vendor, ...(p.vendor ?? {}) },
        gradePrices: { ...prev.gradePrices, ...(p.gradePrices ?? {}) },
      }));
    } catch {
      // Corrupted store — keep engine defaults.
    }
  }, []);

  const update = (next: NormsState) => {
    setState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable (private mode / quota) — edits still work in-memory.
    }
  };

  const setCoal = (k: keyof CoalNorms, v: number) => update({ ...state, coal: { ...state.coal, [k]: v } });
  const setPlant = (k: keyof PlantNorms, v: number) => update({ ...state, plant: { ...state.plant, [k]: v } });
  const setVendor = (k: keyof VendorWeights, v: number) => update({ ...state, vendor: { ...state.vendor, [k]: v } });
  const setObligation = (k: "copuReplyMonths" | "divergenceFlagPp", v: number) =>
    update({ ...state, obligation: { ...state.obligation, [k]: v } });
  const setBgDay = (i: number, v: number) =>
    update({
      ...state,
      obligation: {
        ...state.obligation,
        bgAlertDays: state.obligation.bgAlertDays.map((d, idx) => (idx === i ? v : d)),
      },
    });
  const setGradePrice = (grade: string, v: number) =>
    update({ ...state, gradePrices: { ...state.gradePrices, [grade]: v } });

  /* ── Live recompute through the pure engines ── */
  const rakeFindings = analyzeRake(SAMPLE_RAKE, state.coal);
  const receivedGrade = gradeForGcv(SAMPLE_RAKE.receivedGCV).grade;
  const billedPrice = state.gradePrices[SAMPLE_RAKE.billedGrade] ?? 0;
  const receivedPrice = state.gradePrices[receivedGrade] ?? 0;
  const overbillingEdited =
    receivedPrice < billedPrice ? (billedPrice - receivedPrice) * SAMPLE_RAKE.receivedTonnes : 0;

  const ld = ldForMilestone(SAMPLE_CONTRACT, SAMPLE_MILESTONE, SAMPLE_AS_OF);
  const clock = paraClock({ id: "SAMPLE", receivedDate: "2026-02-20", status: "OPEN" }, SAMPLE_AS_OF, state.obligation);
  const bg = bgAlert(SAMPLE_BG, SAMPLE_AS_OF, state.obligation);
  const divergencePp = SAMPLE_DIVERGENCE.financialPct - SAMPLE_DIVERGENCE.physicalPct;
  const divergenceFlagged = divergencePp > state.obligation.divergenceFlagPp;
  const weightSum = state.vendor.onTime + state.vendor.rejection + state.vendor.ld + state.vendor.dispute;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <GroupPanel title="Coal reconciliation norms" onReset={() => update({ ...state, coal: { ...COAL_NORMS } })}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <NumField label="Transit quantity loss" unit="%" step={0.1} value={state.coal.transitQuantityLossPct} onChange={(v) => setCoal("transitQuantityLossPct", v)} />
            <NumField label="Transit CV loss" unit="kcal/kg" step={5} value={state.coal.transitCvLossKcal} onChange={(v) => setCoal("transitCvLossKcal", v)} />
            <NumField label="Storage loss" unit="% / 10 days" step={0.01} value={state.coal.storageLossPctPer10Days} onChange={(v) => setCoal("storageLossPctPer10Days", v)} />
            <NumField label="Storage CV tolerance" unit="kcal/kg" step={5} value={state.coal.storageCvToleranceKcal} onChange={(v) => setCoal("storageCvToleranceKcal", v)} />
            <NumField label="Extra coal per 100 kcal" unit="%" step={0.5} value={state.coal.extraCoalPctPer100Kcal} onChange={(v) => setCoal("extraCoalPctPer100Kcal", v)} />
            <NumField label="Free time at tippler" unit="h" step={0.5} value={state.coal.freeTimeHours} onChange={(v) => setCoal("freeTimeHours", v)} />
            <NumField label="Demurrage rate" unit="₹ / wagon-h" step={10} value={state.coal.demurragePerWagonHour} onChange={(v) => setCoal("demurragePerWagonHour", v)} />
            <NumField label="Combustion-risk age" unit="days" step={1} value={state.coal.combustionRiskAgeDays} onChange={(v) => setCoal("combustionRiskAgeDays", v)} />
            <NumField label="Combustion-risk stock" unit="t" step={1000} value={state.coal.combustionRiskTonnes} onChange={(v) => setCoal("combustionRiskTonnes", v)} />
          </div>
        </GroupPanel>

        <GroupPanel
          title="Obligation clocks"
          onReset={() => update({ ...state, obligation: { ...OBLIGATION_NORMS, bgAlertDays: [...OBLIGATION_NORMS.bgAlertDays] } })}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <NumField label="BG alert — first" unit="days" step={1} value={state.obligation.bgAlertDays[0]} onChange={(v) => setBgDay(0, v)} />
            <NumField label="BG alert — second" unit="days" step={1} value={state.obligation.bgAlertDays[1]} onChange={(v) => setBgDay(1, v)} />
            <NumField label="BG alert — final" unit="days" step={1} value={state.obligation.bgAlertDays[2]} onChange={(v) => setBgDay(2, v)} />
            <NumField label="COPU reply clock" unit="months" step={1} value={state.obligation.copuReplyMonths} onChange={(v) => setObligation("copuReplyMonths", v)} />
            <NumField label="Divergence flag" unit="pp" step={1} value={state.obligation.divergenceFlagPp} onChange={(v) => setObligation("divergenceFlagPp", v)} />
          </div>
        </GroupPanel>

        <GroupPanel title="Plant & workforce norms" onReset={() => update({ ...state, plant: { ...PLANT_NORMS } })}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <NumField label="O&M escalation" unit="% / yr" step={0.01} value={state.plant.omEscalationPct} onChange={(v) => setPlant("omEscalationPct", v)} />
            <NumField label="SPOF window" unit="months" step={1} value={state.plant.spofRetireMonths} onChange={(v) => setPlant("spofRetireMonths", v)} />
            <NumField label="Dead stock after" unit="months" step={1} value={state.plant.deadStockMonths} onChange={(v) => setPlant("deadStockMonths", v)} />
            <NumField label="Retirement age" unit="yrs" step={1} value={state.plant.retirementAge} onChange={(v) => setPlant("retirementAge", v)} />
          </div>
        </GroupPanel>

        <GroupPanel title="Vendor score weights" onReset={() => update({ ...state, vendor: { ...VENDOR_WEIGHTS } })}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <NumField label="On-time delivery" step={0.05} value={state.vendor.onTime} onChange={(v) => setVendor("onTime", v)} />
            <NumField label="Rejection rate" step={0.05} value={state.vendor.rejection} onChange={(v) => setVendor("rejection", v)} />
            <NumField label="LD incidents" step={0.05} value={state.vendor.ld} onChange={(v) => setVendor("ld", v)} />
            <NumField label="Disputes" step={0.05} value={state.vendor.dispute} onChange={(v) => setVendor("dispute", v)} />
          </div>
          <div className="mt-2 text-[0.72rem] text-muted flex items-center gap-2">
            Weight total {num(weightSum, 2)}
            {Math.abs(weightSum - 1) > 0.001 ? <Chip tone="warning">should sum to 1.00</Chip> : <Chip tone="success">balanced</Chip>}
          </div>
        </GroupPanel>
      </div>

      <SectionHead title="Grade price table" right="pithead ₹/tonne — drives grade-differential debit notes" />
      <div className="panel p-4">
        <div className="flex items-center justify-end mb-2">
          <button
            className="btn-outline text-[0.72rem]"
            onClick={() =>
              update({ ...state, gradePrices: Object.fromEntries(GRADE_BANDS.map((b) => [b.grade, b.pitheadPrice])) })
            }
          >
            Reset to norms
          </button>
        </div>
        <table className="ledger">
          <thead>
            <tr><th>Grade</th><th className="num">GCV band (kcal/kg)</th><th className="num">Pithead price (₹/t)</th></tr>
          </thead>
          <tbody>
            {GRADE_BANDS.map((b) => (
              <tr key={b.grade}>
                <td className="font-medium">{b.grade}</td>
                <td className="num">{num(b.minGcv)} – {num(b.maxGcv)}</td>
                <td className="num">
                  <PriceInput
                    value={state.gradePrices[b.grade] ?? b.pitheadPrice}
                    onChange={(v) => setGradePrice(b.grade, v)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Live recompute demo ── */}
      <SectionHead title="Live recompute — worked examples" right="pure engines re-run on every keystroke" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="panel p-4">
          <h3 className="font-serif text-lg font-semibold mb-1">Sample rake through analyzeRake()</h3>
          <p className="text-[0.72rem] text-muted mb-3">
            {SAMPLE_RAKE.id}: {num(SAMPLE_RAKE.wagons)} wagons, billed {num(SAMPLE_RAKE.billedTonnes)} t {SAMPLE_RAKE.billedGrade} @ {num(SAMPLE_RAKE.billedGCV)} kcal/kg,
            received {num(SAMPLE_RAKE.receivedTonnes)} t @ {num(SAMPLE_RAKE.receivedGCV)} kcal/kg, fired {num(SAMPLE_RAKE.firedGCV)} kcal/kg,
            {" "}{num(SAMPLE_RAKE.placementHours)} h at the tippler.
          </p>
          <table className="ledger">
            <tbody>
              <tr>
                <td>Excess transit loss ({num(rakeFindings.excessLossT, 1)} t beyond the {num(state.coal.transitQuantityLossPct, 2)}% norm)</td>
                <td className="num font-semibold">{inr(Math.round(rakeFindings.excessLossValue))}</td>
              </tr>
              <tr>
                <td>Grade overbilling ({SAMPLE_RAKE.billedGrade} billed vs {receivedGrade} received, edited price table)</td>
                <td className="num font-semibold">{inr(Math.round(overbillingEdited))}</td>
              </tr>
              <tr>
                <td>Demurrage ({num(rakeFindings.demurrageHours, 1)} h × {num(SAMPLE_RAKE.wagons)} wagons × {inr(state.coal.demurragePerWagonHour)}/wagon-h)</td>
                <td className="num font-semibold">{inr(Math.round(rakeFindings.demurrageValue))}</td>
              </tr>
              <tr>
                <td>Efficiency loss ({num(rakeFindings.unexplainedFiredGap)} kcal unexplained yard-to-boiler drop)</td>
                <td className="num">{inr(Math.round(rakeFindings.efficiencyLossValue))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="panel p-4">
          <h3 className="font-serif text-lg font-semibold mb-1">Sample clocks through the obligations engine</h3>
          <table className="ledger">
            <tbody>
              <tr>
                <td>
                  LD via ldForMilestone(): &ldquo;{SAMPLE_MILESTONE.name}&rdquo; due {dateFmt(SAMPLE_MILESTONE.due)},
                  open {num(ld.daysLate)} d late on a ₹{num(SAMPLE_CONTRACT.valueCr)} cr contract
                  ({num(SAMPLE_CONTRACT.ldRatePctPerWeek, 2)}%/wk, cap {num(SAMPLE_CONTRACT.ldCapPct)}%)
                </td>
                <td className="num font-semibold whitespace-nowrap">
                  {inrCr(ld.accruedValue * 1e7)}
                  <span className="block text-[0.68rem] text-muted font-normal">{pct(ld.accruedPct, 2)} accrued{ld.capped ? " · capped" : ""}</span>
                </td>
              </tr>
              <tr>
                <td>
                  COPU clock via paraClock(): para received {dateFmt("2026-02-20")}, reply window {num(state.obligation.copuReplyMonths)} months
                  → deadline {dateFmt(clock.deadline)}
                </td>
                <td className="num">
                  {clock.bucket === "OVERDUE" ? <Chip tone="danger">−{-clock.daysRemaining} d</Chip>
                    : clock.bucket === "DUE_30" ? <Chip tone="warning">due {clock.daysRemaining} d</Chip>
                    : clock.bucket === "DUE_60" ? <Chip tone="info">due {clock.daysRemaining} d</Chip>
                    : <Chip tone="success">on time</Chip>}
                </td>
              </tr>
              <tr>
                <td>
                  BG expiry via bgAlert(): ₹{num(SAMPLE_BG.valueCr, 1)} cr PBG expiring {dateFmt(SAMPLE_BG.expiry)} ({num(bg.daysToExpiry)} d out),
                  alert rungs T−{num(state.obligation.bgAlertDays[0])}/{num(state.obligation.bgAlertDays[1])}/{num(state.obligation.bgAlertDays[2])}
                </td>
                <td className="num">
                  {bg.level === "EXPIRED" ? <Chip tone="danger">EXPIRED</Chip>
                    : bg.level === "T7" ? <Chip tone="danger">T-{num(state.obligation.bgAlertDays[2])}</Chip>
                    : bg.level === "T30" ? <Chip tone="warning">T-{num(state.obligation.bgAlertDays[1])}</Chip>
                    : bg.level === "T60" ? <Chip tone="info">T-{num(state.obligation.bgAlertDays[0])}</Chip>
                    : <Chip tone="success">OK</Chip>}
                </td>
              </tr>
              <tr>
                <td>
                  Divergence flag: sample project paid {pct(SAMPLE_DIVERGENCE.financialPct, 0)} vs {pct(SAMPLE_DIVERGENCE.physicalPct, 0)} physical
                  ({num(divergencePp)} pp gap vs {num(state.obligation.divergenceFlagPp)} pp threshold)
                </td>
                <td className="num">
                  {divergenceFlagged ? <Chip tone="danger">flagged</Chip> : <Chip tone="success">within threshold</Chip>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[0.72rem] text-muted mt-4">
        Module pages compute on default norms; edits here demonstrate live recomputation on the worked examples.
        Norms persist in this browser under the key &ldquo;{STORAGE_KEY}&rdquo;.
      </p>
    </>
  );
}
