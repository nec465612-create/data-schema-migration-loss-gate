export const WRITE_PHASES = [
  "IDLE",
  "WAITING_FOR_WALLET",
  "SUBMITTED",
  "WAITING_FOR_FINALITY",
  "VERIFYING_EXECUTION",
  "VERIFYING_READBACK",
  "SUCCESS",
  "REJECTED",
  "FAILED",
  "RECONCILIATION_REQUIRED",
] as const;

export type WritePhase = typeof WRITE_PHASES[number];

export type WriteProgress = {
  phase: WritePhase;
  hash?: string;
  message?: string;
};

export const PROGRESS_COPY: Record<WritePhase, { title: string; detail: string }> = {
  IDLE: { title: "Ready", detail: "No transaction is in progress." },
  WAITING_FOR_WALLET: { title: "Waiting for wallet", detail: "Review and confirm the transaction in your wallet." },
  SUBMITTED: { title: "Transaction submitted", detail: "The transaction hash is retained in the local journal." },
  WAITING_FOR_FINALITY: { title: "Waiting for finality", detail: "Waiting for a finalized transaction status." },
  VERIFYING_EXECUTION: { title: "Verifying execution", detail: "Checking finalized execution and return status." },
  VERIFYING_READBACK: { title: "Verifying historical readback", detail: "Checking the exact post-state and operation fingerprint." },
  SUCCESS: { title: "Verified", detail: "Finality, execution, and authoritative readback all passed." },
  REJECTED: { title: "Wallet rejected", detail: "No transaction was accepted by the wallet." },
  FAILED: { title: "Finalized execution failed", detail: "The transaction finalized, but execution did not return success." },
  RECONCILIATION_REQUIRED: { title: "Reconciliation required", detail: "The outcome is uncertain. Reconcile the retained hash before any retry." },
};

const PENDING_PHASES = new Set<WritePhase>([
  "WAITING_FOR_WALLET",
  "SUBMITTED",
  "WAITING_FOR_FINALITY",
  "VERIFYING_EXECUTION",
  "VERIFYING_READBACK",
]);

export function isPendingPhase(phase: WritePhase): boolean {
  return PENDING_PHASES.has(phase);
}
