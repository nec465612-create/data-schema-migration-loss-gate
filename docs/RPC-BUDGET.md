# RPC Budget Matrix

`DOCUMENT_STATUS: PRE_DEPLOY_PLANNED_NOT_LIVE_MEASURED`

This matrix is bound to the C3 Stage 2 frontend flow. It is a budget and test plan, not evidence of Studio traffic. The Studio account is `NOT_LOCKED` in this package.

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
