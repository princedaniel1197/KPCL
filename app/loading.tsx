// Route-level loading state: a ledger skeleton in the ivory system, so
// navigation between dynamic pages feels like the document settling in
// rather than a blank flash.

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      {/* header block */}
      <div className="rule-master pb-3 mb-6">
        <div className="skeleton h-10 w-72 mb-2" />
        <div className="skeleton h-3 w-96 max-w-full" />
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="panel px-4 py-3">
            <div className="skeleton h-2.5 w-20 mb-3" />
            <div className="skeleton h-7 w-24" />
          </div>
        ))}
      </div>

      {/* ledger rows */}
      <div className="skeleton h-3 w-40 mb-4" />
      <div className="space-y-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 py-3 rule-hair">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-3 flex-1" />
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
