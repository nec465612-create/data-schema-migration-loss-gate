import { createClient } from "genlayer-js";
import { localnet, studionet, testnetAsimov, testnetBradbury } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";

import {
  JournalRecord,
  removeUnsignedJournal,
  reserveJournal,
  sha256Utf8,
  updateJournal,
} from "./pending";
import { WriteProgress } from "./progress";
import { chainMatches } from "./network";
import { sameWriteContext, WriteContext } from "./write-context";

export type ChainName = "localnet" | "studionet" | "testnetAsimov" | "testnetBradbury";
export type Eip1193Provider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
};
export type WalletOption = {
  id: string;
  name: string;
  rdns: string;
  icon?: string;
  provider: Eip1193Provider;
};

const chains: Record<ChainName, any> = {
  localnet,
  studionet,
  testnetAsimov,
  testnetBradbury,
};
const addressPattern = /^0x[0-9a-fA-F]{40}$/;
const decimalPattern = /^(0|[1-9][0-9]*)$/;

export const config = {
  chainName: parseChain(import.meta.env.VITE_GENLAYER_CHAIN),
  contractAddress: validAddress(import.meta.env.VITE_CONTRACT_ADDRESS),
};

function parseChain(value: string | undefined): ChainName {
  return value && value in chains ? (value as ChainName) : "studionet";
}

function validAddress(value: string | undefined): `0x${string}` | null {
  return value && addressPattern.test(value) ? (value.toLowerCase() as `0x${string}`) : null;
}

function requireAddress(): `0x${string}` {
  if (!config.contractAddress) throw new Error("CONTRACT_ADDRESS_MISSING_OR_INVALID");
  return config.contractAddress;
}

function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "bigint" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
  }
  throw new Error("UNSUPPORTED_HASH_VALUE");
}

export function decimal(value: unknown): string {
  const result = typeof value === "bigint" ? value.toString() : String(value);
  if (!decimalPattern.test(result)) throw new Error("BAD_DECIMAL");
  return result;
}

const readClient: any = createClient({ chain: chains[config.chainName] });
let writeClient: any = null;
let sessionClient: any = null;
let selectedProvider: Eip1193Provider | null = null;
let walletSession: WalletSession | null = null;
const sessionListeners = new Set<() => void>();
let removeSessionListeners = () => undefined;
let sessionGeneration = 0;
let walletRevision = 0;

export type WalletSession = {
  account: string;
  chainId: string;
  expectedChainId: string;
  canWrite: boolean;
};

export function getWalletSession(): WalletSession | null {
  return walletSession;
}

