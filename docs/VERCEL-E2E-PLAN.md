# Vercel E2E Plan

`DOCUMENT_STATUS: POST_DEPLOY_PLAN_NOT_EXECUTED`

This is the minimum-sufficient judge-perspective plan for the exact Build revision `5e531a6ea539a941fe3cbaba65c059693e6700b3`. It is submitted for the `POST_DEPLOY_TEST` checkpoint; it is not permission to open Chrome, push GitHub, deploy Vercel, or request a wallet signature. Explicit user start permission is required immediately before the later release/test preparation.

## Release identity and actor boundary

- Application: Data Schema Migration Loss Gate frontend in `frontend/`.
- Contract: Studionet `0xB6D90F9dCbf14A2C638bA62de9ec43e738FCf69d`, chain ID `61999`.
- Contract source hash: `48E2F8D15720DAABCCA4B1D4F2DA9E336AE31A3A5D07B297201AE2B09291B53A`.
- Browser: Google Chrome controlled continuously by the primary AI.
- Wallet: a separate fresh MetaMask, OKX Wallet, or Rabby account, never the Studio deployer or mapper account and never restored from their credentials.
- Wallet options: only real, callable, currently detected allowlisted providers; the tester explicitly chooses one before connection.
- User action: only confirm or reject wallet popups. The primary AI performs all navigation, input, reads, polling, lifecycle checks, and evidence capture.
- Self-service actor setup: for a fresh account, enter that same tester address as the mapper during create. This permits the tester to prove the public creator/mapper journey without Studio-account dependence; the evaluator role is then exercised by the same separate account after freeze.

## Initial state and evidence discipline

1. Open the exact final Vercel URL in a fresh Chrome tab with a clean page load and no retained application state.
2. Confirm the landing view explains the question, public-data warning, GenLayer evaluation boundary and visible `Docs/How it works` guidance.
3. Confirm no wallet request, chain read, contract read, polling loop or transaction occurs on initial render.
4. Record the exact Vercel deployment URL, commit/environment binding, browser tab, selected provider, tester address and chain before any write.
5. For each write, record UI progress phases, transaction hash, status-poll attempts, terminal receipt, finality, semantic execution result, consensus/finality, authoritative readback and visible result. Update the separate `FRONTEND RPC BUDGET EVIDENCE` table with actual counts; do not infer counts from planned maxima.

## Ordered critical journey

| Step | User-visible action | Expected proof and terminal condition |
|---|---|---|
| J0 | Read landing and How it works | Public warning and exact-material disclaimer are visible; no startup RPC. |
| J1 | Discover wallets, explicitly choose the detected provider, connect | Only detected allowlisted callable providers appear; connection is explicit; network/account state is accurate. Test cancellation/rejection once if the wallet exposes it, retaining a recoverable error and making no write. |
| J2 | Correct the network if needed, then create a case with a unique nonce, tester address as mapper, one compatible old/new field and identity mapping | Validation blocks malformed input before signing. After signature, show `WAITING_FOR_WALLET`/`SUBMITTED`/`WAITING_FOR_FINALITY`/`VERIFYING_EXECUTION`/`VERIFYING_READBACK` as observed. Success requires `FINALIZED`, semantic `SUCCESS`, and authoritative `BASE_DRAFT`, revision `1`. |
| J3 | Lock schemas | One explicit transaction; success requires finalized semantic success and authoritative `BASE_LOCKED`, revision `2`. |
| J4 | Put the explicit identity mapping | One explicit transaction; success requires authoritative `RESPONSE_DRAFT`, revision `3`, with the submitted mapping preserved. |
| J5 | Freeze mapping | One explicit transaction; success requires authoritative `FROZEN`, revision `4`. |
| J6 | Evaluate | One explicit transaction; success requires finalized semantic success, consensus/finality and authoritative `DONE`, `LOSSLESS`, revision `5`; visible outcome is `LOSSLESS` with result evidence. |
| J7 | Reload and reconnect | The page starts disconnected and needs fresh explicit provider choice. The result is reopened through an explicit read and is not silently restored as an authenticated session. |

## Unique consequence journey

Run a second fresh-case journey only if the first journey cannot prove the distinct advertised structural-loss path. Use a unique nonce, a new field present only in the old schema, and a `DROP` mapping. Repeat J3–J5, then evaluate. The required result is authoritative `DONE`, `LOSS_FOUND`, with the visible `LOSS_FOUND` outcome and the dropped-field result. Do not create duplicate transactions to repopulate an already-proven proof row.

If a natural live evaluation returns `UNRESOLVED`, retain the hash and verify the visible reconciliation boundary. A retry is allowed only after the retained record is reconciled and the contract cooldown/max-attempt rule permits it; never synthesize an UNKNOWN result or automatically resubmit to force this path. If the live run does not produce `UNRESOLVED`, record `NOT TRIGGERED` and rely on the deterministic local retry boundary tests rather than fabricating live evidence.

## Failure, reload and replay sweep

- Wrong network: block writes, show the configured network, and offer only the explicit switch action.
- Missing provider: show no fake wallet tile and a recoverable explanation.
- Wallet rejection/cancellation: remain disconnected or recoverable; no phantom success and no duplicate submission.
- Finalized execution error or readback mismatch: retain the real hash, show actionable failure/reconciliation, and do not label success.
- Hidden tab/unmount/abort during polling: stop automatic polling, preserve the submitted hash and journal entry, and resume only through explicit reconciliation.
- Reload with a retained journal: preserve/export/reconcile the record; archive remains behind export and verified terminal status.
- No automatic retry, replacement transaction, immediate recursive retry or second click while a write is pending.

## RPC budget binding

The separate `FRONTEND RPC BUDGET MATRIX` is `docs/RPC-BUDGET.md`. Planned ceilings remain:

- initial landing: `0` chain calls;
- wallet connect: at most the explicit discovery/account/chain sequence in the matrix;
- list IDs: one explicit read;
- open detail: one explicit read;
- one write: at most `6` observable calls in the bounded coordinator (`1` submission, up to `3` receipt polls, up to `2` authoritative readbacks);
- retry after uncertainty: `0` automatic calls until retained-hash reconciliation and explicit user action.

Actual counts, cache/dedupe, invalidation, polling intervals, retry delay/count, readbacks and transaction totals must be measured on the exact final Vercel release. Any amplification, duplicate write, unbounded polling, missing teardown or unexplained client is a release blocker and requires one diagnosed repair batch followed by a fresh exact-release run.

## Completion gate

The Vercel run is complete only after `READY_TO_START → RUNNING → SWEEPING → COMPLETE`, every required case is PASS, all finality/semantic/readback checks agree, the frontend evidence matrix is complete, and no judge-visible blocker remains. This plan does not authorize GitHub/Vercel actions and does not claim their evidence.
