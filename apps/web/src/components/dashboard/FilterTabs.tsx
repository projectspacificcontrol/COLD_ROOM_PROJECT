export type RoomFilter = "all" | "normal" | "warning" | "critical" | "fault_offline";

interface Props {
  active: RoomFilter;
  counts: Record<RoomFilter, number>;
  onChange: (filter: RoomFilter) => void;
}

const filters: RoomFilter[] = ["all", "normal", "warning", "critical", "fault_offline"];

const filterLabels: Record<RoomFilter, string> = {
  all: "All Rooms",
  normal: "Normal",
  warning: "Warning",
  critical: "Critical",
  fault_offline: "Fault / Offline"
};

export function FilterTabs({ active, counts, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2 sm:gap-2.5" role="tablist" aria-label="Room status filter">
      {filters.map((filter) => {
        const selected = active === filter;
        const count = counts[filter];
        const label = filterLabels[filter];
        
        return (
          <button
            className={`group inline-flex items-center gap-2.5 min-h-[2.5rem] rounded-lg px-4 py-1.5 text-xs font-black uppercase tracking-wider font-mono transition-all duration-200 border select-none cursor-pointer outline-none active:scale-[0.98] ${
              selected
                ? "bg-white text-[#0B1117] border-white shadow-[0_0_15px_rgba(255,255,255,0.12)]"
                : "bg-[#111A22] text-zinc-300 border-[#263442] hover:border-[#384c60] hover:text-white hover:bg-[#1c2730]"
            }`}
            key={filter}
            onClick={() => onChange(filter)}
            role="tab"
            aria-selected={selected}
            type="button"
          >
            <span>{label}</span>
            <span 
              className={`inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-black border transition-colors ${
                selected 
                  ? "bg-[#0b1117] text-white border-transparent" 
                  : "bg-[#1c2730] text-zinc-300 border-[#263442] group-hover:bg-[#263442] group-hover:text-white"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
