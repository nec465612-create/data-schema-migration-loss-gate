# Verification

`DOCUMENT_STATUS: POST_DEPLOY_CORRECTION_DEPLOYED_E2E_BLOCKED_ACCESS`

`POST_DEPLOY_PACKAGE: DSM-LG-POSTDEPLOY-8BB5EE8`

This document binds the live Studionet evidence and corrected public build deployment. The corrected Vercel E2E is not complete because the locked Chrome tab was unavailable. It is not a final-release or Explorer approval.

## Identity

- Project: `Data Schema Migration Loss Gate`
- Current package revision: `8bb5ee8986162156bf52a1afd3bc79dd7b678d63`
- Package identity: `DSM-LG-POSTDEPLOY-8BB5EE8`
- Contract source: `contracts/main.py`
- Contract source SHA-256: `48E2F8D15720DAABCCA4B1D4F2DA9E336AE31A3A5D07B297201AE2B09291B53A`
- Contract schema SHA-256: `16A15785BD1ACA7DA89A0C73ADE7CBC22539AB403EDD10F82300F02F7B080EBF`
- Network: Studionet, chain ID `61999`
- Contract: `0xB6D90F9dCbf14A2C638bA62de9ec43e738FCf69d`
- Judge-visible Vercel alias: `https://data-schema-migration-loss-gate.vercel.app` (corrected deployment smoke check HTTP `200`; deployed asset contains the journal-verification correction marker).
- Corrected Vercel deployment: `dpl_DQ6sreuRBDv4CfaTo6q3nUhZrcg4`, target `production`, immutable URL `https://data-schema-migration-loss-gate-5hwr0b56k-nec10.vercel.app`, aliases `data-schema-migration-loss-gate.vercel.app` and `data-schema-migration-loss-gate-nec10.vercel.app`, built from the corrected frontend tree at `8bb5ee8`.
- Prior Vercel deployment metadata: `dpl_FrgkZoLbF3d86R7qLraSCvXvZbPc` target `production`, aliases `data-schema-migration-loss-gate.vercel.app` and `data-schema-migration-loss-gate-nec10.vercel.app`, built from superseded frontend release `4c91ce1`; retained as historical evidence and not claimed as this package's corrected release.
- Immutable deployment URL: `https://data-schema-migration-loss-gate-4uchp2xxw-nec10.vercel.app` is SSO-protected (HTTP `302` to `/sso-api`), so it is metadata-only and no public HTTP-200 application claim is made for it.
- Deployment transaction: `0x93825fc61758708299cd0f7b8ff94728aabbbb94453f4387296ebf4facd47d3d`
- Studio deployer/primary: `0xeF5D2119416A2f5afa35dCFA209766EFC1BE5902`
- Studio mapper/secondary: `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78`
- Studio evidence mode: `OBSERVABLE_ACTION_LEDGER`; no physical network request count is claimed.

The retained Studio packages and deployed-source commits are historical provenance. The contract address and contract source hash remain unchanged. The previous Vercel journey is superseded by the journal-integrity correction in `8bb5ee8`. The corrected deployment is READY; the affected E2E rerun remains blocked by loss of the locked Chrome tab and therefore this package makes no current Vercel PASS claim.

## Live Vercel E2E proof

The prior primary-AI-controlled Case 4 journey is retained in [docs/preflight/vercel-e2e-completion.md](preflight/vercel-e2e-completion.md) as superseded evidence for frontend release `4c91ce1`. It used the separate external OKX account `0xe8d6c55838c39301c11d54fc9a38b9de298329f6`, not the Studio deployer, and reached `DONE`, `LOSSLESS`, revision `5`. The corrected deployment is recorded above, but its required J0-J7 rerun is currently `BLOCKED_ACCESS` because Chrome instance `2` no longer exposes the locked tab `1145402204`; no corrected-release E2E or F-020 closure is claimed.

## Live Studio proof matrix

Every consequential write below was checked as `FINALIZED`, semantic GenVM `SUCCESS` or the explicitly retained finalized error, consensus `Accepted` where successful, and authoritative historical readback. Failed attempts are retained diagnostic evidence and were not counted as successful journeys.

