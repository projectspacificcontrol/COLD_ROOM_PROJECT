import type { Status } from "../../types/dashboard";

export interface StatusStyle {
  badge: string;
  badgeDot: string;
  border: string;
  hoverBorder: string;
  cardBg: string;
  shadow: string;
}

export const statusStyles: Record<Status, StatusStyle> = {
  normal: {
    badge: "bg-[#DFFFEA] text-[#008A45] border border-[#10B981]/40",
    badgeDot: "bg-[#10B981]",
    border: "border-[#263442]",
    hoverBorder: "hover:border-[#10B981]/50",
    cardBg: "bg-[#111A22]",
    shadow: "hover:shadow-[0_0_20px_rgba(16,185,129,0.12)]"
  },
  warning: {
    badge: "bg-[#FFF3D6] text-[#B66A00] border border-[#F59E0B]/40",
    badgeDot: "bg-[#F59E0B]",
    border: "border-[#263442]",
    hoverBorder: "hover:border-[#F59E0B]/50",
    cardBg: "bg-[#111A22]",
    shadow: "hover:shadow-[0_0_20px_rgba(245,158,11,0.12)]"
  },
  critical: {
    badge: "bg-[#FFE4E6] text-[#B91C1C] border border-[#EF4444]/40",
    badgeDot: "bg-[#EF4444]",
    border: "border-[#EF4444]/35",
    hoverBorder: "hover:border-[#EF4444]/75",
    cardBg: "bg-[#111A22]",
    shadow: "hover:shadow-[0_0_22px_rgba(239,68,68,0.18)]"
  },
  fault: {
    badge: "bg-[#1F2937] text-[#CBD5E1] border border-[#94A3B8]/30",
    badgeDot: "bg-[#94A3B8]",
    border: "border-[#263442] border-dashed",
    hoverBorder: "hover:border-[#cbd5e1]/30",
    cardBg: "bg-[#111A22]/95",
    shadow: "hover:shadow-[0_0_15px_rgba(148,163,184,0.06)]"
  },
  offline: {
    badge: "bg-[#1F2937] text-[#CBD5E1] border border-[#94A3B8]/30",
    badgeDot: "bg-[#94A3B8]",
    border: "border-[#263442] border-dashed",
    hoverBorder: "hover:border-[#cbd5e1]/30",
    cardBg: "bg-[#111A22]/95",
    shadow: "hover:shadow-[0_0_15px_rgba(148,163,184,0.06)]"
  }
};

export function statusLabel(status: Status): string {
  if (status === "fault") return "Fault";
  if (status === "offline") return "Offline";
  return status.charAt(0).toUpperCase() + status.slice(1);
}
