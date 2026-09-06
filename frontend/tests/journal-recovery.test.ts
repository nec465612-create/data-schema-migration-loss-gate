import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTransaction: vi.fn(),
  readContract: vi.fn(),
  createClient: vi.fn(() => ({ getTransaction: mocks.getTransaction, readContract: mocks.readContract })),
}));

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

import { archiveJournalRecord, enumerateJournal, reserveJournal, sha256Utf8 } from "../src/pending";

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
const account = "0x2222222222222222222222222222222222222222";
const baseInput = {
  chain: "4242",
  contract: "0x9999999999999999999999999999999999999999",
  account,
  method: "lock_schemas",
  intent: "lock_schemas:1:0",
  args_json: "[\"1\",\"0\"]",
  pre_revision: "0",
  pre_hash: "a".repeat(64),
  tx_hash: `0x${"b".repeat(64)}`,
  status: "SUBMITTED" as const,
};

beforeEach(() => {
  store.clear();
  mocks.getTransaction.mockReset();
  mocks.readContract.mockReset();
  Object.defineProperty(globalThis, "localStorage", { value: store, configurable: true });
  Object.defineProperty(globalThis, "navigator", { value: { locks: { request: async (_name: string, _options: unknown, work: () => Promise<unknown>) => work() } }, configurable: true });
});

