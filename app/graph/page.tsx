// Entity Intelligence Graph [H3].

import { PageHeader } from "@/components/ui/PageHeader";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { subtitle } from "@/lib/subtitle";
import { t } from "@/lib/i18n";
import { graphWithDossiers } from "@/lib/views/graph";

export default function GraphPage({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const { graph, dossiers } = graphWithDossiers();

  return (
    <>
      <PageHeader title={t(lang, "graph")} subtitle={subtitle(lang, scope, "graph")} />
      <p className="text-[0.8rem] text-muted -mt-3 mb-4 max-w-3xl">
        One node per counterparty, joined across capital projects, procurement, litigation, LD registers and the coal ledger.
        The graph is corporate-wide — plant scope does not filter it.
      </p>
      <GraphCanvas graph={graph} dossiers={dossiers} />
    </>
  );
}
