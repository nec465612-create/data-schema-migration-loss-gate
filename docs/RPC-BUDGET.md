# RPC Budget Matrix

`DOCUMENT_STATUS: PRE_DEPLOY_PLANNED_NOT_LIVE_MEASURED`

This matrix is bound to the C3 Stage 2 frontend flow. It is a budget and test plan, not evidence of Studio traffic. The selected Studio account is recorded below; no Studio transaction has been sent.

## Applicability

RPC_BUDGET_REVISION: C3-STAGE2-FRONTEND-FLOW
OFFICIAL_DOCS_CHECKED: STAGE2-AND-CURRENT-RUNTIME-BASELINE
STUDIO_SCOPE: APPLICABLE
FRONTEND_SCOPE: APPLICABLE

## FRONTEND RPC BUDGET MATRIX

FRONTEND_MATRIX_STATUS: COMPLETE
MULTI_CLIENT_JUSTIFICATION: NOT_REQUIRED

| Screen/workflow | Request source | RPC method | Trigger | Cache key / TTL | In-flight dedupe | Invalidation | Poll interval / attempts | Retry/backoff/cancel | Planned maximum | Transaction count | Terminal/readback condition |
|---|---|---|---|---|---|---|---|---|---:|---:|---|
| Initial landing | App render | none | Browser load | none | n/a | n/a | none | none | 0 | 0 | No chain request |
| Wallet discovery and connect | Canonical wallet-session store | EIP-6963; eth_requestAccounts; eth_chainId | Explicit Discover wallets or Connect | none | One shared session | Account or chain event | none | User action only; teardown cancellation | 2 | 0 | Connected session or recoverable error |
| Load case IDs | Shared read client | list_cases | Explicit Load IDs | chain/contract/list_cases/[1,4]; no cache | In-flight dedupe | Account/network/contract change | none | Bounded; cancel on teardown | 1 | 0 | Returned case IDs or recoverable error |
| Open case detail | Shared read client | get_case | Explicit case selection | chain/contract/get_case/[id]; no cache | In-flight dedupe | Account/network/contract change | none | Bounded; cancel on teardown | 1 | 0 | Decoded case or recoverable error |
| One write workflow | Write coordinator | create_schema_case/replace_schemas/lock_schemas/put_mapping/freeze_mapping/evaluate_migration | Explicit action button | No cache for consequential state | One journal intent and coordinator | After write/account/network change | 2/4/8s; up to 3 | Bounded Retry-After/backoff; cancel hidden or teardown | 6 | 1 | FINALIZED plus semantic SUCCESS and authoritative readback |
| Retry after uncertainty | Retained journal | retry_migration only after reconciliation | Explicit retry action | No cache | One retained intent | After reconciliation | No automatic polling | No automatic retry or resubmit | 0 | 0 | Retained hash reconciled before a new intent |

## FRONTEND RPC BUDGET EVIDENCE

FRONTEND_EVIDENCE_STATUS: INCOMPLETE

Live frontend measurement is not claimed before the later deployed E2E stage.

| Screen/workflow | Request source/method | Actual requests | Cache hit/miss | In-flight dedupe | Poll attempts | Retry/delay | Invalidations | Readback calls | Actual transactions | Variance/result |
|---|---|---:|---|---|---:|---|---|---:|---:|---|

## Frontend budget

| User action | Allowed automatic chain/RPC work | Implementation boundary |
|---|---:|---|
| Initial landing | 0 | No client read or wallet request on startup |
| Load case IDs | 1 read | Explicit `list_cases` only |
| Open case detail | 1 read | Explicit `get_case` only |
| Wallet connect | 1 chain read | Account request plus one `eth_chainId` read |
| One write | 6 maximum | 1 submission, up to 3 receipt queries at bounded 2/4/8s backoff while visible, up to 2 authoritative readbacks at 0/4s; hidden-tab pause and abort/session teardown stop automatic polling |
| Retry after uncertainty | 0 automatic | User reconciles the retained hash/journal before any new intent |

