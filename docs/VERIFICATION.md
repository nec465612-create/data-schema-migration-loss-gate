# Verification

`DOCUMENT_STATUS: POST_GITHUB_VERCEL_FINAL_EVIDENCE_COMPLETE`

`FINAL_PACKAGE: DSM-LG-FINAL-DF8C8F2`

This document binds the live Studionet evidence, public repository, final Vercel deployment and exact-release Vercel E2E. Anonymous `POST_GITHUB_VERCEL_FINAL` approval is still required; this document does not claim that approval or Explorer submission approval.

## Identity

- Project: `Data Schema Migration Loss Gate`
- Current package revision: `df8c8f2f1a96fdc14e75725adaca60458e1d2114`
- Package identity: `DSM-LG-FINAL-DF8C8F2`
- Contract source: `contracts/main.py`
- Contract source SHA-256: `48E2F8D15720DAABCCA4B1D4F2DA9E336AE31A3A5D07B297201AE2B09291B53A`
- Contract schema SHA-256: `16A15785BD1ACA7DA89A0C73ADE7CBC22539AB403EDD10F82300F02F7B080EBF`
- Network: Studionet, chain ID `61999`
- Contract: `0xB6D90F9dCbf14A2C638bA62de9ec43e738FCf69d`
- Judge-visible Vercel alias: `https://data-schema-migration-loss-gate.vercel.app`.
- Final Vercel deployment: `dpl_4PF7a7EBgR5DijmKTCPPksHp7u6r`, target `production`, immutable URL `https://data-schema-migration-loss-gate-f3rmouc8z-nec10.vercel.app`, built from `df8c8f2f1a96fdc14e75725adaca60458e1d2114` and aliased to the judge-visible URL.
- Prior Vercel deployment metadata: `dpl_FrgkZoLbF3d86R7qLraSCvXvZbPc` target `production`, aliases `data-schema-migration-loss-gate.vercel.app` and `data-schema-migration-loss-gate-nec10.vercel.app`, built from superseded frontend release `4c91ce1`; retained as historical evidence and not claimed as this package's corrected release.
- Immutable deployment URL: `https://data-schema-migration-loss-gate-4uchp2xxw-nec10.vercel.app` is SSO-protected (HTTP `302` to `/sso-api`), so it is metadata-only and no public HTTP-200 application claim is made for it.
- Deployment transaction: `0x93825fc61758708299cd0f7b8ff94728aabbbb94453f4387296ebf4facd47d3d`
- Studio deployer/primary: `0xeF5D2119416A2f5afa35dCFA209766EFC1BE5902`
- Studio mapper/secondary: `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78`
- Studio evidence mode: `OBSERVABLE_ACTION_LEDGER`; no physical network request count is claimed.

The retained Studio packages and deployed-source commits are historical provenance. The contract address and contract source hash remain unchanged. Earlier blocked and superseded frontend runs are not used as final-release proof. The final deployment is READY and the Case 6 journey below ran on that exact release.

## Live Vercel E2E proof

The primary AI controlled Chrome continuously on the final alias. OKX creator `0xe8d6c55838c39301c11d54fc9a38b9de298329f6` and mapper/evaluator `0xc3a438eba22c439cbce393f3f8c79bfcac8b27c6` are separate external browser accounts and are not the Studio deployer or mapper.

| Step | Exact final-release evidence | Status |
|---|---|---|
| J0–J1 | Clean reload started at `Connect wallet`; explicit OKX selection connected to Studionet `61999`; no startup write | PASS |
| J2 create Case 6 | `0x4335dbf0fb1655c7b923f209d3a1fbf8558ca4825a47637c9bfa95a29cf55d12`; creator/mapper distinct; automatic finality/execution/readback; `BASE_DRAFT`, revision `1` | PASS |
| J3 lock | `0xea20be2b0b4b0a9aab16f639ddf50da4dc2e8150f852618ea70d6aefe51efa45`; automatic finality/execution/readback; `BASE_LOCKED`, revision `2` | PASS |
| J4 identity mapping | `0xdf6fc3d77f3a635312f5ded79c59d5f307b236a0a3359259f4ed30401feb2ac9`; `name` to `name`, `IDENTITY`; automatic `SUCCESS`; `RESPONSE_DRAFT`, revision `3` | PASS |
| J5 freeze | `0xab2012927684e35dbad7b6e7e56a11fb65615dcd61f6e05bc0b35aa4e23d7138`; automatic `SUCCESS`; `FROZEN`, revision `4` | PASS |
| J6 evaluate | `0x69fc3ad3a2b1d73ae9518773d18f0aef878bfe87d60f5191035785e41b7ef7f0`; automatic bounded finality/consensus/readback; `DONE`, `LOSSLESS`, revision `5`, result `SAME`, attempts `1` | PASS |
| J7 reload/reconnect | Reload started disconnected; explicit OKX reconnect, `get_count`, then one explicit Case 6 detail read returned visible `DONE · revision 5`, `LOSSLESS`, last operation `evaluate_migration` | PASS |

No Case 6 write required manual reconciliation, reload, replacement transaction or duplicate click. The earlier Case 5 run exposed a too-short receipt window; commits `88a2523` and `df8c8f2` added bounded finality coverage and a seventh-check regression before the fresh Case 6 rerun.

## Reusable live proof matrix

