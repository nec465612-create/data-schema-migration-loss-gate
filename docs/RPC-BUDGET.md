# RPC Budget Matrix

`DOCUMENT_STATUS: FINAL_RELEASE_MEASURED_REQUEST_TELEMETRY`

This matrix is bound to the C3 Stage 2 frontend flow. The frontend section contains measured request-level evidence from exact final deployment `dpl_9kf456TWHDGPrHyLQ3h64o8Y8td7`. Studio live evidence is recorded separately in `docs/VERIFICATION.md` and the local secret-free action ledger.

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
| Initial wallet connect | Canonical wallet-session store | eth_requestAccounts; eth_chainId | Explicit wallet choice | none | One shared session | Account or chain event | none | User action only; teardown cancellation | 2 | 0 | Connected session or recoverable error |
| Account switch | Selected EIP-1193 provider | eth_chainId | Provider accountsChanged event | none | Same selected session | Invalidates account-bound state | none | Event-driven; no retry | 1 | 0 | New account and current chain bound |
| Reconnect after reload | Canonical wallet-session store | eth_requestAccounts; eth_chainId | Explicit wallet choice after disconnected reload | none | One shared session | Reload clears session | none | User action only; teardown cancellation | 2 | 0 | Reconnected session or recoverable error |
| Load case IDs | Shared read client | get_count | Explicit Load IDs | chain/contract/get_count; no cache | In-flight dedupe | Account/network/contract change | none | Bounded; cancel on teardown | 1 | 0 | Contiguous IDs `1..count` or recoverable error |
| Open case detail | Shared read client | get_case | Explicit case selection | chain/contract/get_case/[id]; no cache | In-flight dedupe | Account/network/contract change | none | Bounded; cancel on teardown | 1 | 0 | Decoded case or recoverable error |
| One write workflow | Write coordinator | eth_getTransactionCount; eth_estimateGas; eth_gasPrice; eth_sendTransaction; eth_getTransactionByHash; gen_call | Explicit action button | No cache for consequential state | One journal intent and coordinator | After write/account/network change | 2/4/8/12/16/20/24s; up to 7 | Bounded Retry-After/backoff; cancel hidden or teardown | 13 | 1 | Three SDK preflight requests + one submission + up to seven status polls + up to two authoritative readbacks; FINALIZED plus semantic SUCCESS and readback |
| Retry after uncertainty | Retained journal | retry_migration only after reconciliation | Explicit retry action | No cache | One retained intent | After reconciliation | No automatic polling | No automatic retry or resubmit | 0 | 0 | Retained hash reconciled before a new intent |

## FRONTEND RPC BUDGET EVIDENCE

FRONTEND_EVIDENCE_STATUS: COMPLETE_REQUEST_LEVEL_TELEMETRY

The exact production release instruments JSON-RPC at both physical request boundaries: SDK HTTP transport and the explicitly selected EIP-1193 provider. Case 7 began after the public Clear control showed `0` requests and ended with the public Refresh control showing `58` requests. All `58` succeeded; all HTTP responses were `200`; retry count was `0`; transaction submissions were exactly `5`.

| Screen/workflow | Request source/method | Observed actions | Cache/dedupe | Poll evidence | Retry | Authoritative readback | Actual transactions | Result |
|---|---|---:|---|---|---|---|---:|---|
| Clean landing | public telemetry control | 0 RPC | n/a | none | 0 | none | 0 | PASS; disconnected landing |
| Initial wallet connect | provider `eth_requestAccounts` ×1, `eth_chainId` ×1 | 2 RPC | one canonical selected-provider session; no cache | none | 0 | visible account/chain binding | 0 | PASS |
| Account switch | provider `eth_chainId` ×1 | 1 RPC | selected-provider account-state invalidation; no cache | none | 0 | updated account/chain binding | 0 | PASS |
| J7 reconnect after reload | provider `eth_requestAccounts` ×1, `eth_chainId` ×1 | 2 RPC | explicit reconnect; no stale session restore | none | 0 | restored account/chain binding | 0 | PASS |
| J2 create Case 7 | HTTP nonce/estimate/gas ×1 each; provider send ×1; HTTP transaction lookup ×5; `gen_call` ×2 | 11 RPC | one retained intent; no duplicate or cache | polls at bounded 2/4/8/12/16s; 5 attempts | 0 | `BASE_DRAFT`, revision 1 | 1 | PASS |
| J3 lock | HTTP nonce/estimate/gas ×1 each; provider send ×1; HTTP transaction lookup ×5; `gen_call` ×1 | 10 RPC | one retained intent; no duplicate or cache | 5 bounded attempts | 0 | `BASE_LOCKED`, revision 2 | 1 | PASS |
| J4 put mapping | same method profile as lock | 10 RPC | one retained intent; no duplicate or cache | 5 bounded attempts | 0 | `RESPONSE_DRAFT`, revision 3 | 1 | PASS |
| J5 freeze | same method profile as lock | 10 RPC | one retained intent; no duplicate or cache | 5 bounded attempts | 0 | `FROZEN`, revision 4 | 1 | PASS |
| J6 evaluate | same method profile as lock | 10 RPC | one retained intent; no duplicate or cache | 5 bounded attempts | 0 | `DONE`, `LOSSLESS`, revision 5 | 1 | PASS |
| J7 reload/list/detail | HTTP `gen_call` ×2 | 2 RPC | no stale authenticated restore; explicit reads | none | 0 | Case 7 `DONE`, `LOSSLESS`, revision 5 | 0 | PASS |

