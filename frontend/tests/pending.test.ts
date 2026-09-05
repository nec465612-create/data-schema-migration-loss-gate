import { beforeEach, describe, expect, it } from "vitest";

import {
  enumerateJournal,
  JOURNAL_INDEX,
  journalKey,
  archiveJournalRecord,
  rebuildJournalIndex,
  reserveJournal,
  sha256Utf8,
  serializeJournalRecord,
  updateJournal,
} from "../src/pending";

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
Object.defineProperty(globalThis, "localStorage", { value: store, configurable: true });
Object.defineProperty(globalThis, "navigator", {
  value: { locks: { request: async (_name: string, _options: unknown, work: () => Promise<unknown>) => work() } },
  configurable: true,
});

const baseInput = {
  chain: "4242",
  contract: "0x1111111111111111111111111111111111111111",
  account: "0x2222222222222222222222222222222222222222",
  method: "lock_schemas",
  intent: "lock_schemas:1:1",
  args_json: "[\"1\",\"1\"]",
  pre_revision: "1",
  pre_hash: "a".repeat(64),
  tx_hash: "",
  status: "SIGNING" as const,
};

describe("crash-recoverable journal", () => {
  beforeEach(() => store.clear());

  it("uses a random reservation key and blocks the same pending intent", async () => {
    const fingerprint = await sha256Utf8(JSON.stringify([baseInput.chain, baseInput.contract, baseInput.account, baseInput.method, baseInput.intent]));
    const record = await reserveJournal({ ...baseInput, operationFingerprint: fingerprint });
    expect(record.reservation).toMatch(/^[0-9a-f]{32}$/);
    expect(record.created_ms).toMatch(/^(0|[1-9][0-9]*)$/);
    expect(journalKey(record.reservation)).toBe(`glj1:${record.reservation}`);
    expect(JSON.parse(store.getItem(journalKey(record.reservation))!).operationFingerprint).toBeUndefined();
    await expect(reserveJournal({ ...baseInput, operationFingerprint: fingerprint })).rejects.toThrow("PENDING_OPERATION_EXISTS");
    const txHash = `0x${"b".repeat(64)}`;
    await updateJournal(record.reservation, { status: "SUBMITTED", tx_hash: txHash });
    expect(enumerateJournal()[0].tx_hash).toBe(txHash);
    await expect(updateJournal(record.reservation, { tx_hash: `0x${"c".repeat(64)}` })).rejects.toThrow("IMMUTABLE_TX_HASH");
    await expect(reserveJournal({ ...baseInput, method: "put_mapping", intent: "put_mapping:1:2", operationFingerprint: await sha256Utf8(JSON.stringify([baseInput.chain, baseInput.contract, baseInput.account, "put_mapping", "put_mapping:1:2"])) })).rejects.toThrow("PENDING_OPERATION_EXISTS");
  });

  it("recovers an orphan record after a reload instead of trusting a stale index", async () => {
    const fingerprint = await sha256Utf8(JSON.stringify([baseInput.chain, baseInput.contract, baseInput.account, baseInput.method, baseInput.intent]));
    const record = await reserveJournal({ ...baseInput, operationFingerprint: fingerprint });
    store.setItem(JOURNAL_INDEX, "[]");
    const records = await rebuildJournalIndex();
    expect(records).toHaveLength(1);
    expect(JSON.parse(store.getItem(JOURNAL_INDEX)!)).toEqual([journalKey(record.reservation)]);
    expect(enumerateJournal()).toEqual([record]);
  });

  it("enforces the bounded journal quota", async () => {
    for (let index = 0; index < 32; index += 1) {
      const intent = `create:${baseInput.account}:${index}`;
      const fingerprint = await sha256Utf8(JSON.stringify([baseInput.chain, baseInput.contract, baseInput.account, "create_schema_case", intent]));
      await reserveJournal({ ...baseInput, method: "create_schema_case", intent, args_json: JSON.stringify([String(index)]), operationFingerprint: fingerprint });
    }
    const fingerprint = await sha256Utf8(JSON.stringify([baseInput.chain, baseInput.contract, baseInput.account, "create_schema_case", "create:0x2222222222222222222222222222222222222222:overflow"]));
    await expect(reserveJournal({ ...baseInput, method: "create_schema_case", intent: "create:0x2222222222222222222222222222222222222222:overflow", args_json: "[\"overflow\"]", operationFingerprint: fingerprint })).rejects.toThrow("JOURNAL_CAPACITY");
  });

  it("requires an exported record before archive and emits a portable export", async () => {
    const fingerprint = await sha256Utf8(JSON.stringify([baseInput.chain, baseInput.contract, baseInput.account, baseInput.method, baseInput.intent]));
    const record = await reserveJournal({ ...baseInput, operationFingerprint: fingerprint });
    const verified = await updateJournal(record.reservation, { tx_hash: `0x${"b".repeat(64)}`, status: "VERIFIED" });
    expect(serializeJournalRecord(verified)).toContain('"format": "genlayer-journal-v1"');
    await expect(archiveJournalRecord(record.reservation, false)).rejects.toThrow("EXPORT_REQUIRED");
    await archiveJournalRecord(record.reservation, true);
    expect(enumerateJournal()).toHaveLength(0);
  });
});
