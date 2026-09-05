# RPC Budget Matrix

`DOCUMENT_STATUS: PRE_DEPLOY_PLANNED_NOT_LIVE_MEASURED`

This matrix is bound to the C3 Stage 2 frontend flow. It is a budget and test plan, not evidence of Studio traffic. The selected Studio account is recorded below; no Studio transaction has been sent.

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

## Studio budget

| Flow row | Planned maximum | Required evidence |
|---|---:|---|
| Health/network preflight | 1 bounded read | Endpoint, chain ID, timestamp, response status |
| Deploy | 1 write | Deployment transaction hash, finalized successful execution |
| Source/schema parity | 1 authoritative read | `gen_getContractSchema` result bound to the exact source revision |
| Each contract write | 1 write + bounded status/readback | Finality, execution result, post-state/readback, exact hash |
| Wrong actor/stale revision negative controls | 1 write each | Reverted/failed execution and unchanged authoritative state |

No Studio row is claimed as executed yet. Any live measurement must use one fresh Studio tab/account, bounded polling, cached verified receipts, and no blind retry or reset/redeploy.

## Acceptance boundary

Before PRE_DEPLOY can be approved, this matrix must be reviewed against the exact source revision, a Studio account must be locked, and the current anonymous reviewer must return the mandated literal verdict. Local tests do not satisfy those live/account/reviewer requirements.
