export const JOURNAL_PREFIX = "glj1:";
export const JOURNAL_INDEX = "glj1:index";
const LOCK_NAME = "genlayer-journal-v1";
const RESERVATION_RE = /^[0-9a-f]{32}$/;
const HEX64_RE = /^[0-9a-f]{64}$/;

export type JournalStatus =
  | "SIGNING"
  | "SUBMITTED"
  | "RECONCILE"
  | "VERIFIED"
  | "FINALIZED_ERROR";

export type JournalRecord = {
  v: 1;
  reservation: string;
  chain: string;
  contract: string;
  account: string;
  method: string;
  intent: string;
  args_json: string;
  pre_revision: string;
  pre_hash: string;
  tx_hash: string;
  status: JournalStatus;
  created_ms: number;
};

type JournalReservation = Omit<JournalRecord, "v" | "reservation" | "created_ms"> & {
  operationFingerprint: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function journalKey(reservation: string): string {
  if (!RESERVATION_RE.test(reservation)) throw new Error("BAD_RESERVATION");
  return JOURNAL_PREFIX + reservation;
}

export function validateJournalRecord(value: unknown): JournalRecord {
  if (!isRecord(value) || value.v !== 1) throw new Error("CORRUPT_JOURNAL");
  const expectedKeys = [
    "v", "reservation", "chain", "contract", "account", "method", "intent",
    "args_json", "pre_revision", "pre_hash", "tx_hash", "status", "created_ms",
  ].sort();
  if (Object.keys(value).sort().join("|") !== expectedKeys.join("|")) throw new Error("CORRUPT_JOURNAL");
  const textKeys = [
    "reservation",
    "chain",
    "contract",
    "account",
    "method",
    "intent",
    "args_json",
    "pre_revision",
    "pre_hash",
    "tx_hash",
    "status",
  ] as const;
  for (const key of textKeys) {
    if (typeof value[key] !== "string") throw new Error("CORRUPT_JOURNAL");
  }
  const reservation = value.reservation as string;
  const status = value.status as string;
  if (!RESERVATION_RE.test(reservation)) throw new Error("CORRUPT_JOURNAL");
  if (!/^0x[0-9a-f]{40}$/.test(value.contract as string) || !/^0x[0-9a-f]{40}$/.test(value.account as string)) {
    throw new Error("CORRUPT_JOURNAL");
  }
  if (!/^[0-9]+$/.test(value.chain as string) || !/^(0|[1-9][0-9]*)$/.test(value.pre_revision as string)) {
    throw new Error("CORRUPT_JOURNAL");
  }
  if (new TextEncoder().encode(value.method as string).length > 48 || new TextEncoder().encode(value.intent as string).length > 160 || new TextEncoder().encode(value.args_json as string).length > 18000) {
    throw new Error("CORRUPT_JOURNAL");
  }
  if (!HEX64_RE.test(value.pre_hash as string) || !(/^$|^0x[0-9a-f]{64}$/.test(value.tx_hash as string))) {
    throw new Error("CORRUPT_JOURNAL");
  }
  if (!Number.isSafeInteger(value.created_ms)) {
    throw new Error("CORRUPT_JOURNAL");
  }
  if (!["SIGNING", "SUBMITTED", "RECONCILE", "VERIFIED", "FINALIZED_ERROR"].includes(status)) {
    throw new Error("CORRUPT_JOURNAL");
  }
  return value as JournalRecord;
}

function storage(): Storage {
  if (typeof localStorage === "undefined") throw new Error("JOURNAL_STORAGE_UNAVAILABLE");
  return localStorage;
}

function lockApi(): LockManager {
  if (typeof navigator === "undefined" || !navigator.locks) {
    throw new Error("JOURNAL_LOCK_UNAVAILABLE");
  }
  return navigator.locks;
}

async function withJournalLock<T>(work: () => Promise<T>): Promise<T> {
  const locks = lockApi();
  return locks.request(LOCK_NAME, { mode: "exclusive" }, work);
}

function parseStoredRecord(key: string, raw: string): JournalRecord {
  try {
    const parsed: unknown = JSON.parse(raw);
    const record = validateJournalRecord(parsed);
    if (journalKey(record.reservation) !== key) throw new Error("CORRUPT_JOURNAL");
    return record;
  } catch {
    throw new Error("CORRUPT_JOURNAL");
  }
}

export function enumerateJournal(): JournalRecord[] {
  const store = storage();
  const records: JournalRecord[] = [];
  for (let index = 0; index < store.length; index += 1) {
    const key = store.key(index);
    if (!key || !key.startsWith(JOURNAL_PREFIX) || key === JOURNAL_INDEX) continue;
    const raw = store.getItem(key);
    if (raw === null) throw new Error("CORRUPT_JOURNAL");
    records.push(parseStoredRecord(key, raw));
  }
  return records.sort((a, b) => a.created_ms - b.created_ms);
}

function writeIndex(store: Storage, records: JournalRecord[]): void {
  store.setItem(JOURNAL_INDEX, JSON.stringify(records.map((record) => journalKey(record.reservation))));
}

function randomReservation(): string {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error("JOURNAL_RANDOM_UNAVAILABLE");
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Utf8(value: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) throw new Error("CRYPTO_UNAVAILABLE");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function reserveJournal(input: JournalReservation): Promise<JournalRecord> {
  return withJournalLock(async () => {
    const store = storage();
    const records = enumerateJournal();
    const active = records.filter((record) =>
      ["SIGNING", "SUBMITTED", "RECONCILE"].includes(record.status),
    );
    const existingFingerprints = await Promise.all(
      active.map((record) =>
        sha256Utf8(JSON.stringify([
          record.chain,
          record.contract,
          record.account,
          record.method,
          record.intent,
        ])),
      ),
    );
    const inputCaseId = input.intent.startsWith("create:") ? null : input.intent.split(":")[1] ?? null;
    const hasSameCase = inputCaseId !== null && active.some((record) => {
      if (record.chain !== input.chain || record.contract !== input.contract) return false;
      return !record.intent.startsWith("create:") && record.intent.split(":")[1] === inputCaseId;
    });
    if (existingFingerprints.includes(input.operationFingerprint) || hasSameCase) {
      throw new Error("PENDING_OPERATION_EXISTS");
    }
    if (records.length >= 32) throw new Error("JOURNAL_CAPACITY");
    const now = Date.now();
    const { operationFingerprint: _operationFingerprint, ...recordInput } = input;
    const record: JournalRecord = {
      ...recordInput,
      v: 1,
      reservation: randomReservation(),
      created_ms: now,
    };
    store.setItem(journalKey(record.reservation), JSON.stringify(record));
    writeIndex(store, [...records, record]);
    return record;
  });
}

export async function updateJournal(
  reservation: string,
  update: Partial<Pick<JournalRecord, "tx_hash" | "status">>,
): Promise<JournalRecord> {
  return withJournalLock(async () => {
    const store = storage();
    const key = journalKey(reservation);
    const raw = store.getItem(key);
    if (raw === null) throw new Error("JOURNAL_NOT_FOUND");
    const current = parseStoredRecord(key, raw);
    const next = validateJournalRecord({ ...current, ...update });
    store.setItem(key, JSON.stringify(next));
    return next;
  });
}

export async function removeUnsignedJournal(reservation: string): Promise<void> {
  return withJournalLock(async () => {
    const store = storage();
    const key = journalKey(reservation);
    const raw = store.getItem(key);
    if (raw === null) throw new Error("JOURNAL_NOT_FOUND");
    const record = parseStoredRecord(key, raw);
    if (record.status !== "SIGNING" || record.tx_hash !== "") throw new Error("UNSIGNED_RESERVATION_NOT_REMOVABLE");
    store.removeItem(key);
    writeIndex(store, enumerateJournal());
  });
}

export async function rebuildJournalIndex(): Promise<JournalRecord[]> {
  return withJournalLock(async () => {
    const store = storage();
    const records = enumerateJournal();
    writeIndex(store, records);
    return records;
  });
}

export async function archiveJournalRecord(reservation: string, exported: boolean): Promise<void> {
  if (!exported) throw new Error("EXPORT_REQUIRED");
  return withJournalLock(async () => {
    const store = storage();
    const key = journalKey(reservation);
    const raw = store.getItem(key);
    if (raw === null) throw new Error("JOURNAL_NOT_FOUND");
    const record = parseStoredRecord(key, raw);
    if (!["VERIFIED", "FINALIZED_ERROR"].includes(record.status)) {
      throw new Error("ARCHIVE_NOT_ALLOWED");
    }
    store.removeItem(key);
    writeIndex(store, enumerateJournal());
  });
}
