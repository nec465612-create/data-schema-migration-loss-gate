export type RpcTelemetryEvent = {
  kind: "rpc" | "scope";
  source?: "http" | "provider";
  method?: string;
  scope: string;
  at: number;
  ok?: boolean;
  status?: number;
  durationMs?: number;
  error?: string;
};

export const rpcTelemetryStorageKey = "dsm-lg-rpc-telemetry-v1";
let activeScope = "unscoped";
let installedFetch: typeof fetch | null = null;
const providerWrappers = new WeakMap<object, Eip1193Like>();

type Eip1193Like = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
};

function append(event: RpcTelemetryEvent): void {
  try {
    if (typeof sessionStorage === "undefined") return;
    const current = readRpcTelemetry();
    current.push(event);
    sessionStorage.setItem(rpcTelemetryStorageKey, JSON.stringify(current.slice(-2000)));
  } catch {
    // Telemetry must never affect wallet or contract behavior.
  }
}

export function readRpcTelemetry(): RpcTelemetryEvent[] {
  try {
    const raw = typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(rpcTelemetryStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as RpcTelemetryEvent[] : [];
  } catch {
    return [];
  }
}

export function clearRpcTelemetry(): void {
  try { sessionStorage?.removeItem(rpcTelemetryStorageKey); } catch { /* best effort */ }
}

export function beginRpcScope(scope: string): string {
  const previous = activeScope;
  activeScope = scope;
  append({ kind: "scope", scope, at: Date.now() });
  return previous;
}

export function endRpcScope(previous: string): void {
  const scope = activeScope;
  append({ kind: "scope", scope, at: Date.now() });
  activeScope = previous;
}

export async function withRpcScope<T>(scope: string, action: () => Promise<T>): Promise<T> {
  const previous = beginRpcScope(scope);
  try { return await action(); }
  finally { endRpcScope(previous); }
}

export function installRpcFetchTelemetry(): void {
  if (typeof globalThis.fetch !== "function" || installedFetch === globalThis.fetch) return;
  const originalFetch = globalThis.fetch.bind(globalThis);
  const observedFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const body = typeof init?.body === "string" ? init.body : "";
    let method = "";
    try {
      const parsed = JSON.parse(body) as { jsonrpc?: string; method?: string };
      if (parsed.jsonrpc === "2.0" && typeof parsed.method === "string") method = parsed.method;
    } catch { /* non-RPC fetch */ }
    if (!method) return originalFetch(input, init);
    const scope = activeScope;
    const started = Date.now();
    try {
      const response = await originalFetch(input, init);
      append({ kind: "rpc", source: "http", method, scope, at: started, ok: response.ok, status: response.status, durationMs: Date.now() - started });
      return response;
    } catch (error) {
      append({ kind: "rpc", source: "http", method, scope, at: started, ok: false, durationMs: Date.now() - started, error: String(error) });
      throw error;
    }
  }) as typeof fetch;
  installedFetch = observedFetch;
  globalThis.fetch = observedFetch;
}

export function instrumentProvider<T extends Eip1193Like>(provider: T): T {
  const existing = providerWrappers.get(provider as object);
  if (existing) return existing as T;
  const wrapped: Eip1193Like = {
    async request(args) {
      const scope = activeScope;
      const started = Date.now();
      try {
        const result = await provider.request(args);
        append({ kind: "rpc", source: "provider", method: args.method, scope, at: started, ok: true, durationMs: Date.now() - started });
        return result;
      } catch (error) {
        append({ kind: "rpc", source: "provider", method: args.method, scope, at: started, ok: false, durationMs: Date.now() - started, error: String(error) });
        throw error;
      }
    },
    on: provider.on?.bind(provider),
    removeListener: provider.removeListener?.bind(provider),
  };
  providerWrappers.set(provider as object, wrapped);
  return wrapped as T;
}
