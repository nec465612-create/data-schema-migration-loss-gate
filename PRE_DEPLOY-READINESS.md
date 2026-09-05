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
- Source Git revision: `37f7a6fa3056dcd5a64b39a486205b8d6c718e41` (`Implement F-007 journal recovery UI`)
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
| Direct runtime | `gltest -q tests` | PASS; 8 tests |
| Frontend unit | `npm run test` in `frontend` | PASS; 16 tests |
| Frontend build | `npm run build` in `frontend` | PASS; Vite build; non-blocking chunk-size warning |
| Browser smoke | `npm run playwright` in `frontend` | PASS; 3 tests |
| Unsafe HTML scan | `rg -n "dangerouslySetInnerHTML|innerHTML|innerText|eval\\(" frontend/src frontend/tests` | No matches |
| Journal key scan | `rg -n "glj1:.*operationFingerprint|operationFingerprint.*glj1:|key.*operationFingerprint" frontend/src frontend/tests` | No matches |

The frontend unit result includes journal integrity, finalized-status/historical-readback reconciliation, export-before-archive enforcement, quota, and all required transaction-progress phase vocabulary checks. The browser smoke suite confirms no startup RPC request, disabled signing until journal initialization is healthy, and reload restoration of a retained journal entry with archive locked until export.

## Exact source manifest at the source revision

```text
contracts/main.py                         C2D0CA66B7533FF243C31988EC3652290B940A3D78BA0BEC02C7D7D04C517589
contract-schema.json                      16A15785BD1ACA7DA89A0C73ADE7CBC22539AB403EDD10F82300F02F7B080EBF
tests/test_contract.py                    95F2ED51FABB7963D239CA1A9AB5A5412B2EAAF0C031ED6FBB42C13B1D5F8E6C
probes/schema_probe.py                   56E77FB226EE223100AFDA26E6CC8797A048EBB5E90157AB8F6114F53122A8B9
probes/schema_probe.json                 E8D8C7F03BE1AD732393A792DED323DC56AD391E689D6CF908E2068E50C4CFF3
frontend/src/App.tsx                     DA29611A94FCFB9190EF4024717A1967511B23AB1496663D476B91546F9C966B
frontend/src/mapping.ts                  7C83AF8E6EB7DC756A1B80160687A6CE0A4FC69F47912823FCAF21F2326D3AD1
frontend/src/contract.ts                 608B32F0A1337C945481B4CB828CF929CD3C58252A14EF693F7D78AFFB73BBA9
frontend/src/network.ts                  B263BF17FF928A352555ED8D1E9C5E4C9CABA438D34D4F6474724D33DA9D7BBD
frontend/src/write-context.ts            3A306279F673248DBEBE599E57C6CA3F7D068D74E6D41462B6742D3BCFFF35C
frontend/src/pending.ts                  FE4072DC1090F78F2ED3C61AA6C210B3B7E4F8AB3C2A594421389D50CCE85D75
frontend/src/progress.ts                 8ECDCFFD89D977629FBBA4DBCE677A628B473F8AF5AA5692D129A0CBA1E7071F
frontend/src/styles.css                  687C485EFA78D399E026FEC98B0DA1B0E3D65F5550D7AD5C5B90FFD133D9601B
frontend/tests/pending.test.ts            64AD1BC6ADE5ABF8D0580798B026FFB818A25D4350DADFF99AD0886BB823C068
frontend/tests/journal-recovery.test.ts   549053B388297692340A20A0D8A336705F6B719CA3341FC7D3B5D33AEC536A3B
frontend/tests/progress.test.ts           7663FD75183D7D26D9ECE677141C97A64CB46F041B6C627888E5D21C9B891053
frontend/tests/mapping.test.ts            5C65BAC85287BFF92690EFCDC63DA376EC81F9DEC8A9964F0B846E0A18D65048
frontend/tests/network.test.ts            F57A902C58620B327B14EF6950CE0398CD6740E6D77EA36C6759DD7FD7E3AE2C
frontend/tests/session.test.ts            42E5A6F1A061BAE2BD54ED4D3992AAF9D4A99CA38A65650A3613D0552B91527B
frontend/tests/write-race.test.ts         E680589597560106A459E071ABA99196E265517799E990B5DBAF8001BFBCD4A0
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
frontend/tests/wallet-discovery.test.ts
frontend/tests/flow.spec.ts
docs/RPC-BUDGET.md
docs/STUDIO-E2E-PLAN.md
```

## Required review/deployment boundary

No deployment, signature, contract write, GitHub publication, Vercel publication, or live Studio claim is authorized by this document. The next gate is one current anonymous PRE_DEPLOY review bound to the final exact source revision and this package. The old reviewer route in the pasted handoff is for a different project and must not be used.

## Later Studio E2E plan

After exact PRE_DEPLOY approval, the primary AI will execute the rows in `docs/STUDIO-E2E-PLAN.md`: deploy and source-parity readback; create by primary with distinct mapper; lock schemas; put and freeze mapping; evaluate a lossless case; evaluate a structural LOSS_FOUND case; exercise wrong actor/stale revision no-write controls; and exercise UNKNOWN only when live consensus returns UNKNOWN, with the 60-second retry boundary. Every write requires finalized execution success and exact historical `get_version` readback. These are planned rows, not current evidence.

## Open handoffs

- Current anonymous Build reviewer route: `codex://threads/01a0725b-91de-7602-85fe-7bc72d414ad9`.
- Claude presentation phase: `PROMPT READY — NO CLAUDE RESULT RELAYED`; see `CLAUDE-FRONTEND-REDESIGN-PROMPT.txt`.
- Studio account/address/transaction evidence: `NOT LOCKED / NOT DEPLOYED`.
