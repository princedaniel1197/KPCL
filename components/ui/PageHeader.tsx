// Report-style page header: Cormorant title over a gold master rule,
// muted subtitle line carrying plant scope · period · module.

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rule-master pb-3 mb-6 print-block">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold leading-tight">{title}</h1>
          <p className="text-[0.72rem] text-muted uppercase tracking-[0.12em] mt-1">{subtitle}</p>
        </div>
        {actions && <div className="no-print flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}
