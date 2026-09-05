import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const readContract = vi.fn();
  const getTransaction = vi.fn();
  const writeContract = vi.fn();
  const createClient = vi.fn((options: { account?: string }) =>
    options.account
      ? { writeContract }
      : { readContract, getTransaction },
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

function walletFixture() {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const accountA = "0x1111111111111111111111111111111111111111";
  const accountB = "0x2222222222222222222222222222222222222222";
  const provider = {
    async request({ method }: { method: string }) {
      if (method === "eth_requestAccounts") return [accountA];
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
    emit(event: string, value?: unknown) {
      listeners.get(event)?.forEach((listener) => void listener(value));
    },
  };
  return { accountA, accountB, provider };
}

const store = new MemoryStorage();

beforeEach(() => {
  store.clear();
  mocks.readContract.mockReset();
  mocks.getTransaction.mockReset();
  mocks.writeContract.mockReset();
  mocks.writeContract.mockResolvedValue(`0x${"a".repeat(64)}`);
  vi.stubGlobal("localStorage", store);
  vi.stubGlobal("navigator", {
    locks: { request: async (_name: string, _options: unknown, work: () => Promise<unknown>) => work() },
  });
  vi.stubGlobal("window", {
    setTimeout(callback: () => void) {
      callback();
      return 0;
    },
  });
});

afterEach(() => {
  contract.disconnectWallet();
  vi.unstubAllGlobals();
});

describe("write wallet-session race", () => {
  it("reconciles when account changes during the awaited historical readback", async () => {
    const fixture = walletFixture();
    await contract.connectWallet({
      id: "fixture",
      name: "MetaMask",
      rdns: "io.metamask",
      provider: fixture.provider,
    });

    const txHash = `0x${"a".repeat(64)}`;
    mocks.getTransaction.mockResolvedValue({
      statusName: "FINALIZED",
      txExecutionResultName: "FINISHED_WITH_RETURN",
    });
    const argsForHash = ["1", "1"];
    const argsHash = await sha256Utf8(contract.canonicalJson(argsForHash));
    mocks.readContract.mockImplementation(async ({ functionName }: { functionName: string }) => {
      if (functionName !== "get_version") throw new Error(`UNEXPECTED_${functionName}`);
      fixture.provider.emit("accountsChanged", [fixture.accountB]);
      for (let attempt = 0; attempt < 5 && contract.getWalletSession()?.account !== fixture.accountB; attempt += 1) {
        await Promise.resolve();
      }
      return JSON.stringify({
        revision: "1",
        last_operation: {
          method: "lock_schemas",
          caller: fixture.accountA,
          args_hash: argsHash,
        },
      });
    });

    const progress: Array<{ phase: string; hash?: string }> = [];
    const operation = contract.writeAndVerify({
      method: "lock_schemas",
      args: ["1", "1"],
      argsForHash,
      intent: "lock_schemas:1:1",
      preRevision: "0",
      preHash: "0".repeat(64),
      caseId: "1",
      verify: () => true,
    }, (value) => progress.push(value));

    await expect(operation).rejects.toThrow("RECONCILE_WALLET_SESSION_CHANGED");
    expect(mocks.writeContract).toHaveBeenCalledOnce();
    expect(contract.getWalletSession()).toMatchObject({ account: fixture.accountB });
    expect(progress).toContainEqual({ phase: "RECONCILIATION_REQUIRED", hash: txHash, message: "RECONCILE_WALLET_SESSION_CHANGED" });
    expect(enumerateJournal()).toMatchObject([{
      account: fixture.accountA,
      status: "RECONCILE",
      tx_hash: txHash,
    }]);
  });
});