Measured total: `58` requests = `5` wallet/session requests + `51` write-journey requests + `2` J7 reads. Cache hits/misses and in-flight deduplication are `N/A` for these consequential zero-TTL calls; no duplicate identical in-flight read occurred. Each write invalidated the prior authoritative view and ended in a fresh `gen_call` readback. There were `0` 429s, transient retries, resubmits or failed requests.

### Durable telemetry digest and recomputation

- Browser session: Chrome tab `1145403394`; deployment `dpl_9kf456TWHDGPrHyLQ3h64o8Y8td7`.
- RPC time range: `2026-09-06T17:51:25.327Z` through `2026-09-06T18:07:53.664Z`.
- Exact public JSON text: `14,226` UTF-8 bytes, `78` total scope/RPC events, SHA-256 `DD9C48DAB332906CE6928E3593B355EDC8B35E109CC785601065312B9CAF82B0`.
- Canonical RPC-only array: `58` events, SHA-256 `0B868ED717FF4579DEC274E96DF9E7692C6D84BE49058AA1276C61953D5C3105`.
- Methods: provider `eth_requestAccounts` 2, provider `eth_chainId` 3, provider `eth_sendTransaction` 5, HTTP `eth_getTransactionCount` 5, HTTP `eth_estimateGas` 5, HTTP `eth_gasPrice` 5, HTTP `eth_getTransactionByHash` 25, HTTP `gen_call` 8. Sum: `58`.
- Statuses: HTTP 200 = `48`; successful provider responses = `10`; failures = `0`.
- Scopes: wallet-connect 4; wallet-account-switch 1; create 11; lock 10; put 10; freeze 10; evaluate 10; load-case-ids 1; open-case-detail 1. Sum: `58`.

## Frontend budget

| User action | Allowed automatic chain/RPC work | Implementation boundary |
|---|---:|---|
| Initial landing | 0 | No client read or wallet request on startup |
| Load case IDs | 1 read | Explicit `get_count` only; contiguous IDs are derived locally |
| Open case detail | 1 read | Explicit `get_case` only |
| Initial wallet connect | 2 requests | One account request plus one `eth_chainId` read |
| Account switch | 1 request | One event-driven `eth_chainId` read; invalidates account-bound state |
| Reconnect after reload | 2 requests | Explicit account request plus one `eth_chainId` read; no silent restore |
| One write | 13 maximum | 3 SDK preflight HTTP requests, 1 provider submission, up to 7 receipt queries at bounded 2/4/8/12/16/20/24s while visible, up to 2 authoritative readbacks at 0/4s; hidden-tab pause and abort/session teardown stop automatic polling |
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
STUDIO_ACTION_LEDGER_STATUS: COMPLETE
STUDIO_ACCOUNT: 0xeF5D2119416A2f5afa35dCFA209766EFC1BE5902
STUDIO_INTENDED_ROLE: deployer; upgrader NOT APPLICABLE for INTENTIONALLY FROZEN contract
STUDIO_E2E_STATUS: COMPLETE
STUDIO_LIVE_EVIDENCE: docs/VERIFICATION.md
```

The probe used only read-only page inspection. `browser.capabilities.list()` exposed visibility/viewport, `tab.capabilities.list()` exposed page-assets/WebMCP, the page evaluation exposed no performance resource API in the browser sandbox, and `tab.dev.logs()` exposed console logs but no request-event stream. Therefore this package locks `OBSERVABLE_ACTION_LEDGER` and makes no physical-network-count claim. The completed primary-AI Studio action ledger, terminal receipts, authoritative readbacks, retries, transaction hashes, duplicate-transaction count and matrix disposition are recorded in `docs/VERIFICATION.md` and the local preflight evidence.

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

Studio rows are executed and reconciled in `docs/VERIFICATION.md`; the ceilings above remain observable-action ceilings and are not converted into a physical-request count.

## F-012 sequencing disposition

The required pre-opening order was breached and is recorded rather than treated as retroactively satisfied. The read-only Studio page/probe occurred at `2026-09-06T02:01:17.3913691+07:00`; commit `2dc9d511d5f9e873526cb9aefb04655865b44013` at `2026-09-06T02:03:22+07:00` still contained only the coarse Studio table; the complete numeric matrix was first committed at `2026-09-06T02:10:09+07:00` in `601efde0b7c7ff526c1c749d28ae5da5f40d1cc4`. This is an ordering breach, not live Studio evidence.

```text
STUDIO_MATRIX_CONTENT: COMPLETE
STUDIO_MATRIX_LOCK_TIMING: AFTER_READ_ONLY_PROBE
STUDIO_SEQUENCE_BREACH: RECORDED
STUDIO_E2E_AUTHORIZATION: APPROVED_BY_PRE_DEPLOY_REVIEW
STUDIO_FURTHER_ACTION: POST_DEPLOY_TEST_REVIEW
STUDIO_REPLAY_OR_REDEPLOY_FOR_MEASUREMENT: FORBIDDEN
```

Disposition: retain the account/probe as read-only setup evidence and do not replay or redeploy completed transactions. Studio E2E is complete.

## Acceptance boundary

The exact final revision, completed Studio evidence, final Vercel deployment and measured request-level ledger are bound in `docs/VERIFICATION.md`.
