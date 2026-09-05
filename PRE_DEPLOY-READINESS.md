# PRE_DEPLOY Readiness

`DOCUMENT_STATUS: PRE_DEPLOY_READINESS_NOT_APPROVED`

This package is a local exact-revision candidate for anonymous PRE_DEPLOY review. It is not PRE_DEPLOY approval, deployment approval, live evidence, or release approval. The current reviewer route, later live Studio evidence, and Claude presentation relay remain open gates.

## Scope and classification

- Project: `data-schema-migration-loss-gate`
- Candidate: C3, `PROJECT`
- Contract: `DataSchemaMigrationLossGate`
- Classification: `INTENTIONALLY FROZEN`
- Upgrade method/storage: none
- Deployment target: Studionet only, after PRE_DEPLOY approval
- Source Git revision: `ab4be75dd07e2f743174f786cce39765418424a9` (`Bound transaction polling and cancellation`)
- Contract address: not deployed

## Classification decision record

- Decision: `INTENTIONALLY FROZEN` for C3; no upgrade method or upgrade storage is part of the approved Stage 2 public surface.
- User authorization recorded: on 2026-09-06, the user instructed the primary AI, “Làm đi, bạn có quyền tự quyết”, explicitly authorizing the primary AI to finalize this project decision. The primary AI records and accepts the frozen classification under that authorization.
- Irreversibility disclosure: after deployment, a contract defect cannot be repaired in place. The remedy is a replacement contract deployment, a new address/configuration, and fresh verification; the old deployment and its evidence remain historical.
- Recovery limitation: the journal can retain transaction hashes and source/context evidence for reconciliation, but it cannot upgrade, roll back, or repair the frozen contract. Recovery is limited by retained local records and access to the original chain/account state; no recovery across a reset, lost account, or changed network is claimed.

## Studio authorization and measurement record

- Selected Studio account: `0xeF5D2119416A2f5afa35dCFA209766EFC1BE5902`
- Intended role: `deployer`; upgrader role: `NOT APPLICABLE` because this contract is `INTENTIONALLY FROZEN`.
- Selection evidence: In-App Browser read of `https://studio.genlayer.com/contracts` showed the selected public address and `998 GEN` balance. No signature, deployment, contract write, or wallet transaction was initiated.
- `STUDIO_CAPABILITY_PROBE_STATUS: COMPLETE`
- `STUDIO_MEASUREMENT_MODE: OBSERVABLE_ACTION_LEDGER`
- `STUDIO_MEASUREMENT_TIMING: PRE_E2E`
- `STUDIO_CAPABILITY_PROBE_AT: 2026-09-06T02:01:17.3913691+07:00`
- `STUDIO_CAPABILITY_TOOL_OR_API: In-App Browser capabilities, tab.playwright.evaluate, tab.dev.logs`
- `STUDIO_CAPABILITY_CHECK: Browser and tab capability lists, page performance-resource API, and developer-log request visibility were inspected on the Studio contracts page.`
- `STUDIO_CAPABILITY_RESULT: physical request-level telemetry is not exposed; primary-AI Studio actions and visible tab state are observable.`
- `STUDIO_PHYSICAL_COUNT_CLAIM: NONE`
- `STUDIO_E2E_STATUS: NOT_STARTED`

## F-012 sequencing disposition

