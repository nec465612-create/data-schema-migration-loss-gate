import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearRpcTelemetry,
  instrumentProvider,
  readRpcTelemetry,
  withRpcScope,
} from "../src/rpc-telemetry";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const store = new MemoryStorage();

afterEach(() => {
  clearRpcTelemetry();
  vi.unstubAllGlobals();
});

describe("RPC telemetry", () => {
  it("records provider methods with their active scope", async () => {
    vi.stubGlobal("sessionStorage", store);
    const provider = instrumentProvider({ request: vi.fn().mockResolvedValue(["0x1"]) });
    await withRpcScope("wallet-connect", () => provider.request({ method: "eth_requestAccounts" }));

    expect(readRpcTelemetry()).toContainEqual(expect.objectContaining({
      kind: "rpc",
      source: "provider",
      method: "eth_requestAccounts",
      scope: "wallet-connect",
      ok: true,
    }));
  });

  it("records JSON-RPC fetch methods and HTTP status", async () => {
    vi.stubGlobal("sessionStorage", store);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    const telemetry = await import("../src/rpc-telemetry");
    telemetry.installRpcFetchTelemetry();
    await withRpcScope("load-case-ids", () => fetch("https://rpc.invalid", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", method: "get_count", params: [] }),
    }));

    expect(readRpcTelemetry()).toContainEqual(expect.objectContaining({
      kind: "rpc",
      source: "http",
      method: "get_count",
      scope: "load-case-ids",
      status: 200,
    }));
  });
});
