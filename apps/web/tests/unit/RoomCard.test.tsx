import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { RoomCard } from "../../src/components/dashboard/RoomCard";
import type { RoomSnapshot } from "../../src/types/dashboard";

const mockRoom: RoomSnapshot = {
  room_number: 12,
  room_name: "Cold Room 12",
  group_code: "CR101112",
  average_c: 3.2,
  status: "critical",
  active_alerts: ["CRITICAL threshold condition"],
  sensors: [
    { source_tag: "CR101112_TT06", label: "T1", value_c: 3.7, quality: "good", status: "normal" },
    { source_tag: "CR101112_TT07", label: "T2", value_c: 3.0, quality: "good", status: "normal" },
    { source_tag: "CR101112_TT08", label: "T3", value_c: 0.2, quality: "good", status: "critical" },
    { source_tag: "CR101112_TT09", label: "T4", value_c: 3.9, quality: "good", status: "normal" },
    { source_tag: "CR101112_TT10", label: "T5", value_c: 5.2, quality: "good", status: "normal" }
  ]
};

describe("RoomCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders room details and highlights critical sensors", () => {
    const onSelect = vi.fn();
    render(<RoomCard room={mockRoom} onSelect={onSelect} />);

    expect(screen.getByText("Cold Room 12")).toBeInTheDocument();
    expect(screen.getByText("3.2°C")).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();

    // Check individual sensor labels and values
    expect(screen.getByText("T1")).toBeInTheDocument();
    expect(screen.getByText("3.7")).toBeInTheDocument();
    expect(screen.getByText("T3")).toBeInTheDocument();
    expect(screen.getByText("0.2")).toBeInTheDocument();

    // Verify T3 is critical highlighted (text-rose-500)
    const t3Value = screen.getByText("0.2");
    expect(t3Value.className).toContain("text-rose-500");
  });

  it("handles mouse click selection", () => {
    const onSelect = vi.fn();
    render(<RoomCard room={mockRoom} onSelect={onSelect} />);

    const card = screen.getByRole("button", { name: /Cold Room 12/i });
    fireEvent.click(card);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockRoom);
  });

  it("handles enter key selection for accessibility", () => {
    const onSelect = vi.fn();
    render(<RoomCard room={mockRoom} onSelect={onSelect} />);

    const card = screen.getByRole("button", { name: /Cold Room 12/i });
    fireEvent.keyDown(card, { key: "Enter", code: "Enter" });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockRoom);
  });
});

import { ForbiddenScreen } from "../../src/components/shared/ForbiddenScreen";

describe("ForbiddenScreen", () => {
  it("renders without crashing", () => {
    render(<ForbiddenScreen isSimulated={true} onRetry={() => {}} onDisableSimulation={() => {}} />);
    expect(screen.getByText("Access Not Allowed")).toBeInTheDocument();
  });
});