export function subscribeWalletSession(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

function publishWalletSession(): void {
  sessionListeners.forEach((listener) => listener());
}

function validAccount(value: unknown): string | null {
  return typeof value === "string" && addressPattern.test(value) ? value.toLowerCase() : null;
}

function bindSessionClient(account: string): any {
  if (!selectedProvider) return null;
  return createClient({
    chain: chains[config.chainName],
    account: account as `0x${string}`,
    provider: selectedProvider as any,
  });
}

function teardownSessionListeners(): void {
  sessionGeneration += 1;
  removeSessionListeners();
  removeSessionListeners = () => undefined;
}

function commitWalletSession(next: Omit<WalletSession, "canWrite"> | null): void {
  walletRevision += 1;
  if (!next) {
    walletSession = null;
    writeClient = null;
    publishWalletSession();
    return;
  }
  const canWrite = Boolean(sessionClient && chainMatches(next.expectedChainId, next.chainId));
  walletSession = { ...next, canWrite };
  writeClient = canWrite ? sessionClient : null;
  publishWalletSession();
}

function installSessionListeners(provider: Eip1193Provider): void {
  teardownSessionListeners();
  const installedGeneration = sessionGeneration;

  const accountsChanged = async (values: unknown) => {
    if (installedGeneration !== sessionGeneration) return;
    const account = Array.isArray(values) ? validAccount(values[0]) : null;
    if (!account) {
      disconnectWallet();
      return;
    }
    try {
      const chainId = String(await provider.request({ method: "eth_chainId" })).toLowerCase();
      if (installedGeneration !== sessionGeneration || !walletSession) return;
      sessionClient = bindSessionClient(account);
      commitWalletSession({ ...walletSession, account, chainId });
    } catch {
      if (installedGeneration !== sessionGeneration || !walletSession) return;
      sessionClient = bindSessionClient(account);
      commitWalletSession({ ...walletSession, account, chainId: "" });
    }
  };

  const chainChanged = (value: unknown) => {
    if (installedGeneration !== sessionGeneration || !walletSession) return;
    const chainId = String(value ?? "").toLowerCase();
    commitWalletSession({ ...walletSession, chainId });
  };

  const disconnected = () => disconnectWallet();
  provider.on?.("accountsChanged", accountsChanged);
  provider.on?.("chainChanged", chainChanged);
  provider.on?.("disconnect", disconnected);
  removeSessionListeners = () => {
    provider.removeListener?.("accountsChanged", accountsChanged);
    provider.removeListener?.("chainChanged", chainChanged);
    provider.removeListener?.("disconnect", disconnected);
  };
}

export function currentAccount(): string | null {
  return walletSession?.account ?? null;
}

export function expectedChainId(): string {
  return `0x${Number(chains[config.chainName].id).toString(16)}`;
}

export function currentChainName(): ChainName {
  return config.chainName;
}

type SupportedWallet = { name: string; rdns: string };

const supportedWallets: Record<string, SupportedWallet> = {
  "io.metamask": { name: "MetaMask", rdns: "io.metamask" },
  "io.rabby": { name: "Rabby", rdns: "io.rabby" },
  "com.okex.wallet": { name: "OKX Wallet", rdns: "com.okex.wallet" },
};

type LegacyWalletProvider = Eip1193Provider & {
  isMetaMask?: boolean;
  isRabby?: boolean;
  isOkxWallet?: boolean;
  isOKExWallet?: boolean;
};

const legacyWallets: Array<SupportedWallet & { flags: Array<keyof LegacyWalletProvider> }> = [
  { ...supportedWallets["io.metamask"], flags: ["isMetaMask"] },
  { ...supportedWallets["io.rabby"], flags: ["isRabby"] },
  { ...supportedWallets["com.okex.wallet"], flags: ["isOkxWallet", "isOKExWallet"] },
];

function walletForRdns(rdns: unknown): SupportedWallet | null {
  return typeof rdns === "string" ? supportedWallets[rdns] ?? null : null;
}

function providerAllowed(name: unknown, rdns: unknown): boolean {
  return typeof name === "string" && name.length > 0 && walletForRdns(rdns) !== null;
}

function isEip1193Provider(value: unknown): value is Eip1193Provider {
  return typeof value === "object" && value !== null && typeof (value as { request?: unknown }).request === "function";
}

function legacyWalletForProvider(provider: LegacyWalletProvider): SupportedWallet | null {
  const matches = legacyWallets.filter((wallet) => wallet.flags.some((flag) => provider[flag] === true));
  return matches.length === 1 ? matches[0] : null;
}

const discoveredWallets = new Map<string, WalletOption>();
let registryWindow: Window | null = null;

function installWalletRegistry(): void {
  if (registryWindow === window) return;
  if (registryWindow) registryWindow.removeEventListener("eip6963:announceProvider", announceProvider);
  discoveredWallets.clear();
  registryWindow = window;
  window.addEventListener("eip6963:announceProvider", announceProvider);
}

function announceProvider(event: Event): void {
  const detail = (event as CustomEvent<{ info?: { uuid?: string; name?: string; rdns?: string; icon?: string }; provider?: Eip1193Provider }>).detail;
  const info = detail?.info;
  const identity = walletForRdns(info?.rdns);
  if (!isEip1193Provider(detail?.provider) || !info?.name || !providerAllowed(info.name, info.rdns) || !identity) return;
  const existingProvider = Array.from(discoveredWallets.entries()).find(([, wallet]) => wallet.provider === detail.provider);
  if (existingProvider) {
    if (existingProvider[1].rdns !== identity.rdns) return;
    discoveredWallets.set(existingProvider[0], { ...existingProvider[1], icon: info.icon });
    return;
  }
  const id = info.uuid ?? identity.rdns;
  const existingId = discoveredWallets.get(id);
  if (existingId && existingId.provider !== detail.provider) return;
  discoveredWallets.set(id, {
    id,
    name: identity.name,
    rdns: identity.rdns,
    icon: info.icon,
    provider: detail.provider,
  });
}

export async function discoverWallets(): Promise<WalletOption[]> {
  if (typeof window === "undefined") return [];
  installWalletRegistry();
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise((resolve) => window.setTimeout(resolve, 200));
  for (const [id, wallet] of discoveredWallets) {
    if (id.startsWith("legacy-")) discoveredWallets.delete(id);
  }
  const legacy = (window as Window & { ethereum?: LegacyWalletProvider }).ethereum;
  const legacyIdentity = legacy && isEip1193Provider(legacy) ? legacyWalletForProvider(legacy) : null;
  if (legacy && legacyIdentity && !Array.from(discoveredWallets.values()).some((wallet) => wallet.rdns === legacyIdentity.rdns)) {
    discoveredWallets.set(`legacy-${legacyIdentity.rdns}`, { id: `legacy-${legacyIdentity.rdns}`, ...legacyIdentity, provider: legacy });
  }
  return Array.from(discoveredWallets.values());
}

export async function connectWallet(wallet: WalletOption): Promise<WalletSession> {
  const accounts = await wallet.provider.request({ method: "eth_requestAccounts" });
  const account = Array.isArray(accounts) ? validAccount(accounts[0]) : null;
  if (!account) {
    throw new Error("WALLET_ACCOUNT_UNAVAILABLE");
  }
  const chainId = String(await wallet.provider.request({ method: "eth_chainId" })).toLowerCase();
  selectedProvider = wallet.provider;
  sessionClient = bindSessionClient(account);
  commitWalletSession({ account, chainId, expectedChainId: expectedChainId() });
  installSessionListeners(wallet.provider);
  publishWalletSession();
  return walletSession as WalletSession;
}

export async function switchToConfiguredNetwork(): Promise<string> {
  if (!sessionClient || !walletSession) throw new Error("WALLET_NOT_CONNECTED");
  await sessionClient.connect(config.chainName);
  const chainId = String(await sessionClient.getChainId?.() ?? "").toLowerCase();
  commitWalletSession({ ...walletSession, chainId });
  if (!chainMatches(expectedChainId(), chainId)) throw new Error("WRONG_CHAIN");
  return chainId;
}

export function disconnectWallet(): void {
  teardownSessionListeners();
  writeClient = null;
  sessionClient = null;
  selectedProvider = null;
  commitWalletSession(null);
}

export async function readView(functionName: string, args: unknown[] = []): Promise<string> {
  const result = await readClient.readContract({
    address: requireAddress(),
    functionName,
    args,
    jsonSafeReturn: true,
  });
  return typeof result === "string" ? result : JSON.stringify(result, jsonReplacer);
}

export type JournalReconciliation = {
  record: JournalRecord;
  readback: string | null;
  detail: string;
};

function journalReadbackContext(record: JournalRecord): { caseId: string; revision: string } | null {
  const parts = record.intent.split(":");
  try {
    const args = JSON.parse(record.args_json) as unknown;
    if (!Array.isArray(args)) return null;
    if (parts[0] === "create" && record.method === "create_schema_case" && parts.length === 3) {
      const [, account, nonce] = parts;
      if (account !== record.account || String(args[0]) !== nonce) return null;
      return { caseId: "", revision: (BigInt(record.pre_revision) + 1n).toString() };
    }
    if (parts.length !== 3 || parts[0] !== record.method || !decimalPattern.test(parts[1]) || parts[2] !== record.pre_revision) return null;
    if (String(args[0]) !== parts[1] || String(args[args.length - 1]) !== record.pre_revision) return null;
    return { caseId: parts[1], revision: (BigInt(record.pre_revision) + 1n).toString() };
  } catch {
    return null;
  }
}

export async function reconcileJournalRecord(record: JournalRecord): Promise<JournalReconciliation> {
  if (record.chain !== String(chains[config.chainName].id) || record.contract !== config.contractAddress) {
    const quarantined = await updateJournal(record.reservation, { status: "QUARANTINED" });
    return {
      record: quarantined,
      readback: null,
      detail: "Quarantined: stored chain or contract differs from this runtime; export the retained context and reconcile it in its original environment.",
    };
  }
  if (!record.tx_hash) {
    return { record, readback: null, detail: "No transaction hash retained; keep this signing reservation and do not resubmit blindly." };
  }
  const transaction = await readClient.getTransaction({ hash: record.tx_hash });
  if (!isFinalized(transaction)) {
    const updated = await updateJournal(record.reservation, { status: "RECONCILE" });
    return { record: updated, readback: null, detail: "Transaction is not finalized; the retained hash remains the source of truth." };
  }
  if (transaction.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
    const updated = await updateJournal(record.reservation, { status: "FINALIZED_ERROR" });
    return { record: updated, readback: null, detail: `Finalized execution failed (${transaction.txExecutionResultName ?? "UNKNOWN"}).` };
  }
  const context = journalReadbackContext(record);
  if (!context) {
    const updated = await updateJournal(record.reservation, { status: "RECONCILE" });
    return { record: updated, readback: null, detail: "Stored intent or arguments do not identify a safe historical readback." };
  }
  let caseId = context.caseId;
  if (!caseId) {
    const args = JSON.parse(record.args_json) as unknown[];
    const resolved = await readView("get_id_by_nonce", [record.account, String(args[0])]);
    caseId = decimal(resolved);
    if (caseId === "0") {
      const updated = await updateJournal(record.reservation, { status: "RECONCILE" });
      return { record: updated, readback: null, detail: "The create transaction is finalized, but its case ID is not readable yet." };
    }
  }
  const encoded = await readView("get_version", [BigInt(caseId), BigInt(context.revision)]);
  let parsed: Record<string, any> | null = null;
  try { parsed = encoded === "null" ? null : JSON.parse(encoded) as Record<string, any>; } catch { parsed = null; }
  const operation = parsed?.last_operation as Record<string, unknown> | undefined;
  if (parsed?.revision !== context.revision || operation?.method !== record.method || operation.caller !== record.account) {
    const updated = await updateJournal(record.reservation, { status: "RECONCILE" });
    return { record: updated, readback: encoded, detail: "Finality is confirmed, but stored context does not match the authoritative historical readback." };
  }
  const updated = await updateJournal(record.reservation, { status: "VERIFIED" });
  return { record: updated, readback: encoded, detail: `Verified historical readback at revision ${context.revision}.` };
}

export type WriteRequest = {
  method: string;
  args: unknown[];
  argsForHash: unknown[];
  intent: string;
  preRevision: string;
  preHash: string;
  caseId?: string;
  creator?: string;
  nonce?: string;
  verify: (record: Record<string, any>) => boolean;
};

function isFinalized(transaction: any): boolean {
  return transaction?.statusName === TransactionStatus.FINALIZED || transaction?.status === TransactionStatus.FINALIZED;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function providerRejected(error: unknown): boolean {
  return /reject|denied|cancel/i.test(errorText(error));
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error("WRITE_CANCELLED");
}

function documentHidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let remaining = milliseconds;
    let startedAt = 0;
    let timer: number | null = null;
    let settled = false;

    const cleanup = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
      signal?.removeEventListener("abort", onAbort);
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("WRITE_CANCELLED"));
    };
    const schedule = () => {
      if (settled || documentHidden()) return;
      startedAt = Date.now();
      timer = window.setTimeout(finish, remaining);
    };
    const onVisibility = () => {
      if (documentHidden()) {
        if (timer !== null) {
          window.clearTimeout(timer);
          timer = null;
          remaining = Math.max(0, remaining - (Date.now() - startedAt));
        }
      } else if (timer === null) {
        if (remaining === 0) finish();
        else schedule();
      }
    };

    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
    signal?.addEventListener("abort", onAbort, { once: true });
    if (!documentHidden()) schedule();
  });
}