| Row | Material path | Transaction evidence | Authoritative result | Status |
|---|---|---|---|---|
| R0 | Deployed interface and empty baseline | `get_count()` returned `0` | Deployed schema/interface parity and empty state | PASS |
| C1 | Compatible mapping: create, lock, put identity, freeze, evaluate | `0xa789a11059c08fdf67bc1ca8860c27cef3009ff4fdb12b6d95c83e99f894c0d4`, `0x533fcd546c7b6715b5f1808c91d67523665d7f9510897aec75694a8810bd2694`, `0xb9c7d1f8232c233f4214d568d18ca08ac8247ef3e1062d793af1c5f435d79b77`, `0x89af7deaacc64577cda291c614f01f5109784aa9ebc3ef3e53cb33236befb997`, `0x4d58832fb28a5a27f250100f9d6918e77280d25b2aaf2667abe55cca61d5632f` | `DONE`, `LOSSLESS`, revision `5`, result `SAME` | PASS |
| C2 | Structural loss: historical Studio chain retained | `0xcfe3d2b1cc568140b95bb83f813e64bc10a62ddf0899d9acf0bf9be020765c73`; authoritative contract-index row, FINALIZED/SUCCESS consensus evidence, return value `2`, and `get_case(2)` readback | `DONE`-path structural-loss fixture retained with exact legacy/current base and no duplicate create | PASS |
| C3 | Unauthorized and stale-revision controls | `0xa601e2bb76409aab6d3c8f9791a34c3a6bb81b9f7751da5811b3bf0e3d538c93`, `0x95c752e5f021a5b223c7ac9feb54a7cc0ebcb45d074be851e92f917a6210c9ac` | Finalized rollback `NOT_AUTHORIZED` and `STALE_REVISION`; state unchanged at `BASE_DRAFT`, revision `1` | PASS |
| C4 | UNKNOWN/UNRESOLVED retry boundary | No live concrete evaluation entered this branch; no synthetic transaction was created | Local boundary tests cover cooldown/max-three behavior; live trigger `NOT_TRIGGERED` | NOT TRIGGERED |

Retained UI/infrastructure failures:

- `0x80f57976a33a14fc0ee4c57259ae6f456d8a2f1b4e80f5f64f56286b6200d9ea`: finalized `BAD_ADDRESS` rollback from incorrect unquoted address serialization; corrected create passed.
- `0x65b5a573739f7f870cdffd87aa527fe1cbf82a128c7130c945f03e2814037e04`: finalized `BAD_ID` rollback because numeric DOM edits did not commit Studio semantic state; corrected semantic input passed.
- One Explorer transaction page returned HTTP 503 and recovered after one bounded reload; no transaction was duplicated.

The earlier C2 short-hash transcription is superseded history; the exact 66-character hash above is canonical. Detailed secret-free action and reconciliation records remain in the local preflight evidence directory.

## Local verification

From `E:\Genlayer-Projects\data-schema-migration-loss-gate`:

- `gltest -q tests`: PASS; 20 contract tests.
- `genvm-lint check contracts/main.py --json`: PASS.
- `genvm-lint typecheck contracts/main.py`: PASS.
- `npm --prefix frontend run test`: PASS; 10 files / 43 tests.
- `npm --prefix frontend run build`: PASS; non-blocking Vite chunk-size warning.
- `npm --prefix frontend run playwright`: PASS; 3 tests.
- `git diff --check`: PASS.

## Next release gate

- Frontend RPC plan/matrix: `docs/RPC-BUDGET.md`.
- Exact Vercel plan: `docs/VERCEL-E2E-PLAN.md`.
- Exact Vercel E2E plan: `docs/VERCEL-E2E-PLAN.md`, refreshed for package `DSM-LG-POSTDEPLOY-8BB5EE8` and frontend release `8bb5ee8986162156bf52a1afd3bc79dd7b678d63`.
- Exact corrected deployment evidence: `docs/preflight/vercel-corrected-deployment.md` records `dpl_DQ6sreuRBDv4CfaTo6q3nUhZrcg4` and the alias smoke result.
- Exact corrected Vercel E2E evidence: `docs/preflight/vercel-e2e-completion.md` remains a superseded-history record; the current rerun is blocked in `docs/preflight/vercel-e2e-blocked-tab.md` and must resume on the locked tab before claiming Vercel PASS.
- GitHub target is public at the current documentation revision; Vercel deployment is READY. No wallet signature, final approval, or Explorer submission is claimed here.
