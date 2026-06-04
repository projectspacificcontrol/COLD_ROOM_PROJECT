import { expect, test } from "@playwright/test";

test("dashboard renders fixture rooms", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Cold Storage Temperature Dashboard" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Cold Room 1\b/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Critical/ }).first()).toBeVisible();
});

test("room card opens the detail drawer", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Cold Room 1\b/ }).click();
  const drawer = page.getByRole("dialog", { name: /Cold Room 1 detailed telemetry/ });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("heading", { name: "Cold Room 1" })).toBeVisible();
  await expect(drawer.getByText("Temperature History (Last 2 Hours)")).toBeVisible();
});
