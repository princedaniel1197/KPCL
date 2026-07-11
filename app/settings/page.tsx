// Settings — every engine norm editable, with live recompute worked examples.

import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  return (
    <>
      <PageHeader title={t(lang, "settings")} subtitle={subtitle(lang, scope, "settings")} />
      <SettingsPanel />
    </>
  );
}
