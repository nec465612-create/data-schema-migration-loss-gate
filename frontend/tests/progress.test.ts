import { describe, expect, it } from "vitest";

import { isPendingPhase, PROGRESS_COPY, WRITE_PHASES } from "../src/progress";

describe("transaction progress vocabulary", () => {
  it("defines copy for every required lifecycle state", () => {
    expect(Object.keys(PROGRESS_COPY).sort()).toEqual([...WRITE_PHASES].sort());
    for (const phase of WRITE_PHASES) {
      expect(PROGRESS_COPY[phase].title).not.toBe("");
      expect(PROGRESS_COPY[phase].detail).not.toBe("");
    }
  });

  it("marks only wallet/finality/verification states as pending", () => {
    expect(isPendingPhase("WAITING_FOR_WALLET")).toBe(true);
    expect(isPendingPhase("SUBMITTED")).toBe(true);
    expect(isPendingPhase("WAITING_FOR_FINALITY")).toBe(true);
    expect(isPendingPhase("VERIFYING_EXECUTION")).toBe(true);
    expect(isPendingPhase("VERIFYING_READBACK")).toBe(true);
    for (const phase of ["IDLE", "SUCCESS", "REJECTED", "FAILED", "RECONCILIATION_REQUIRED"] as const) {
      expect(isPendingPhase(phase)).toBe(false);
    }
  });
});