function isTransientTransportError(error: unknown): boolean {
  const candidate = error as { status?: unknown; statusCode?: unknown; code?: unknown };
  const status = Number(candidate?.status ?? candidate?.statusCode);
  if (status === 408 || status === 425 || status === 429 || status >= 500) return true;
  return /429|busy|gateway|network|rate.?limit|timeout|temporar|transport|unavailable|fetch/i.test(errorText(error));
}

function boundedBackoff(milliseconds: number): number {
  const jitter = Math.floor(Math.random() * Math.min(250, Math.max(1, Math.floor(milliseconds / 10))));
  return Math.min(8000, milliseconds + jitter);
}

async function mark(reservation: string, status: JournalRecord["status"], txHash?: string): Promise<void> {
  try {
    await updateJournal(reservation, { status, ...(txHash === undefined ? {} : { tx_hash: txHash }) });
  } catch {
    // Preserve the original transaction error; the journal remains exportable if storage is available.
  }
}

export async function writeAndVerify(
  request: WriteRequest,
  onProgress: (progress: WriteProgress) => void = () => undefined,
  options: { signal?: AbortSignal } = {},
): Promise<{ record: JournalRecord; caseId: string; encoded: string }> {
  throwIfAborted(options.signal);
  if (!writeClient || !walletSession) throw new Error("WALLET_NOT_CONNECTED");
  if (!walletSession.canWrite || !chainMatches(expectedChainId(), walletSession.chainId)) throw new Error("WRONG_CHAIN");
  const operationSession = walletSession;
  const operationClient = writeClient;
  const operationContext: WriteContext = {
    generation: walletRevision,
    session: operationSession,
    client: operationClient,
  };
  const contextIsCurrent = () => sameWriteContext(operationContext, {
    generation: walletRevision,
    session: walletSession,
    client: writeClient,
  });
  const contract = requireAddress();
  const argsJson = JSON.stringify(request.args, jsonReplacer);
  const argsHash = await sha256Utf8(canonicalJson(request.argsForHash));
  throwIfAborted(options.signal);
  if (!contextIsCurrent()) throw new Error("WALLET_SESSION_CHANGED");
  const operationFingerprint = await sha256Utf8(JSON.stringify([
    String(chains[config.chainName].id),
    contract,
    operationSession.account,
    request.method,
    request.intent,
  ]));
  const reserved = await reserveJournal({
    chain: String(chains[config.chainName].id),
    contract,
    account: operationSession.account,
    method: request.method,
    intent: request.intent,
    operationFingerprint,
    args_json: argsJson,
    pre_revision: request.preRevision,
    pre_hash: await sha256Utf8(request.preHash),
    tx_hash: "",
    status: "SIGNING",
  });
  let txHash = "";
  let reservationRemoved = false;
  const reconcileIfContextChanged = async () => {
    if (!contextIsCurrent()) {
      await mark(reserved.reservation, "RECONCILE", txHash);
      throw new Error("RECONCILE_WALLET_SESSION_CHANGED");
    }
    throwIfAborted(options.signal);
  };
  try {
    throwIfAborted(options.signal);
    if (!contextIsCurrent()) {
      await removeUnsignedJournal(reserved.reservation);
      reservationRemoved = true;
      throw new Error("WALLET_SESSION_CHANGED");
    }
    onProgress({ phase: "WAITING_FOR_WALLET" });
    txHash = String(await operationClient.writeContract({
      address: contract,
      functionName: request.method,
      args: request.args,
      value: 0n,
    }));
    await reconcileIfContextChanged();
    await updateJournal(reserved.reservation, { tx_hash: txHash, status: "SUBMITTED" });
    onProgress({ phase: "SUBMITTED", hash: txHash });

    let transaction: any = null;
    onProgress({ phase: "WAITING_FOR_FINALITY", hash: txHash });
    let lastReceiptError: unknown = null;
    for (const baseDelay of [2000, 4000, 8000]) {
      await wait(lastReceiptError ? boundedBackoff(baseDelay) : baseDelay, options.signal);
      await reconcileIfContextChanged();
      try {
        transaction = await readClient.getTransaction({ hash: txHash });
        lastReceiptError = null;
      } catch (error) {
        if (!isTransientTransportError(error)) throw error;
        lastReceiptError = error;
        continue;
      }
      await reconcileIfContextChanged();
      if (isFinalized(transaction)) break;
    }
    if (!isFinalized(transaction)) {
      await mark(reserved.reservation, "RECONCILE", txHash);
      throw new Error(lastReceiptError ? "RECONCILE_RECEIPT_TRANSPORT" : "RECONCILE_RECEIPT_NOT_FINAL");
    }
    onProgress({ phase: "VERIFYING_EXECUTION", hash: txHash });
    if (transaction.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
      await mark(reserved.reservation, "FINALIZED_ERROR", txHash);
      throw new Error(`FINALIZED_ERROR:${transaction.txExecutionResultName ?? "UNKNOWN"}`);
    }

    let caseId = request.caseId;
    if (!caseId) {
      if (!request.creator || !request.nonce) throw new Error("CREATE_RESOLUTION_INPUT_MISSING");
      const resolved = await readView("get_id_by_nonce", [request.creator, request.nonce]);
      caseId = decimal(resolved);
      if (caseId === "0") throw new Error("RECONCILE_CREATE_ID_MISSING");
    }
    const revision = (BigInt(request.preRevision) + 1n).toString();
    const readAttempts = request.caseId ? 2 : 1;
    let encoded = "null";
    onProgress({ phase: "VERIFYING_READBACK", hash: txHash });
    for (let attempt = 0; attempt < readAttempts; attempt += 1) {
      if (attempt > 0) await wait(4000, options.signal);
      await reconcileIfContextChanged();
      encoded = await readView("get_version", [BigInt(caseId), BigInt(revision)]);
      await reconcileIfContextChanged();
      if (encoded !== "null") {
        const parsed = JSON.parse(encoded) as Record<string, any>;
        if (
          parsed.revision === revision
        ) {
          const operation = parsed.last_operation as Record<string, unknown> | undefined;
          if (
            operation?.method === request.method &&
            operation.caller === operationSession.account &&
            operation.args_hash === argsHash &&
            request.verify(parsed)
          ) {
            const verified = await updateJournal(reserved.reservation, { status: "VERIFIED", tx_hash: txHash });
            onProgress({ phase: "SUCCESS", hash: txHash });
            return { record: verified, caseId, encoded };
          }
        }
      }
    }
    await mark(reserved.reservation, "RECONCILE", txHash);
    throw new Error("RECONCILE_HISTORICAL_READBACK_MISMATCH");
  } catch (error) {
    if (txHash === "") {
      if (reservationRemoved) {
        onProgress({ phase: "FAILED", message: errorText(error) });
      } else if (errorText(error) === "WRITE_CANCELLED") {
        await mark(reserved.reservation, "RECONCILE");
        onProgress({ phase: "RECONCILIATION_REQUIRED", message: errorText(error) });
      } else if (providerRejected(error)) {
        try { await removeUnsignedJournal(reserved.reservation); } catch { /* retain the original wallet error */ }
        onProgress({ phase: "REJECTED", message: errorText(error) });
      } else {
        await mark(reserved.reservation, "RECONCILE");
        onProgress({ phase: "RECONCILIATION_REQUIRED", message: errorText(error) });
      }
    } else if (errorText(error).startsWith("FINALIZED_ERROR:")) {
      onProgress({ phase: "FAILED", hash: txHash, message: errorText(error) });
    } else {
      await mark(reserved.reservation, "RECONCILE", txHash);
      onProgress({ phase: "RECONCILIATION_REQUIRED", hash: txHash, message: errorText(error) });
    }
    throw new Error(errorText(error));
  }
}