| Requirement / actor | UI action → contract method | Final transaction | Terminal and authoritative readback | Source / regression evidence |
|---|---|---|---|---|
| Schema Owner creates a distinct-actor case | Create Case → `create_schema_case` | `0x4335dbf0fb1655c7b923f209d3a1fbf8558ca4825a47637c9bfa95a29cf55d12` | `SUCCESS`; Case 6 `BASE_DRAFT`, revision `1`; creator and mapper exact | `contracts/main.py`; `frontend/src/App.tsx`; contract/frontend tests |
| Schema Owner seals schemas | Lock schemas → `lock_schemas` | `0xea20be2b0b4b0a9aab16f639ddf50da4dc2e8150f852618ea70d6aefe51efa45` | `SUCCESS`; `BASE_LOCKED`, revision `2` | contract phase/actor tests; frontend write/readback coordinator |
| Mapper supplies identity transform | Put mapping → `put_mapping` | `0xdf6fc3d77f3a635312f5ded79c59d5f307b236a0a3359259f4ed30401feb2ac9` | `SUCCESS`; exact `name → name`, `IDENTITY`; `RESPONSE_DRAFT`, revision `3` | mapping validation tests; Case 6 browser readback |
| Mapper seals response | Freeze mapping → `freeze_mapping` | `0xab2012927684e35dbad7b6e7e56a11fb65615dcd61f6e05bc0b35aa4e23d7138` | `SUCCESS`; `FROZEN`, revision `4` | phase/authorization tests; Case 6 browser readback |
| Evaluator invokes consensus | Evaluate → `evaluate_migration` | `0x69fc3ad3a2b1d73ae9518773d18f0aef878bfe87d60f5191035785e41b7ef7f0` | `SUCCESS`; consensus accepted; `DONE`, `LOSSLESS`, revision `5`, result `SAME`, attempts `1` | deterministic consequence/consensus tests; final reload/readback |
| Unauthorized/stale negative controls | Studio calls → guarded writes | `0xa601e2bb76409aab6d3c8f9791a34c3a6bb81b9f7751da5811b3bf0e3d538c93`, `0x95c752e5f021a5b223c7ac9feb54a7cc0ebcb45d074be851e92f917a6210c9ac` | finalized rollback `NOT_AUTHORIZED` / `STALE_REVISION`; state unchanged | contract negative tests and retained Studio readbacks |

## GitHub Presentation Gate

- Repository: `https://github.com/nec465612-create/data-schema-migration-loss-gate`.
- Verified public, not private; default branch `main`; API head `2093be2e59d2441b91712b5179af67ef9539c083` at the post-push check.
- Repository page, raw README and final Vercel alias each returned HTTP `200`.
- Public tree contains source, schema, frontend, tests and reviewer-facing documentation; ignored local preflight state is not published.
- README presents purpose, GenLayer mechanism, actor flow, transaction lifecycle, run/test instructions, deployment identity, trust boundaries and limitations.

`GITHUB_PRESENTATION_GATE: PASS`

## GENLAYER SUBMISSION CATEGORY AND SCORECARD

Category: `PROJECT`

Validity gate: `PASS`

- GenLayer fit: `4/5`. Evidence: the on-chain outcome is produced through GenLayer leader/validator consensus and drives a durable `LOSSLESS`/`LOSS_FOUND` migration verdict; exact contract and Case 6 live evaluation inspected. Weakness/blocker: the bounded schema vocabulary intentionally limits the breadth of semantic cases.
- Contract quality: `4/5`. Evidence: strict actors, expected revisions, immutable version history, nonce idempotency, exact mapping/default validation, deterministic consequence checks, consensus result validation and bounded retry are covered by 20 contract tests plus live positive and negative paths. Weakness/blocker: live `UNRESOLVED` was not naturally triggered and is supported by deterministic tests rather than a fabricated transaction.
- Engineering: `4/5`. Evidence: public incremental Git history, reproducible lint/typecheck/tests/build, 10 files/47 frontend tests, 3 Playwright tests, source/schema hashes, retained transaction journal and exact deployment/evidence binding. Weakness/blocker: Vite reports a non-blocking large-chunk warning.
- Frontend / UX: `4/5`. Evidence: final public Vercel app supports explicit wallet choice, distinct actor switching, validation, five-write lifecycle, hash retention/copy, finality/execution/readback gating, recovery journal and successful J0–J7 judge journey. Weakness/blocker: request-level Chrome telemetry was unavailable, so the RPC evidence uses the disclosed observable-action ledger instead of invented physical counts.

Overall evidence-based assessment: strong, complete GenLayer Project with a real consensus-critical contract, public reproducible implementation and exact-release live journey; remaining weaknesses are disclosed and do not falsify the demonstrated path.

Submission recommendation: `NOT READY` pending mandatory anonymous `POST_GITHUB_VERCEL_FINAL` approval; technical and live evidence is ready for that review.

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
- `npm --prefix frontend run test`: PASS; 10 files / 47 tests.
- `npm --prefix frontend run build`: PASS; non-blocking Vite chunk-size warning.
- `npm --prefix frontend run playwright`: PASS; 3 tests.
- `git diff --check`: PASS.

## Final release gate

- Frontend RPC plan/matrix: `docs/RPC-BUDGET.md`.
- Exact Vercel plan: `docs/VERCEL-E2E-PLAN.md`.
- Exact Vercel E2E plan: `docs/VERCEL-E2E-PLAN.md`.
- Exact final deployment: `dpl_4PF7a7EBgR5DijmKTCPPksHp7u6r`; public alias `https://data-schema-migration-loss-gate.vercel.app`.
- GitHub target: `https://github.com/nec465612-create/data-schema-migration-loss-gate`, public `main` at the current evidence revision after this documentation commit is pushed.
- Next gate: retained anonymous reviewer at `POST_GITHUB_VERCEL_FINAL`; no final or Explorer approval is claimed here.
