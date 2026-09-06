import { expect, test } from "@playwright/test";

test("landing screen is readable without an automatic chain request", async ({ page }) => {
  const rpcRequests: string[] = [];
  page.on("request", (request) => {
    if (["fetch", "xhr"].includes(request.resourceType()) && (request.url().includes("/api") || request.url().includes("rpc"))) rpcRequests.push(request.url());
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

test("reload restores a retained journal and keeps archive behind export", async ({ page }) => {
  await page.addInitScript(() => {
    const reservation = "a".repeat(32);
    const record = {
      v: 1,
      reservation,
      chain: "4242",
      contract: "0x9999999999999999999999999999999999999999",
      account: "0x2222222222222222222222222222222222222222",
      method: "lock_schemas",
      intent: "lock_schemas:1:0",
      args_json: "[\"1\",\"0\"]",
      pre_revision: "0",
      pre_hash: "a".repeat(64),
      tx_hash: `0x${"b".repeat(64)}`,
      status: "VERIFIED",
      created_ms: "1",
    };
    localStorage.setItem(`glj1:${reservation}`, JSON.stringify(record));
    localStorage.setItem("glj1:index", JSON.stringify([`glj1:${reservation}`]));
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Recovery journal" })).toBeVisible();
  await expect(page.getByText("lock_schemas", { exact: true })).toBeVisible();
  const archive = page.getByRole("button", { name: "Archive after export" });
  await expect(archive).toBeDisabled();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  await (await download).path();
  await expect(archive).toBeEnabled();
});

test("RPC evidence can be refreshed and cleared from the public UI", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("dsm-lg-rpc-telemetry-v1", JSON.stringify([
    { kind: "rpc", source: "http", method: "get_schema_case_count", scope: "load-case-ids", at: 1, ok: true, status: 200 },
  ])));
  await page.goto("/");
  await page.getByText("RPC evidence", { exact: true }).click();
  await page.getByRole("button", { name: "Refresh RPC evidence" }).click();
  await expect(page.getByText("1 RPC requests recorded.")).toBeVisible();
  await expect(page.getByTestId("rpc-evidence-json")).toContainText("get_schema_case_count");
  await page.getByRole("button", { name: "Clear RPC evidence" }).click();
  await expect(page.getByText("0 RPC requests recorded.")).toBeVisible();
  await expect(page.getByTestId("rpc-evidence-json")).toHaveText("[]");
});