The write coordinator reports `WAITING_FOR_WALLET`, `SUBMITTED`, `WAITING_FOR_FINALITY`, `VERIFYING_EXECUTION`, `VERIFYING_READBACK`, and terminal states. Receipt polling pauses without RPC while the document is hidden; transient transport failures consume the same bounded receipt slots with exponential backoff and jitter; abort/session teardown removes timers and preserves a submitted hash in `RECONCILE`. Browser success is emitted only after finalized successful execution and method-specific historical readback.

## STUDIO RPC MEASUREMENT CAPABILITY PROBE

```text
STUDIO_CAPABILITY_PROBE_STATUS: COMPLETE
STUDIO_MEASUREMENT_MODE: OBSERVABLE_ACTION_LEDGER
STUDIO_MEASUREMENT_TIMING: PRE_E2E
STUDIO_CAPABILITY_PROBE_AT: 2026-09-06T02:01:17.3913691+07:00
STUDIO_CAPABILITY_TOOL_OR_API: In-App Browser capabilities, tab.playwright.evaluate, tab.dev.logs
STUDIO_CAPABILITY_CHECK: inspected browser/tab capability lists, the page performance-resource API, and developer-log request visibility on https://studio.genlayer.com/contracts
STUDIO_CAPABILITY_RESULT: physical request-level telemetry is not exposed; primary-AI Studio actions and visible tab state are observable
STUDIO_PHYSICAL_COUNT_CLAIM: NONE
STUDIO_ACTION_LEDGER_STATUS: LOCKED_FOR_PRE_E2E
STUDIO_ACCOUNT: 0xeF5D2119416A2f5afa35dCFA209766EFC1BE5902
STUDIO_INTENDED_ROLE: deployer; upgrader NOT APPLICABLE for INTENTIONALLY FROZEN contract
STUDIO_E2E_STATUS: NOT_STARTED
```

The probe used only read-only page inspection. `browser.capabilities.list()` exposed visibility/viewport, `tab.capabilities.list()` exposed page-assets/WebMCP, the page evaluation exposed no performance resource API in the browser sandbox, and `tab.dev.logs()` exposed console logs but no request-event stream. Therefore this package locks `OBSERVABLE_ACTION_LEDGER` and makes no physical-network-count claim. The future ledger must record every primary-AI Studio action, status-poll attempt, terminal receipt read, authoritative readback, retry, transaction hash, duplicate-transaction count, and matrix variance.

## STUDIO RPC BUDGET MATRIX

The following is the locked pre-E2E ceiling for the `OBSERVABLE_ACTION_LEDGER` mode. These are planned observable RPC-call ceilings, not physical-network measurements. Every status poll uses the same hash, at most three attempts at base delays `2s/4s/8s` with bounded transient-error backoff/jitter, and stops immediately on a terminal status, rate-limit cooldown, or actual blocker. A terminal receipt is fetched at most once after a terminal status. No automatic retry or replacement transaction is permitted.

