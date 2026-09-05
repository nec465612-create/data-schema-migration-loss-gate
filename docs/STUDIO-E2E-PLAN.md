# Studionet E2E Plan

`DOCUMENT_STATUS: PLANNED_NOT_EXECUTED`

Run only after exact-revision `PRE_DEPLOY` approval and with a locked Studionet account. The contract is classified `INTENTIONALLY FROZEN`; no upgrade or migration transaction is part of this plan.

| Row | Action | Expected result | Evidence required |
|---|---|---|---|
| 1 | Deploy exact source | Finalized successful deployment | tx hash, execution result, deployed address |
| 2 | Read deployed schema | Exact parity with `contract-schema.json` | authoritative schema JSON and hash |
| 3 | Create case as primary with distinct mapper | `BASE_DRAFT`, revision 1 | finalized tx plus `get_version`/nonce readback |
| 4 | Replace schemas, then lock as primary | `BASE_LOCKED` | finalized tx plus exact historical readback |
| 5 | Put mapping, then freeze as mapper | `RESPONSE_DRAFT`, then `FROZEN` | actor and revision-bound readbacks |
| 6 | Evaluate compatible mapping | `DONE`, `LOSSLESS` | finalized execution, outcome, result vector/readback |
| 7 | Evaluate structural loss mapping | `DONE`, `LOSS_FOUND` | deterministic consequence and unchanged history before evaluation |
| 8 | Wrong actor and stale revision controls | Rejected/failed, no state mutation | pre/post authoritative records and tx results |
| 9 | Live semantic `UNKNOWN` path, if consensus returns it | `UNRESOLVED` | exact validator/leader result and retry counter |
| 10 | Retry boundary | cooldown and max-three attempts enforced | timestamps/attempts; third unresolved becomes `EXHAUSTED` |

The primary AI must retain exact hashes and receipt evidence, query only within the approved RPC budget, and stop on any mismatch. This plan contains no deployment authorization.
