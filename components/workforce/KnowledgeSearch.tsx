"use client";

// Knowledge-base search [F1] — client-side filter over captured legacy
// interviews. The cards below are synthetic exemplars representing the kind of
// material a legacy-interview programme captures; they are not tied to the
// generated employee roster.

import { useState } from "react";

interface KnowledgeCard {
  title: string;
  sourceRole: string;
  station: string;
  captured: string; // dd Mon yyyy display string
  abstract: string;
  tags: string[];
}

const CARDS: KnowledgeCard[] = [
  {
    title: "Turbine vibration diagnosis — field heuristics",
    sourceRole: "Turbine vibration specialist",
    station: "RTPS",
    captured: "14 Mar 2026",
    abstract:
      "Distinguishing bearing wipe from misalignment by phase drift across bearings 3–4 before spectrum analysis confirms. Includes the barring-gear listening checks used ahead of every cold start.",
    tags: ["turbine", "vibration", "bearings", "cold start"],
  },
  {
    title: "Boiler tube leak triage under load",
    sourceRole: "Boiler pressure-parts engineer",
    station: "BTPS",
    captured: "02 Feb 2026",
    abstract:
      "Acoustic and DM make-up signatures that separate an economiser pinhole from a waterwall rupture. When to ride a leak to the weekend outage versus tripping immediately.",
    tags: ["boiler", "tube leak", "pressure parts"],
  },
  {
    title: "Mill fineness vs slagging on slipped-grade coal",
    sourceRole: "Mill maintenance foreman",
    station: "RTPS",
    captured: "22 Apr 2026",
    abstract:
      "Classifier settings that hold combustion stability when received GCV runs a full grade under billing. Roller-gap wear pattern that predicts a mill puff two weeks out.",
    tags: ["mills", "coal quality", "combustion"],
  },
  {
    title: "ESP hopper de-ashing sequence in monsoon",
    sourceRole: "Ash-handling senior operator",
    station: "YTPS",
    captured: "18 May 2026",
    abstract:
      "Moisture-heavy ash bridges hoppers in a fixed order — the manual rapping and heater sequence that clears fields without tripping the pass. Learned across eleven monsoons.",
    tags: ["ESP", "ash handling", "monsoon"],
  },
  {
    title: "Black-start drill for hydro units",
    sourceRole: "Hydro governor specialist",
    station: "HYDRO",
    captured: "09 Jan 2026",
    abstract:
      "Hand-cranking legacy mechanical governors to speed-no-load when station supply is dark. Sequencing spear valves against penstock hammer on the oldest machines.",
    tags: ["hydro", "black start", "governor"],
  },
  {
    title: "Stockyard compaction and fire watch",
    sourceRole: "Coal stockyard supervisor",
    station: "RTPS",
    captured: "27 Feb 2026",
    abstract:
      "Layer-compaction pattern that keeps 45-day-old piles under the combustion threshold. Reading heat shimmer at dawn to find hot spots before the thermal scanner does.",
    tags: ["stockyard", "spontaneous combustion", "coal"],
  },
  {
    title: "DCS alarm-flood rationalisation",
    sourceRole: "C&I engineer (DCS)",
    station: "YTPS",
    captured: "11 Jun 2026",
    abstract:
      "The twelve nuisance alarms that mask a genuine drum-level excursion during load ramps, and the suppression logic reviewed with every firmware upgrade since commissioning.",
    tags: ["DCS", "C&I", "alarms"],
  },
  {
    title: "Switchyard isolation permits — legacy interlocks",
    sourceRole: "Switchyard supervisor",
    station: "BTPS",
    captured: "30 Mar 2026",
    abstract:
      "Undocumented mechanical interlocks on the 220 kV bays retrofitted in the nineties. The isolation order that keeps the permit system honest when SCADA disagrees with the field.",
    tags: ["switchyard", "permits", "safety"],
  },
  {
    title: "Cooling-tower fill replacement lessons",
    sourceRole: "Mechanical maintenance engineer",
    station: "RTPS",
    captured: "05 Apr 2026",
    abstract:
      "Why film fill choked within two years on high-cycle water and splash fill did not. Approach-temperature arithmetic that justified the hybrid retrofit to the board.",
    tags: ["cooling tower", "water chemistry"],
  },
  {
    title: "FGD limestone slurry chemistry at start-up",
    sourceRole: "FGD commissioning engineer",
    station: "YTPS",
    captured: "20 Jun 2026",
    abstract:
      "Holding slurry pH through the first 72 hours of absorber operation before limestone dissolution stabilises. Gypsum dewatering settings that survive load swings.",
    tags: ["FGD", "chemistry", "commissioning"],
  },
];

export function KnowledgeSearch() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const hits = q
    ? CARDS.filter((c) =>
        [c.title, c.sourceRole, c.station, c.abstract, c.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : CARDS;

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search captured knowledge — equipment, role, station, tag…"
        className="w-full bg-panel border border-rule rounded-sm px-3 py-2 text-[0.85rem] placeholder:text-faint focus:outline-none focus:border-gold mb-3"
        aria-label="Search knowledge base"
      />
      <div className="text-[0.7rem] text-muted mb-3">
        {hits.length} of {CARDS.length} captured interviews · synthetic exemplars illustrating the
        legacy-interview knowledge base
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {hits.map((c) => (
          <div key={c.title} className="panel p-4">
            <div className="font-serif text-[1.05rem] font-semibold leading-snug">{c.title}</div>
            <div className="text-[0.68rem] uppercase tracking-[0.12em] text-muted mt-1">
              {c.sourceRole} · {c.station} · captured {c.captured}
            </div>
            <p className="text-[0.78rem] text-muted mt-2 leading-relaxed">{c.abstract}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {c.tags.map((tag) => (
                <span key={tag} className="chip chip-neutral">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
        {hits.length === 0 && (
          <p className="text-sm text-muted md:col-span-2">
            No captured interviews match “{query}”. Try an equipment name, station, or tag.
          </p>
        )}
      </div>
    </div>
  );
}
