# PRE_DEPLOY Readiness

`DOCUMENT_STATUS: PRE_DEPLOY_READINESS_NOT_APPROVED`

This package is a local exact-revision candidate for anonymous PRE_DEPLOY review. It is not PRE_DEPLOY approval, deployment approval, live evidence, or release approval. The locked Studio account, current reviewer route, and Claude presentation relay remain open gates.

## Scope and classification

- Project: `data-schema-migration-loss-gate`
- Candidate: C3, `PROJECT`
- Contract: `DataSchemaMigrationLossGate`
- Classification: `INTENTIONALLY FROZEN`
- Upgrade method/storage: none
- Deployment target: Studionet only, after PRE_DEPLOY approval
- Source Git revision: recorded after the implementation package commit below
- Contract address: not deployed

## Exact upstream package

```text
Canonical research package SHA-256: 3464E830908CB1D87504057567242D36BDCD0C4FD59934B7D22F6482C6799ED2
STAGE-1.md SHA-256:                  AC7AF33D7EEE958472FD9E2DCB88DA12C46C786C9E98691231D5FDB936E28B9D
STAGE-2.md SHA-256:                  A44237E81EB8C9336F3AC74444BFE7972D2DF165377DEF9A08383559DFAA02FF
```

## Local verification

| Layer | Command | Result |
|---|---|---|
| Contract lint | `genvm-lint check contracts/main.py --json` | PASS; 14 methods, 7 views, 7 writes |
| Contract schema | `genvm-lint schema contracts/main.py --output contract-schema.json` | PASS |
| Contract typecheck | `genvm-lint typecheck contracts/main.py` | PASS |
| Direct runtime | `gltest -q tests` | PASS; 7 tests |
| Frontend unit | `npm run test` in `frontend` | PASS; 2 tests |
| Frontend build | `npm run build` in `frontend` | PASS; Vite build; non-blocking chunk-size warning |
| Browser smoke | `npm run playwright` in `frontend` | PASS; 2 tests |
| Unsafe HTML scan | `rg -n "dangerouslySetInnerHTML|innerHTML|innerText|eval\\(" frontend/src frontend/tests` | No matches |
| Journal key scan | `rg -n "glj1:.*operationFingerprint|operationFingerprint.*glj1:|key.*operationFingerprint" frontend/src frontend/tests` | No matches |

The frontend unit result includes journal integrity and all required transaction-progress phase vocabulary checks. The browser smoke suite confirms no startup RPC request and disabled signing until journal initialization is healthy.

## Source inventory

```text
contracts/main.py
contract-schema.json
tests/test_contract.py
probes/schema_probe.py
probes/schema_probe.json
tests/test_schema_probe.py
frontend/src/App.tsx
frontend/src/contract.ts
frontend/src/pending.ts
frontend/src/progress.ts
frontend/src/main.tsx
frontend/src/styles.css
frontend/tests/pending.test.ts
frontend/tests/progress.test.ts
frontend/tests/flow.spec.ts
docs/RPC-BUDGET.md
docs/STUDIO-E2E-PLAN.md
```

## Required review/deployment boundary

No deployment, signature, contract write, GitHub publication, Vercel publication, or live Studio claim is authorized by this document. The next gate is one current anonymous PRE_DEPLOY review bound to the final exact source revision and this package. The old reviewer route in the pasted handoff is for a different project and must not be used.

## Later Studio E2E plan

After exact PRE_DEPLOY approval, the primary AI will execute the rows in `docs/STUDIO-E2E-PLAN.md`: deploy and source-parity readback; create by primary with distinct mapper; lock schemas; put and freeze mapping; evaluate a lossless case; evaluate a structural LOSS_FOUND case; exercise wrong actor/stale revision no-write controls; and exercise UNKNOWN only when live consensus returns UNKNOWN, with the 60-second retry boundary. Every write requires finalized execution success and exact historical `get_version` readback. These are planned rows, not current evidence.

## Open handoffs

- Current anonymous Build reviewer route: `NOT IDENTIFIED — MANUAL RELAY REQUIRED`.
- Claude presentation phase: `PROMPT READY — NO CLAUDE RESULT RELAYED`; see `CLAUDE-FRONTEND-REDESIGN-PROMPT.txt`.
- Studio account/address/transaction evidence: `NOT LOCKED / NOT DEPLOYED`.
