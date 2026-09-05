# Stage 1/2 Implementation Adaptation

Status: BUILD IMPLEMENTATION — no deployment or live-chain approval claimed.

## Exact baseline

- Candidate: C3, `PROJECT`
- Stage 1 SHA-256: `AC7AF33D7EEE958472FD9E2DCB88DA12C46C786C9E98691231D5FDB936E28B9D`
- Stage 2 SHA-256: `A44237E81EB8C9336F3AC74444BFE7972D2DF165377DEF9A08383559DFAA02FF`
- Canonical research package SHA-256: `3464E830908CB1D87504057567242D36BDCD0C4FD59934B7D22F6482C6799ED2`

The research approval is Stage 1/2 handoff only. It does not authorize deployment, contract writes, or release.

## Verified implementation adaptations

### Direct Mode Address representation

The installed Direct Mode runner supplies fixture addresses as 20-byte values while the production ABI uses `Address`. The contract converts either representation to lowercase `0x`-hex before storage, actor comparison, index keys, or argument hashing. This preserves the Stage 2 canonical address rule and removes a local-only false `BAD_ADDRESS` result.

### Structural and semantic reduction

The C3 table reducer deterministically fixes `DROP` as `SKIP_DROP` and all structurally invalid transformations as `DIFFERENT`. Only structurally compatible rows are sent to the custom nondeterministic semantic assessment. The validator independently re-runs the same bounded result and compares the canonical result vector. `UNKNOWN` remains globally `UNRESOLVED`; no model output can turn a structural loss into success.

### Browser dependency names

The installed current SDK package is `genlayer-js` (not a separate `@genlayer-js/sdk` package). The frontend uses the SDK's read client, wallet-provider client, transaction status and execution-result APIs. No contract address is bundled; `VITE_CONTRACT_ADDRESS` is fail-closed until an exact deployment is available.

## Preserved binding requirements

- Exact persistent storage and public method signatures from Stage 2.
- Canonical JSON, strict field/default/mapping validation, CAS revisions and immutable history.
- `gl.vm.run_nondet_unsafe` wrapper with a bounded primitive result.
- `INTENTIONALLY FROZEN` classification; no upgrade method or upgrade storage.
- Separate Studio and browser RPC budgets.
- `glj1:` random reservation keys, separate operation fingerprint comparison, Web Locks, orphan recovery and no automatic resubmission.
- Final browser success only after finalized execution success and exact historical `get_version` readback.

## Local evidence

The exact commands and current results are recorded in `PRE_DEPLOY-READINESS.md`. Local PASS is not Studio/account/reviewer/live-E2E evidence.
