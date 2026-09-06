import { afterEach, describe, expect, it, vi } from "vitest";

import {
  disconnectWallet,
  getWalletState,
  openWalletChooser,
  selectWallet,
} from "../src/contract";

type Browser = EventTarget & { setTimeout(callback: () => void): number };

function browser(): Browser {
  const target = new EventTarget() as Browser;
  target.setTimeout = (callback) => { callback(); return 0; };
  return target;
}

function provider(account: string) {
  const calls: string[] = [];
  return {
    calls,
    value: {
      async request({ method }: { method: string }) {
        calls.push(method);
        if (method === "eth_requestAccounts") return [account];
        if (method === "eth_chainId") return "0xf22f";
        throw new Error(`UNEXPECTED_${method}`);
      },
    },
  };
}

function announce(target: Browser, uuid: string, rdns: string, value: ReturnType<typeof provider>["value"]): void {
  const event = new Event("eip6963:announceProvider");
  Object.defineProperty(event, "detail", { value: { info: { uuid, name: uuid, rdns, icon: `data:image/svg+xml,${uuid}` }, provider: value } });
  target.dispatchEvent(event);
}

afterEach(() => {
  disconnectWallet();
  vi.unstubAllGlobals();
});

describe("canonical wallet state", () => {
  it.each([
    [],
    [["metamask", "io.metamask"]],
    [["okx", "com.okex.wallet"]],
    [["rabby", "io.rabby"]],
    [["metamask", "io.metamask"], ["okx", "com.okex.wallet"]],
    [["metamask", "io.metamask"], ["rabby", "io.rabby"]],
    [["okx", "com.okex.wallet"], ["rabby", "io.rabby"]],
    [["metamask", "io.metamask"], ["okx", "com.okex.wallet"], ["rabby", "io.rabby"]],
  ])("keeps option cardinality equal to detected supported providers: %j", async (...entries: unknown[]) => {
    const target = browser();
    const wallets = entries as Array<[string, string]>;
    target.addEventListener("eip6963:requestProvider", () => {
      wallets.forEach(([uuid, rdns], index) => announce(target, uuid, rdns, provider(`0x${String(index + 1).repeat(40)}`).value));
    });
    vi.stubGlobal("window", target);
    await openWalletChooser();
    expect(getWalletState().wallets).toHaveLength(wallets.length);
    expect(getWalletState().wallets.every((wallet) => typeof wallet.provider.request === "function")).toBe(true);
  });

  it("opens with zero account requests and routes selection only to the captured provider", async () => {
    const target = browser();
    const metamask = provider("0x1111111111111111111111111111111111111111");
    const okx = provider("0x2222222222222222222222222222222222222222");
    target.addEventListener("eip6963:requestProvider", () => {
      announce(target, "metamask", "io.metamask", metamask.value);
      announce(target, "okx", "com.okex.wallet", okx.value);
    });
    vi.stubGlobal("window", target);

    await openWalletChooser();
    expect(getWalletState()).toMatchObject({ phase: "CHOOSER_OPEN", selectedWalletId: null });
    expect(getWalletState().wallets.map((wallet) => wallet.name)).toEqual(["MetaMask", "OKX Wallet"]);
    expect(metamask.calls).toEqual([]);
    expect(okx.calls).toEqual([]);

    await selectWallet("metamask");
    expect(metamask.calls).toEqual(["eth_requestAccounts", "eth_chainId"]);
    expect(okx.calls).toEqual([]);
    expect(getWalletState()).toMatchObject({ phase: "CONNECTED", session: { wallet: { name: "MetaMask" } } });
    expect(getWalletState().phase).not.toBe("CHOOSER_OPEN");
  });

  it("renders no selectable options when no supported provider is detected", async () => {
    vi.stubGlobal("window", browser());
    await openWalletChooser();
    expect(getWalletState()).toMatchObject({ phase: "CHOOSER_OPEN", wallets: [] });
  });
});
