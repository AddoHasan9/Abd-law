export default function AppRouteLoading() {
  return (
    <div className="w-full flex flex-col gap-6 p-4 sm:p-6 animate-fade-in text-right" dir="rtl">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-48 rounded-xl bg-surface-3/80 animate-pulse" />
          <div className="h-4 w-72 rounded-lg bg-surface-2 animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-28 rounded-xl bg-surface-2 animate-pulse" />
          <div className="h-10 w-32 rounded-xl bg-primary/20 animate-pulse" />
        </div>
      </div>

      {/* Metrics Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-surface border border-border-glass shadow-xs flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-surface-3/85 animate-pulse" />
              <div className="w-8 h-8 rounded-xl bg-surface-2 animate-pulse" />
            </div>
            <div className="h-8 w-16 rounded bg-surface-3/85 animate-pulse mt-1" />
            <div className="h-3 w-32 rounded bg-surface-2 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Main Table Card Skeleton */}
      <div className="p-6 rounded-2xl bg-surface border border-border-glass shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 pb-2 border-b border-border-soft">
          <div className="h-10 w-64 rounded-xl bg-surface-2 animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="h-10 w-24 rounded-xl bg-surface-2 animate-pulse" />
            <div className="h-10 w-24 rounded-xl bg-surface-2 animate-pulse" />
          </div>
        </div>

        {/* Skeleton Table Rows */}
        <div className="flex flex-col divide-y divide-border-soft">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-2 animate-pulse flex-shrink-0" />
                <div className="flex flex-col gap-1.5">
                  <div className="h-4 w-44 rounded bg-surface-3/80 animate-pulse" />
                  <div className="h-3 w-28 rounded bg-surface-2 animate-pulse" />
                </div>
              </div>
              <div className="hidden sm:block h-4 w-28 rounded bg-surface-2 animate-pulse" />
              <div className="hidden md:block h-6 w-20 rounded-full bg-surface-2 animate-pulse" />
              <div className="h-8 w-20 rounded-xl bg-surface-2 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
