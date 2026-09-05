import { afterEach, describe, expect, it } from "vitest";

import {
  connectWallet,
  disconnectWallet,
  expectedChainId,
  getWalletSession,
} from "../src/contract";
import type { Eip1193Provider, WalletOption } from "../src/contract";
import { sameWriteContext } from "../src/write-context";

type Listener = (...args: unknown[]) => void;

function walletFixture() {
  const listeners = new Map<string, Set<Listener>>();
  let chainId = expectedChainId();
  let accounts = ["0x1111111111111111111111111111111111111111"];
  let removed = 0;
  const provider: Eip1193Provider & { emit(event: string, value?: unknown): void } = {
    async request({ method }) {
      if (method === "eth_requestAccounts") return accounts;
      if (method === "eth_chainId") return chainId;
      throw new Error(`UNEXPECTED_${method}`);
    },
    on(event, listener) {
      const current = listeners.get(event) ?? new Set<Listener>();
      current.add(listener);
      listeners.set(event, current);
    },
    removeListener(event, listener) {
      listeners.get(event)?.delete(listener);
      removed += 1;
    },
    emit(event, value) {
      listeners.get(event)?.forEach((listener) => void listener(value));
    },
  };
  return {
    wallet: { id: "fixture", name: "MetaMask", rdns: "io.metamask", provider } as WalletOption,
    provider,
    setAccounts(next: string[]) { accounts = next; },
    setChain(next: string) { chainId = next; },
    removed: () => removed,
  };
}

afterEach(() => disconnectWallet());

describe("wallet session event binding", () => {
  it("invalidates an in-flight write context when the account is replaced", () => {
    const sessionA = { account: "0x1111111111111111111111111111111111111111" };
    const sessionB = { account: "0x2222222222222222222222222222222222222222" };
    const clientA = {};
    const clientB = {};
    expect(sameWriteContext({ generation: 1, session: sessionA, client: clientA }, { generation: 1, session: sessionA, client: clientA })).toBe(true);
    expect(sameWriteContext({ generation: 1, session: sessionA, client: clientA }, { generation: 2, session: sessionB, client: clientB })).toBe(false);
  });

  it("rebinds account, disables wrong-chain writes, and tears down on disconnect", async () => {
    const fixture = walletFixture();
    await connectWallet(fixture.wallet);
    expect(getWalletSession()).toMatchObject({ account: "0x1111111111111111111111111111111111111111", chainId: expectedChainId(), canWrite: true });

    fixture.setAccounts(["0x2222222222222222222222222222222222222222"]);
    fixture.provider.emit("accountsChanged", ["0x2222222222222222222222222222222222222222"]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getWalletSession()).toMatchObject({ account: "0x2222222222222222222222222222222222222222", chainId: expectedChainId() });

    fixture.setChain("0x0");
    fixture.provider.emit("chainChanged", "0x0");
    expect(getWalletSession()).toMatchObject({ chainId: "0x0", canWrite: false });
    fixture.provider.emit("chainChanged", expectedChainId());
    expect(getWalletSession()).toMatchObject({ chainId: expectedChainId(), canWrite: true });
    fixture.provider.emit("disconnect", { code: 4900 });
    expect(getWalletSession()).toBeNull();
    expect(fixture.removed()).toBe(3);
  });
});
