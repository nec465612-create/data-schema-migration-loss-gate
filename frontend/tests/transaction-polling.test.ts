import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const readContract = vi.fn();
  const getTransaction = vi.fn();
  const writeContract = vi.fn();
  const createClient = vi.fn((options: { account?: string }) =>
    options.account ? { writeContract } : { readContract, getTransaction },
  );
  return { createClient, getTransaction, readContract, writeContract };
});

vi.mock("genlayer-js", () => ({ createClient: mocks.createClient }));
vi.mock("genlayer-js/chains", () => ({
  localnet: { id: 1337 },
  studionet: { id: 4242 },
  testnetAsimov: { id: 4221 },
  testnetBradbury: { id: 4222 },
}));
vi.mock("genlayer-js/types", () => ({
  ExecutionResult: { FINISHED_WITH_RETURN: "FINISHED_WITH_RETURN" },
  TransactionStatus: { FINALIZED: "FINALIZED" },
}));

import { enumerateJournal, sha256Utf8 } from "../src/pending";

vi.stubEnv("VITE_GENLAYER_CHAIN", "studionet");
vi.stubEnv("VITE_CONTRACT_ADDRESS", "0x9999999999999999999999999999999999999999");
const contract = await import("../src/contract");

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
const txHash = `0x${"a".repeat(64)}`;
const account = "0x1111111111111111111111111111111111111111";

function walletFixture() {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const provider = {
    async request({ method }: { method: string }) {
      if (method === "eth_requestAccounts") return [account];
      if (method === "eth_chainId") return contract.expectedChainId();
      throw new Error(`UNEXPECTED_${method}`);
    },
    on(event: string, listener: (...args: unknown[]) => void) {
      const current = listeners.get(event) ?? new Set();
      current.add(listener);
      listeners.set(event, current);
    },
    removeListener(event: string, listener: (...args: unknown[]) => void) {
      listeners.get(event)?.delete(listener);
    },
  };
  return { provider };
}

function request() {
  return {
    method: "lock_schemas",
    args: ["1", "1"],
    argsForHash: ["1", "1"],
    intent: "lock_schemas:1:1",
    preRevision: "0",
    preHash: "0".repeat(64),
    caseId: "1",
    verify: () => true,
  };
}

async function configureReadback() {
  const argsHash = await sha256Utf8(contract.canonicalJson(["1", "1"]));
  mocks.readContract.mockImplementation(async ({ functionName }: { functionName: string }) => {
    if (functionName !== "get_version") throw new Error(`UNEXPECTED_${functionName}`);
    return JSON.stringify({
      revision: "1",
      last_operation: { method: "lock_schemas", caller: account, args_hash: argsHash },
    });
  });
}

async function waitForWriteSubmission() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (mocks.writeContract.mock.calls.length > 0) return;
    await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
  }
  throw new Error("TEST_WRITE_SUBMISSION_TIMEOUT");
}

beforeEach(() => {
  store.clear();
  mocks.readContract.mockReset();
  mocks.getTransaction.mockReset();
  mocks.writeContract.mockReset();
  mocks.writeContract.mockResolvedValue(txHash);
  vi.stubGlobal("localStorage", store);
  vi.stubGlobal("navigator", {
    locks: { request: async (_name: string, _options: unknown, work: () => Promise<unknown>) => work() },
  });
});

afterEach(() => {
  contract.disconnectWallet();
  vi.unstubAllGlobals();
});

describe("transaction polling controls", () => {
  it("shows a stable public message when the wallet rejects signing", async () => {
    mocks.writeContract.mockRejectedValue(new Error("User rejected the request. Version: viem@2.56.3"));
    await contract.connectWallet({ id: "fixture", name: "MetaMask", rdns: "io.metamask", provider: walletFixture().provider });
    const progress = vi.fn();

    await expect(contract.writeAndVerify(request(), progress)).rejects.toThrow("User rejected");

    expect(progress).toHaveBeenLastCalledWith({ phase: "REJECTED", message: "Signature request was rejected in the wallet." });
    expect(enumerateJournal()).toEqual([]);
  });

  it("pauses receipt polling while the document is hidden", async () => {
    let hidden = true;
    const visibilityListeners = new Set<() => void>();
    vi.stubGlobal("document", {
      get visibilityState() { return hidden ? "hidden" : "visible"; },
      addEventListener(_type: string, listener: () => void) { visibilityListeners.add(listener); },
      removeEventListener(_type: string, listener: () => void) { visibilityListeners.delete(listener); },
    });
    vi.stubGlobal("window", {
      setTimeout(callback: () => void) { callback(); return 0; },
      clearTimeout() { /* no visible timer is scheduled while hidden */ },
    });
    mocks.getTransaction.mockResolvedValue({ statusName: "FINALIZED", txExecutionResultName: "FINISHED_WITH_RETURN" });
    await configureReadback();
    await contract.connectWallet({ id: "fixture", name: "MetaMask", rdns: "io.metamask", provider: walletFixture().provider });

    const operation = contract.writeAndVerify(request());
    await waitForWriteSubmission();
    expect(mocks.writeContract).toHaveBeenCalledOnce();
    expect(mocks.getTransaction).not.toHaveBeenCalled();

    hidden = false;
    visibilityListeners.forEach((listener) => listener());
    await expect(operation).resolves.toMatchObject({ caseId: "1" });
    expect(mocks.getTransaction).toHaveBeenCalledOnce();
  });

  it("cancels polling on teardown and retains the submitted hash for reconciliation", async () => {
    vi.stubGlobal("window", {
      setTimeout(callback: () => void) { return globalThis.setTimeout(callback, 1000) as unknown as number; },
      clearTimeout(timer: number) { globalThis.clearTimeout(timer); },
    });
    mocks.getTransaction.mockResolvedValue({ statusName: "FINALIZED", txExecutionResultName: "FINISHED_WITH_RETURN" });
    await contract.connectWallet({ id: "fixture", name: "MetaMask", rdns: "io.metamask", provider: walletFixture().provider });

    const controller = new AbortController();
    const operation = contract.writeAndVerify(request(), undefined, { signal: controller.signal });
    await waitForWriteSubmission();
    controller.abort();

    await expect(operation).rejects.toThrow("WRITE_CANCELLED");
    expect(mocks.getTransaction).not.toHaveBeenCalled();
    expect(enumerateJournal()).toMatchObject([{ status: "RECONCILE", tx_hash: txHash }]);
  });

  it("uses a bounded retry for transient receipt transport errors", async () => {
    vi.stubGlobal("window", {
      setTimeout(callback: () => void) { callback(); return 0; },
      clearTimeout() { /* immediate test timers leave no pending handle */ },
    });
    mocks.getTransaction
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce({ statusName: "FINALIZED", txExecutionResultName: "FINISHED_WITH_RETURN" });
    await configureReadback();
    await contract.connectWallet({ id: "fixture", name: "MetaMask", rdns: "io.metamask", provider: walletFixture().provider });

    await expect(contract.writeAndVerify(request())).resolves.toMatchObject({ caseId: "1" });
    expect(mocks.getTransaction).toHaveBeenCalledTimes(2);
  });
});
