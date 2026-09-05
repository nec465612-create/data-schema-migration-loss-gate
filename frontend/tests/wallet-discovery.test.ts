import { afterEach, describe, expect, it, vi } from "vitest";

import { discoverWallets } from "../src/contract";

type Browser = EventTarget & {
  ethereum?: Record<string, unknown>;
  setTimeout: (callback: () => void, milliseconds?: number) => number;
};

function browser(): Browser {
  const value = new EventTarget() as Browser;
  value.setTimeout = (callback) => {
    queueMicrotask(callback);
    return 0;
  };
  return value;
}

function announce(target: Browser, info: Record<string, string>, provider: Record<string, unknown>): void {
  const event = new Event("eip6963:announceProvider");
  Object.defineProperty(event, "detail", { value: { info, provider } });
  target.dispatchEvent(event);
}

afterEach(() => vi.unstubAllGlobals());

describe("wallet discovery", () => {
  it("uses exact RDNS identities and retains late EIP-6963 announcements", async () => {
    const target = browser();
    vi.stubGlobal("window", target);
    target.addEventListener("eip6963:requestProvider", () => {
      announce(target, { uuid: "metamask", name: "Untrusted Name", rdns: "io.metamask" }, {});
      announce(target, { uuid: "rabby", name: "Rabby Wallet", rdns: "io.rabby" }, {});
      announce(target, { uuid: "unknown", name: "MetaMask", rdns: "com.example.wallet" }, {});
      announce(target, { uuid: "missing", name: "OKX Wallet", rdns: "" }, {});
    });

    const initial = await discoverWallets();
    expect(initial.map((wallet) => wallet.rdns)).toEqual(["io.metamask", "io.rabby"]);
    expect(initial[0]).toMatchObject({ name: "MetaMask", rdns: "io.metamask" });

    announce(target, { uuid: "okx", name: "Spoofed Name", rdns: "com.okex.wallet" }, {});
    const afterLateAnnouncement = await discoverWallets();
    expect(afterLateAnnouncement.map((wallet) => wallet.rdns)).toEqual(["io.metamask", "io.rabby", "com.okex.wallet"]);
  });

  it("maps one exact legacy flag and rejects ambiguous or unidentified providers", async () => {
    const target = browser();
    target.ethereum = { request: async () => [], isMetaMask: true, isRabby: true };
    vi.stubGlobal("window", target);
    expect(await discoverWallets()).toEqual([]);

    target.ethereum = { request: async () => [], isOKExWallet: true };
    expect(await discoverWallets()).toMatchObject([{ name: "OKX Wallet", rdns: "com.okex.wallet" }]);
  });
});
