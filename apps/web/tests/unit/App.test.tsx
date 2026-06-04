import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../src/App";

describe("App", () => {
  it("renders the cold room dashboard from fixtures", async () => {
    render(<App />);

    expect(await screen.findByText("Cold Storage Temperature Dashboard")).toBeInTheDocument();
    expect(await screen.findByText("Total Rooms")).toBeInTheDocument();
    expect(await screen.findByText("Group CR123 — Rooms 1, 2, 3")).toBeInTheDocument();
  });
});

