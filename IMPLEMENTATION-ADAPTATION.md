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

### Canonical case-record serialization

Stage 2 requires every persisted case `id`, `revision`, and `parent` to be canonical decimal strings in JSON transport. The implementation keeps numeric values only for typed storage keys, counters, and ABI arguments; record/history JSON now writes and verifies those three fields as strings. This is a corrective delta for PRE_DEPLOY finding F-001, with exact string assertions in `tests/test_contract.py` and strict frontend readback matching.

### CRLF input normalization

Stage 2 requires CRLF input to normalize to LF before validation and freezing. `_parse_json` now normalizes raw JSON line endings and recursively normalizes parsed string values before any schema validation or canonical storage. A regression covers CRLF JSON envelopes, CRLF field text, and replacement with LF-equivalent input.

### F-003 multi-field mapping editor

The mapping editor now initializes one row for every old field, supports adding any remaining old-field row up to the Stage 2 cap, exposes old-field selection, and disables a new-field target already selected by another non-DROP row. A pure regression suite covers multi-field initialization and duplicate-target availability. This is a frontend-only correction at source commit `c26b1c5b0eff3fd2652b87bb1924696a5e805b47`; the contract ABI, storage, and transaction envelope are unchanged.

### F-004 wrong-chain fail-closed guard

The frontend now treats an absent or mismatched chain as invalid, disables Create case until the configured chain is confirmed, and applies the same guard centrally in `writeAndVerify` before journal reservation or wallet signing. Connect and successful network switching update the bound chain; unavailable switch readback fails closed. `frontend/tests/network.test.ts` covers matching, case variation, mismatch, and missing chain IDs. This is a frontend-only correction at source commit `0f4ecfdafddac361f70d5630417704a451c6da9b`; the contract ABI, storage, and transaction envelope are unchanged.

### F-005 wallet-session event binding

The frontend now owns one wallet-session snapshot for account, chain, and `canWrite`, subscribes the selected provider to `accountsChanged`, `chainChanged`, and `disconnect`, rebinds the session client on valid account changes, clears write capability on wrong-chain events, and tears down listeners on disconnect or replacement. App controls subscribe to that snapshot, and a regression covers account rebinding, wrong-chain disablement, matching-chain recovery, listener teardown, and disconnect. This is a frontend-only correction at source commit `f0cce24ee0040998543820e064e460c60430a76a`; the contract ABI, storage, and transaction envelope are unchanged.

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