| Flow / unique action | Pre/post authoritative reads | Submission txs | Status polls | Terminal receipt reads | Retry/cooldown | Maximum observable RPC calls | Expected txs |
|---|---:|---:|---:|---:|---|---:|---:|
| Health/network preflight | 1 chain/status read | 0 | 0 | 0 | none | 1 | 0 |
| Selected account/role check | 0 (Studio UI identity read) | 0 | 0 | 0 | none | 0 | 0 |
| Deploy exact source | 1 `gen_getContractSchema` parity read | 1 | 3 | 1 | no retry; retain deploy hash on uncertainty | 6 | 1 |
| Create case (`create_schema_case`) | 2 (`get_id_by_nonce` + `get_version`) | 1 | 3 | 1 | no retry; nonce readback is authoritative | 7 | 1 |
| Replace schemas (`replace_schemas`) | 1 `get_version` | 1 | 3 | 1 | no automatic retry | 6 | 1 |
| Lock schemas (`lock_schemas`) | 1 `get_version` | 1 | 3 | 1 | no automatic retry | 6 | 1 |
| Put mapping (`put_mapping`) | 1 `get_version` | 1 | 3 | 1 | no automatic retry | 6 | 1 |
| Freeze mapping (`freeze_mapping`) | 1 `get_version` | 1 | 3 | 1 | no automatic retry | 6 | 1 |
| Evaluate compatible mapping (`evaluate_migration`) | 1 `get_version` | 1 | 3 | 1 | no automatic retry | 6 | 1 |
| Evaluate structural-loss mapping (`evaluate_migration`) | 1 `get_version` | 1 | 3 | 1 | no automatic retry | 6 | 1 |
| Live semantic UNKNOWN (`evaluate_migration`, only if returned) | 1 `get_version` | 1 | 3 | 1 | no automatic retry | 6 | 1 |
| Accepted retry (`retry_migration`, only after 60s tx-time cooldown) | 1 `get_version` | 1 | 3 | 1 | one explicit user/test action only; no automatic retry | 6 | 1 |
| Wrong-actor negative control | 2 (`get_version` before/after) | 1 | 3 | 1 | no retry; unchanged-state readback required | 7 | 1 |
| Stale-revision negative control | 2 (`get_version` before/after) | 1 | 3 | 1 | no retry; unchanged-state readback required | 7 | 1 |
| Too-early retry/cooldown negative control, if exercised | 2 (`get_version` before/after) | 1 | 3 | 1 | do not repeat; contract cooldown is the terminal result | 7 | 1 |

Terminal success requires `FINALIZED`, semantic execution success, consensus/finality where applicable, and the exact authoritative readback. `DROPPED`, rejected/failed execution, undetermined status, exhausted poll budget, transport-error exhaustion, or readback mismatch stops the row and preserves the hash/evidence; it never authorizes a replacement write. A `429` or transient transport error consumes the current bounded poll slot and uses `Retry-After` when exposed or bounded exponential backoff with jitter; it does not add poll slots. The create row's second read is required because the ID must be resolved by nonce and then verified historically.

No Studio row is claimed as executed yet. The future ledger must record each listed action, poll attempt, terminal receipt, authoritative read, transaction hash, duplicate-transaction count, retry, and matrix variance without converting these ceilings into a physical-request count.

## F-012 sequencing disposition

The required pre-opening order was breached and is recorded rather than treated as retroactively satisfied. The read-only Studio page/probe occurred at `2026-09-06T02:01:17.3913691+07:00`; commit `2dc9d511d5f9e873526cb9aefb04655865b44013` at `2026-09-06T02:03:22+07:00` still contained only the coarse Studio table; the complete numeric matrix was first committed at `2026-09-06T02:10:09+07:00` in `601efde0b7c7ff526c1c749d28ae5da5f40d1cc4`. This is an ordering breach, not live Studio evidence.

```text
STUDIO_MATRIX_CONTENT: COMPLETE
STUDIO_MATRIX_LOCK_TIMING: AFTER_READ_ONLY_PROBE
STUDIO_SEQUENCE_BREACH: RECORDED
STUDIO_E2E_AUTHORIZATION: BLOCKED_PENDING_REVIEWER_DISPOSITION
STUDIO_FURTHER_ACTION: NONE
STUDIO_REPLAY_OR_REDEPLOY_FOR_MEASUREMENT: FORBIDDEN
```

Disposition: retain the account/probe as read-only setup evidence, make no retrospective compliance claim, do not replay or redeploy to repair the chronology, and keep PRE_DEPLOY and every further Studio action blocked until the retained anonymous reviewer confirms this disposition/evidence-plan adjustment.

## Acceptance boundary

Before PRE_DEPLOY can be approved, this matrix must be reviewed against the exact source revision, a Studio account must be locked, and the current anonymous reviewer must return the mandated literal verdict. Local tests do not satisfy those live/account/reviewer requirements.