The required matrix-before-Studio ordering was breached and is recorded explicitly. The read-only Studio page/probe occurred at `2026-09-06T02:01:17.3913691+07:00`; `2dc9d511d5f9e873526cb9aefb04655865b44013` at `2026-09-06T02:03:22+07:00` still had only the coarse Studio table; the complete numeric matrix was first committed at `2026-09-06T02:10:09+07:00` in `601efde0b7c7ff526c1c749d28ae5da5f40d1cc4`. The matrix content is complete, but this chronology is not retroactively compliant. The read-only probe is not Studio E2E/live evidence; no replay or redeploy will be used to repair it. PRE_DEPLOY and all further Studio actions remain blocked pending reviewer confirmation of this disposition/evidence-plan adjustment.

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
| Direct runtime | `gltest -q tests` | PASS; 8 tests |
| Frontend unit | `npm run test` in `frontend` | PASS; 21 tests |
| Frontend build | `npm run build` in `frontend` | PASS; Vite build; non-blocking chunk-size warning |
| Browser smoke | `npm run playwright` in `frontend` | PASS; 3 tests |
| Unsafe HTML scan | `rg -n "dangerouslySetInnerHTML|innerHTML|innerText|eval\\(" frontend/src frontend/tests` | No matches |
| Journal key scan | `rg -n "glj1:.*operationFingerprint|operationFingerprint.*glj1:|key.*operationFingerprint" frontend/src frontend/tests` | No matches |
| Studio capability probe | In-App Browser read-only probe on `https://studio.genlayer.com/contracts` | PASS; `OBSERVABLE_ACTION_LEDGER` locked; no physical-count claim |
| Studio RPC matrix | `docs/RPC-BUDGET.md` exact-source review | CONTENT COMPLETE; sequencing breach recorded; PRE_DEPLOY/Studio action remains blocked pending disposition |

The frontend unit result includes journal integrity, caller-fingerprint validation, finalized-status/historical-readback reconciliation, mixed-context quarantine, export-before-archive enforcement, quota, hidden-tab polling pause, cancellation teardown, bounded transient receipt retry, and all required transaction-progress phase vocabulary checks. The browser smoke suite confirms no startup RPC request, disabled signing until journal initialization is healthy, and reload restoration of a retained journal entry with archive locked until export.

## Exact source manifest at the source revision

```text
contracts/main.py                         C2D0CA66B7533FF243C31988EC3652290B940A3D78BA0BEC02C7D7D04C517589
contract-schema.json                      16A15785BD1ACA7DA89A0C73ADE7CBC22539AB403EDD10F82300F02F7B080EBF
tests/test_contract.py                    95F2ED51FABB7963D239CA1A9AB5A5412B2EAAF0C031ED6FBB42C13B1D5F8E6C
probes/schema_probe.py                   56E77FB226EE223100AFDA26E6CC8797A048EBB5E90157AB8F6114F53122A8B9
probes/schema_probe.json                 E8D8C7F03BE1AD732393A792DED323DC56AD391E689D6CF908E2068E50C4CFF3
frontend/src/App.tsx                     0898B288CBEE6C5EFBA1C7D8C5FCA8FCD2D24B9984801568C7E253563D778F24
frontend/src/mapping.ts                  7C83AF8E6EB7DC756A1B80160687A6CE0A4FC69F47912823FCAF21F2326D3AD1
frontend/src/contract.ts                 8F88D62FC09C88688F90B41FB1A944E9092634782B631CD225ACBBC4200A2CDF
frontend/src/network.ts                  B263BF17FF928A352555ED8D1E9C5E4C9CABA438D34D4F6474724D33DA9D7BBD
frontend/src/write-context.ts            3A306279F673248DBEBE599E57C6CA3F7D068D74E6D41462B6742D3BCFFF35C
frontend/src/pending.ts                  0BB96B1D80FF83CFF4829C8F908C1B19284D385752E61282A99046BA304D93CD
frontend/src/progress.ts                 8ECDCFFD89D977629FBBA4DBCE677A628B473F8AF5AA5692D129A0CBA1E7071F
frontend/src/styles.css                  348462E5466BC8028CAAC1A209A41AC959BB88E17A2A4D77C3B36F29BDB3C51F
frontend/tests/pending.test.ts            EF391F94A137D96BB35F0BD28C141673E45E1F521CFB30FB68C6E3308351CE8D
frontend/tests/journal-recovery.test.ts   2E8454D0B980DC5D68F28D38C66345181E35354CBEFD4B636CF4843EBB388404
frontend/tests/progress.test.ts           7663FD75183D7D26D9ECE677141C97A64CB46F041B6C627888E5D21C9B891053
frontend/tests/mapping.test.ts            5C65BAC85287BFF92690EFCDC63DA376EC81F9DEC8A9964F0B846E0A18D65048
frontend/tests/network.test.ts            F57A902C58620B327B14EF6950CE0398CD6740E6D77EA36C6759DD7FD7E3AE2C
frontend/tests/session.test.ts            42E5A6F1A061BAE2BD54ED4D3992AAF9D4A99CA38A65650A3613D0552B91527B
frontend/tests/write-race.test.ts         E680589597560106A459E071ABA99196E265517799E990B5DBAF8001BFBCD4A0
frontend/tests/transaction-polling.test.ts 727566998E2B6AF85257078AA3F56C7BAABF1599925BACBA720AE7A29B2817BE
frontend/tests/wallet-discovery.test.ts   06C5C2497D4BA0A8251DE44F0ABDC07AE2C6E160CA5799FFFCB3ACD20E9C6014
frontend/tests/flow.spec.ts               81553912F995E2422CA9F776FC2B5329DCA82F10A1FAEC83A68EB89913D7CA2C
frontend/package.json                     3DDE31E000B6EFF38FBF21FF743649748AB7FFC9F08364DE7E13FFC129AAD5B8
frontend/package-lock.json                D6741048BC001F908629E158934AAA92EF154BA544CF694969F5368F7425925C
gltest.config.yaml                        6B01A7D4C94FB2D049087C2F95D8F2914719697ABB45A7D9B59494B879E70157
```

