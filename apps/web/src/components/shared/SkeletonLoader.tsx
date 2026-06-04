export function OverviewSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="rounded-lg bg-zinc-800/40 border border-zinc-700/35 p-5 shadow-sm space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-zinc-700 rounded" />
            <div className="h-4 w-4 bg-zinc-700 rounded-full" />
          </div>
          <div className="h-8 w-16 bg-zinc-700 rounded" />
          <div className="h-4 w-32 bg-zinc-700 rounded" />
        </div>
      ))}
    </div>
  );
}

export function RoomGridSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, gIdx) => (
        <div key={gIdx} className="space-y-3">
          <div className="h-8 w-56 bg-zinc-800/40 rounded animate-pulse" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, cIdx) => (
              <div
                key={cIdx}
                className="h-48 rounded-lg bg-zinc-800/40 border border-zinc-700/35 p-4 shadow-sm space-y-4 animate-pulse"
              >
                <div className="flex justify-between items-start">
                  <div className="h-6 w-28 bg-zinc-700 rounded" />
                  <div className="h-6 w-16 bg-zinc-700 rounded" />
                </div>
                <div className="space-y-1">
                  <div className="h-4 w-20 bg-zinc-700/60 rounded" />
                  <div className="h-8 w-24 bg-zinc-700 rounded" />
                </div>
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {Array.from({ length: 5 }).map((_, sIdx) => (
                    <div key={sIdx} className="h-10 bg-zinc-700/50 rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
