# Data Schema Migration Loss Gate

Data Schema Migration Loss Gate is a public evidence workstation for deciding whether an explicit mapping from an old record schema to a new one preserves information.

> All submitted text will be public and permanent. Do not include private information, credentials or personal records.

The gate assesses only the declared schemas and mapping. It does not migrate data or verify external facts.

## Verified links

- [Studionet contract](https://explorer-studio.genlayer.com/address/0xB6D90F9dCbf14A2C638bA62de9ec43e738FCf69d)
- [Deployment transaction](https://explorer-studio.genlayer.com/tx/0x93825fc61758708299cd0f7b8ff94728aabbbb94453f4387296ebf4facd47d3d)
- [Live Vercel app](https://data-schema-migration-loss-gate.vercel.app)
- [Verification evidence](docs/VERIFICATION.md)

## The trust problem

A schema owner can describe a source and destination schema, while a mapper can propose renames, casts, defaults or dropped fields. Neither party should be able to label that mapping “lossless” by assertion alone. The contract freezes both inputs, evaluates every mapping row under one explicit rule set, and stores the result and revision history on-chain.

## Why GenLayer is essential

Structural rules are deterministic: dropping a field loses information, narrowing a type is lossy, duplicate targets are invalid, and required untargeted fields need valid defaults. The remaining question—whether the declared meanings of mapped fields are the same, different or ambiguous—requires semantic judgment.

GenLayer validators independently evaluate that bounded, frozen input. Consensus accepts only a schema-valid result; the contract then deterministically reduces the structural and semantic findings to one of:

- `LOSSLESS`: the declared mapping preserves information;
- `LOSS_FOUND`: at least one structural or semantic loss is present;
- `UNRESOLVED`: semantic ambiguity prevents a conclusive result.

The stored outcome changes only after consensus. A frontend success state additionally requires transaction finality, successful execution and authoritative contract readback.

## How it works

1. The schema owner creates a case with old and new field definitions.
2. The owner reviews and locks the schemas.
3. The mapper supplies one explicit mapping row for every old field and any required defaults.
4. The mapper freezes the mapping.
5. Any evaluator requests assessment of the frozen case.
6. The contract applies deterministic loss rules, obtains validator consensus for semantic equivalence, stores the outcome and preserves the exact historical revision.

The browser journal retains submitted transaction context across reloads. A pending or uncertain write must be reconciled by its original hash or authoritative state; it is never automatically resubmitted.

The public app also provides a guarded recovery path for a known submitted hash. Recovery is accepted only after finality, caller/method, canonical arguments hash and authoritative historical readback agree.

## Actors and contract lifecycle

- **Schema owner (primary):** creates a case, edits the complete schema pair and locks it.
- **Mapper (secondary):** submits and freezes the mapping and defaults.
- **Evaluator:** evaluates a frozen case and may retry an agreed `UNRESOLVED` result after the on-chain cooldown, up to the contract limit.

The main lifecycle is `BASE_DRAFT → BASE_LOCKED → RESPONSE_DRAFT → FROZEN → DONE`, with `UNRESOLVED` and `EXHAUSTED` as bounded retry states. Every committed mutation increments the revision and stores an immutable historical record.

## Architecture

```text
React/Vite frontend
  ├─ explicit EIP-6963 wallet selection and session events
  ├─ bounded transaction lifecycle and crash-recoverable journal
  └─ finalized execution plus historical readback verification
                         │
                         ▼
GenLayer Studionet contract
  ├─ deterministic schema, mapping, authority and revision guards
  ├─ one bounded semantic consensus step on frozen input
  └─ canonical current state, indexes and revision history
```

There is no backend, hosted database or private API. The contract is the source of truth; browser storage contains only local transaction-recovery records.

## Intelligent Contract surface

The contract exposes writes for case creation, schema replacement/locking, mapping submission/freezing, evaluation and bounded retry. Views return current cases, exact historical versions, nonce resolution and paginated case/actor/child indexes. See [the contract source](contracts/main.py) and [generated schema](contract-schema.json).

The semantic evaluator receives only canonical frozen JSON between explicit untrusted-data delimiters. It returns a fixed meanings vector in old-field order. Validators independently reevaluate and compare the complete consequential result; malformed, contradictory or disagreement paths do not commit a conclusive outcome.

## Transaction lifecycle

The frontend records an intent before wallet interaction, submits at most one transaction, and polls the same hash with a bounded schedule. A write is shown as verified only after:

1. lifecycle status is `FINALIZED`;
2. semantic execution is successful;
3. the exact method-specific historical readback matches the submitted operation.

Wallet rejection removes only an unsigned reservation. Timeout, transport uncertainty, a missing hash or a readback mismatch remains recoverable and blocks conflicting writes. Account, provider, chain and write-client changes are committed as one session state.

## Run locally

Prerequisites:

- Python and the GenLayer contract test/lint tooling used by this repository;
- Node.js and npm;
- an EIP-6963 wallet provider supported by the app (MetaMask, OKX Wallet or Rabby) for live writes.

Install and start the frontend:

```powershell
Copy-Item frontend/.env.example frontend/.env
# Set VITE_CONTRACT_ADDRESS in frontend/.env to the verified Studionet contract.
npm --prefix frontend install
npm --prefix frontend run dev
```

The frontend is configured for Studionet and must use the verified contract address. It performs no chain or wallet request on initial page load.

## Tests and verification

```powershell
gltest -q tests
genvm-lint check contracts/main.py --json
genvm-lint typecheck contracts/main.py
npm --prefix frontend run test
npm --prefix frontend run build
npm --prefix frontend run playwright
```

Current verified results are 20 contract tests, 49 frontend tests and 4 Playwright tests passing; contract lint/typecheck and the production frontend build pass. The build emits the documented non-blocking Vite chunk-size warning. Exact Studionet transactions, source hashes, readbacks and release evidence are recorded in [docs/VERIFICATION.md](docs/VERIFICATION.md).

## Deployment and source parity

- Network: Studionet, chain ID `61999`.
- Contract: `0xB6D90F9dCbf14A2C638bA62de9ec43e738FCf69d`.
- Deployment transaction: `0x93825fc61758708299cd0f7b8ff94728aabbbb94453f4387296ebf4facd47d3d`.
- Contract source SHA-256: `48E2F8D15720DAABCCA4B1D4F2DA9E336AE31A3A5D07B297201AE2B09291B53A`.
- Contract schema SHA-256: `16A15785BD1ACA7DA89A0C73ADE7CBC22539AB403EDD10F82300F02F7B080EBF`.
- Judge-visible Vercel alias: `https://data-schema-migration-loss-gate.vercel.app` (corrected production deployment, HTTP 200 smoke check).
- Final Vercel deployment: `dpl_9kf456TWHDGPrHyLQ3h64o8Y8td7`, built from release `0dd31751281e89ed764356770d357b7862615505`; exact-release Case 7 reached authoritative `DONE`, `LOSSLESS`, revision `5` after five unique writes and passed reload/reconnect with 58 measured RPC requests, 0 retries and 0 failures.

The deployed contract is intentionally frozen. Recovery relies on preserved source/schema parity, nonce-based create reconciliation, exact revision history and deployment of a separately reviewed successor if a future change is required.

## Security and trust boundaries

- Submitted material is public and permanent; private or credential-bearing input is out of scope.
- JSON objects, identifiers, types, sizes, enum values and mapping cardinality are validated exactly; unknown fields and coercions are rejected.
- Roles and expected revisions are enforced by the contract, not only by the UI.
- User-supplied text is rendered as text, never executable HTML or trusted links.
- Wallet discovery accepts only exact supported EIP-6963 providers with callable EIP-1193 `request` methods and deduplicates UUID/provider identity.
- Journal records from another chain or contract are quarantined and cannot be replayed under the active context.
- Finality alone is not success; execution and authoritative readback are required.

## Known limitations

- The result covers only the declared record schema and mapping; it does not execute a migration or inspect real datasets.
- Semantic equivalence can remain `UNRESOLVED`; retries are cooldown- and count-bounded.
- The live Studio matrix did not synthetically force an `UNRESOLVED` case; that boundary is covered by automated tests.
- The immutable Vercel deployment URL is SSO-protected; judges use the stable public alias linked above. Request-level RPC evidence is exposed in the Recovery Journal panel.
