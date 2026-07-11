// Data Feeds [A11/C7/E3] — ingestion health and the public-data spine that
// powers every module.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { dataFeeds } from "@/lib/data";
import { num } from "@/lib/format";
import type { DataFeed } from "@/lib/types";

function healthChip(health: DataFeed["health"]) {
  if (health === "OK") return <Chip tone="success">OK</Chip>;
  if (health === "DEGRADED") return <Chip tone="warning">DEGRADED</Chip>;
  return <Chip tone="danger">STALE</Chip>;
}

const SPINE: { feed: string; powers: { label: string; href: string }[] }[] = [
  { feed: "Parivesh clearance feed", powers: [{ label: "Clearance gates [A2]", href: "/projects/clearances" }] },
  { feed: "eCourts / HC / APTEL sync", powers: [{ label: "Legal [E3]", href: "/legal" }] },
  { feed: "CEA monthly generation reports", powers: [{ label: "Plant cross-checks", href: "/plants" }] },
  { feed: "e-Procurement tender feed", powers: [{ label: "Re-tender detection [A10]", href: "/projects/retenders" }] },
  { feed: "UTTAM sampling + weighbridge capture", powers: [{ label: "Coal ledger [C1/C7]", href: "/coal/ledger" }] },
  { feed: "Railway RR / demurrage advice", powers: [{ label: "Demurrage [C2]", href: "/coal/demurrage" }] },
  { feed: "ERP extracts (FICO/MM)", powers: [{ label: "Contracts / RA bills [D1/A3]", href: "/contracts" }] },
  { feed: "DCS historian relay", powers: [{ label: "Heat rate [B3]", href: "/plants" }] },
  { feed: "CLMS biometric attendance", powers: [{ label: "Contract labour [F2]", href: "/workforce/contract-labour" }] },
];

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  const healthy = dataFeeds.filter((f) => f.health === "OK").length;
  const degraded = dataFeeds.filter((f) => f.health === "DEGRADED").length;
  const stale = dataFeeds.filter((f) => f.health === "STALE").length;

  return (
    <>
      <PageHeader title={t(lang, "dataFeeds")} subtitle={subtitle(lang, scope, "dataFeeds")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Feeds" value={num(dataFeeds.length)} sub="public · counterparty · internal" />
        <KpiTile label="Healthy" value={num(healthy)} tone="success" sub="synced within tolerance" />
        <KpiTile label="Degraded" value={num(degraded)} tone="warning" sub="partial coverage this cycle" />
        <KpiTile label="Stale" value={num(stale)} tone="danger" sub="behind the sync window" />
      </div>

      <SectionHead title="Feed ledger" right="last sync as reported by each connector" />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[900px]">
          <thead>
            <tr>
              <th>Feed</th><th>Kind</th><th>Last sync</th><th className="num">Records</th><th>Health</th><th>Note</th>
            </tr>
          </thead>
          <tbody>
            {dataFeeds.map((f) => (
              <tr key={f.id}>
                <td className="font-medium whitespace-nowrap">{f.name}</td>
                <td>{f.kind}</td>
                <td className="whitespace-nowrap">{f.lastSync}</td>
                <td className="num">{num(f.records)}</td>
                <td>{healthChip(f.health)}</td>
                <td className="text-muted">{f.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHead title="Public-data spine" right="which module each feed powers" />
      <div className="panel p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          {SPINE.map((s) => (
            <div key={s.feed} className="flex items-baseline justify-between gap-3 py-1.5 border-b-[0.5px] border-rule last:border-0 text-[0.8rem]">
              <span className="text-muted">{s.feed}</span>
              <span className="text-right whitespace-nowrap">
                {s.powers.map((p, i) => (
                  <span key={p.href}>
                    {i > 0 && " · "}
                    <Link className="underline" href={p.href}>{p.label}</Link>
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[0.72rem] text-muted mt-3">
          The spine is deliberately public-first: Parivesh, eCourts, CEA and the e-procurement portal need no
          counterparty consent, so the oversight ledger keeps working even when internal feeds lag.
        </p>
      </div>
    </>
  );
}
