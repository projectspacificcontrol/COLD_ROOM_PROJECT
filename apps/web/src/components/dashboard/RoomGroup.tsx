import type { GroupSnapshot, RoomSnapshot } from "../../types/dashboard";
import type { RoomFilter } from "./FilterTabs";
import { RoomCard } from "./RoomCard";

interface Props {
  group: GroupSnapshot;
  filter: RoomFilter;
  onSelectRoom: (room: RoomSnapshot) => void;
}

export function RoomGroup({ group, filter, onSelectRoom }: Props) {
  const rooms = group.rooms.filter((room) => {
    if (filter === "all") return true;
    if (filter === "fault_offline") {
      return room.status === "fault" || room.status === "offline";
    }
    return room.status === filter;
  });

  if (rooms.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex select-none">
        <h2 className="inline-flex items-center gap-2 rounded-lg bg-[#1c2730] border border-[#384c60] px-3.5 py-1.5 text-xs font-black uppercase tracking-widest text-white font-mono shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
          Group {group.group_code} — Rooms {group.room_numbers.join(", ")}
        </h2>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => (
          <RoomCard key={room.room_number} room={room} onSelect={onSelectRoom} />
        ))}
      </div>
    </section>
  );
}