describe("journal recovery reconciliation", () => {
  it("decodes nested case JSON returned by the contract", () => {
    expect(contract.parseCaseRecord(JSON.stringify({
      phase: "BASE_DRAFT",
      base: JSON.stringify({ old: [{ id: "name" }], new: [{ id: "name" }] }),
      response: "{}",
      result: "{}",
    }))).toMatchObject({ base: { old: [{ id: "name" }] }, response: {}, result: {} });
  });

  it("reconciles a retained transaction against finalized status and historical readback", async () => {
    const fingerprint = await sha256Utf8(JSON.stringify([baseInput.chain, baseInput.contract, baseInput.account, baseInput.method, baseInput.intent]));
    const record = await reserveJournal({ ...baseInput, operationFingerprint: fingerprint });
    const readback = JSON.stringify({
      revision: "1",
      last_operation: { method: "lock_schemas", caller: account },
    });
    mocks.getTransaction.mockResolvedValue({ statusName: "FINALIZED", txExecutionResultName: "FINISHED_WITH_RETURN" });
    mocks.readContract.mockResolvedValue(readback);

    const result = await contract.reconcileJournalRecord(record);

    expect(result.record.status).toBe("VERIFIED");
    expect(result.readback).toBe(readback);
    expect(mocks.getTransaction).toHaveBeenCalledWith({ hash: baseInput.tx_hash });
    expect(mocks.readContract).toHaveBeenCalledWith(expect.objectContaining({ functionName: "get_version", args: [1n, 1n] }));
    expect(enumerateJournal()[0].status).toBe("VERIFIED");
  });

  it("recovers a missing submitted record only after args-hash and readback verification", async () => {
    const request = {
      method: "put_mapping",
      args: [4n, JSON.stringify({ mapping: [{ old_id: "name", new_id: "name", transform: "IDENTITY" }], defaults: [] }), 2n],
      argsForHash: ["4", { mapping: [{ old_id: "name", new_id: "name", transform: "IDENTITY" }], defaults: [] }, "2"],
      intent: "put_mapping:4:2",
      preRevision: "2",
      preHash: "base-state",
      caseId: "4",
      verify: (record: Record<string, any>) => record.phase === "RESPONSE_DRAFT" && record.response?.mapping,
    };
    const argsHash = await sha256Utf8(contract.canonicalJson(["4", { mapping: [{ old_id: "name", new_id: "name", transform: "IDENTITY" }], defaults: [] }, "2"]));
    const readback = JSON.stringify({ revision: "3", phase: "RESPONSE_DRAFT", response: { mapping: [{ old_id: "name", new_id: "name", transform: "IDENTITY" }] }, last_operation: { method: "put_mapping", caller: account, args_hash: argsHash } });
    mocks.getTransaction.mockResolvedValue({ statusName: "FINALIZED", txExecutionResultName: "FINISHED_WITH_RETURN", from_address: account });
    mocks.readContract.mockResolvedValue(readback);

    const result = await contract.recoverSubmittedWrite(request, account, `0x${"f".repeat(64)}`);

    expect(result.record).toMatchObject({ status: "VERIFIED", tx_hash: `0x${"f".repeat(64)}` });
    expect(result.caseId).toBe("4");
    expect(result.encoded).toBe(readback);
  });

  it("accepts a successful Studio leader receipt", async () => {
    const fingerprint = await sha256Utf8(JSON.stringify([baseInput.chain, baseInput.contract, baseInput.account, baseInput.method, baseInput.intent]));
    const record = await reserveJournal({ ...baseInput, operationFingerprint: fingerprint });
    const readback = JSON.stringify({ revision: "1", last_operation: { method: "lock_schemas", caller: account } });
    mocks.getTransaction.mockResolvedValue({
      statusName: "FINALIZED",
      consensus_data: { leader_receipt: [{ execution_result: "SUCCESS", vote: null }] },
    });
    mocks.readContract.mockResolvedValue(readback);

    const result = await contract.reconcileJournalRecord(record);

    expect(result.record.status).toBe("VERIFIED");
    expect(result.readback).toBe(readback);
  });

  it("reports the Studio rollback payload", async () => {
    const fingerprint = await sha256Utf8(JSON.stringify([baseInput.chain, baseInput.contract, baseInput.account, baseInput.method, baseInput.intent]));
    const record = await reserveJournal({ ...baseInput, operationFingerprint: fingerprint });
    mocks.getTransaction.mockResolvedValue({
      statusName: "FINALIZED",
      consensus_data: { leader_receipt: [{ execution_result: "ERROR", vote: null, result: { payload: "DISTINCT_ACTORS" } }] },
    });

    const result = await contract.reconcileJournalRecord(record);

    expect(result.record.status).toBe("FINALIZED_ERROR");
    expect(result.detail).toContain("DISTINCT_ACTORS");
  });

  it("reconciles a create record using its stored account when intent text is stale", async () => {
    const creator = "0xc3a438eba22c439cbce393f3f8c79bfcac8b27c6";
    const nonce = "fb76cb4395c3c583f9b34e2119ce4715";
    const input = {
      ...baseInput,
      account: creator,
      method: "create_schema_case",
      intent: `create:${account}:${nonce}`,
      args_json: JSON.stringify([nonce, "0xe8d6c55838c39301c11d54fc9a38b9de298329f6", "{}", "0"]),
    };
    const fingerprint = await sha256Utf8(JSON.stringify([input.chain, input.contract, input.account, input.method, input.intent]));
    const record = await reserveJournal({ ...input, operationFingerprint: fingerprint });
    const readback = JSON.stringify({ revision: "1", last_operation: { method: "create_schema_case", caller: creator } });
    mocks.getTransaction.mockResolvedValue({ statusName: "FINALIZED", txExecutionResultName: "FINISHED_WITH_RETURN" });
    mocks.readContract.mockResolvedValueOnce("4").mockResolvedValueOnce(readback);

    const result = await contract.reconcileJournalRecord(record);

    expect(result.record.status).toBe("VERIFIED");
    expect(result.readback).toBe(readback);
  });

  it("retains reconciliation when finality is not available", async () => {
    const fingerprint = await sha256Utf8(JSON.stringify([baseInput.chain, baseInput.contract, baseInput.account, baseInput.method, baseInput.intent]));
    const record = await reserveJournal({ ...baseInput, operationFingerprint: fingerprint });
    mocks.getTransaction.mockResolvedValue({ statusName: "PENDING" });

    const result = await contract.reconcileJournalRecord(record);

    expect(result.record.status).toBe("RECONCILE");
    expect(result.readback).toBeNull();
    expect(mocks.readContract).not.toHaveBeenCalled();
  });

  it("quarantines a mixed-journal record from another contract without querying it", async () => {
    const currentFingerprint = await sha256Utf8(JSON.stringify([baseInput.chain, baseInput.contract, baseInput.account, baseInput.method, baseInput.intent]));
    const foreignInput = { ...baseInput, contract: "0x8888888888888888888888888888888888888888", tx_hash: `0x${"c".repeat(64)}` };
    const foreignFingerprint = await sha256Utf8(JSON.stringify([foreignInput.chain, foreignInput.contract, foreignInput.account, foreignInput.method, foreignInput.intent]));
    const current = await reserveJournal({ ...baseInput, operationFingerprint: currentFingerprint });
    const foreign = await reserveJournal({ ...foreignInput, operationFingerprint: foreignFingerprint });

    const result = await contract.reconcileJournalRecord(foreign);

    expect(result.record.status).toBe("QUARANTINED");
    expect(result.detail).toContain("Quarantined");
    expect(mocks.getTransaction).not.toHaveBeenCalled();
    await expect(archiveJournalRecord(foreign.reservation, true)).rejects.toThrow("ARCHIVE_NOT_ALLOWED");
    expect(enumerateJournal()).toEqual(expect.arrayContaining([
      expect.objectContaining({ reservation: current.reservation, status: "SUBMITTED" }),
      expect.objectContaining({ reservation: foreign.reservation, status: "QUARANTINED" }),
    ]));
  });
});