## Source inventory

```text
contracts/main.py
contract-schema.json
tests/test_contract.py
probes/schema_probe.py
probes/schema_probe.json
tests/test_schema_probe.py
frontend/src/App.tsx
frontend/src/network.ts
frontend/src/contract.ts
frontend/src/write-context.ts
frontend/src/pending.ts
frontend/src/progress.ts
frontend/src/main.tsx
frontend/src/styles.css
frontend/tests/pending.test.ts
frontend/tests/journal-recovery.test.ts
frontend/tests/progress.test.ts
frontend/tests/mapping.test.ts
frontend/tests/network.test.ts
frontend/tests/session.test.ts
frontend/tests/write-race.test.ts
frontend/tests/transaction-polling.test.ts
frontend/tests/wallet-discovery.test.ts
frontend/tests/flow.spec.ts
docs/RPC-BUDGET.md
docs/STUDIO-E2E-PLAN.md
```

## Required review/deployment boundary

No deployment, signature, contract write, GitHub publication, Vercel publication, or live Studio claim is authorized by this document. The selected Studio account, pre-E2E measurement mode, and numeric Studio matrix are recorded, but the matrix-before-opening sequencing breach requires reviewer-confirmed disposition; PRE_DEPLOY approval, deployment, and live evidence remain open. The next gate is one current anonymous PRE_DEPLOY review bound to the final exact source revision and this package. The old reviewer route in the pasted handoff is for a different project and must not be used.

## Later Studio E2E plan

After exact PRE_DEPLOY approval, the primary AI will execute the rows in `docs/STUDIO-E2E-PLAN.md`: deploy and source-parity readback; create by primary with distinct mapper; lock schemas; put and freeze mapping; evaluate a lossless case; evaluate a structural LOSS_FOUND case; exercise wrong actor/stale revision no-write controls; and exercise UNKNOWN only when live consensus returns UNKNOWN, with the 60-second retry boundary. Every write requires finalized execution success and exact historical `get_version` readback. These are planned rows, not current evidence.

## Open handoffs

- Current anonymous Build reviewer route: `codex://threads/01a0725b-91de-7602-85fe-7bc72d414ad9`.
- Claude presentation phase: `MANUAL HANDOFF PROMPT REVISED — ITERATION 1/2 — NO CLAUDE RESULT RELAYED`; see `DESIGN.md` and `CLAUDE-FRONTEND-REDESIGN-PROMPT.txt`.
- Studio account: `0xeF5D2119416A2f5afa35dCFA209766EFC1BE5902`, intended role `deployer`; `OBSERVABLE_ACTION_LEDGER` capability mode locked; not deployed.
