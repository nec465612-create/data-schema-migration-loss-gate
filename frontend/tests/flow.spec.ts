import { expect, test } from "@playwright/test";

test("landing screen is readable without an automatic chain request", async ({ page }) => {
  const rpcRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api") || request.url().includes("rpc")) rpcRequests.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Schema migration loss gate" })).toBeVisible();
  await expect(page.getByText("Assessment of this exact submitted material only; not verification of external facts.")).toBeVisible();
  await expect(page.getByText("No chain read is made until you choose an action.")).toBeVisible();
  expect(rpcRequests).toHaveLength(0);
});

test("public warning and schema editors render as text and controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("All submitted text will be public and permanent.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "old" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "new" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create case" })).toBeDisabled();
});
