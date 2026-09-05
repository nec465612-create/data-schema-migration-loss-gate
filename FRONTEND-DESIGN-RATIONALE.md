# Frontend Design Rationale

## Product identity

This is a public evidence gate for one narrow question: does a declared old/new data schema mapping preserve information? The interface should feel like a careful evidence workstation, not a generic crypto dashboard. Its visual language is a calm “audit desk”: warm paper-white surfaces, ink-dark typography, teal verification accents, amber public-data warnings, and compact evidence labels.

## Judge journey

The first viewport explains the product and the trust boundary before any wallet or chain request. The public warning is visible early. The main journey is ordered as:

1. discover and choose an allowlisted wallet;
2. confirm the configured network;
3. create or open a case;
4. compare old and new schema tables;
5. submit and freeze the mapper's explicit rows;
6. read the outcome and its exact historical record.

The interface must make roles legible: the primary schema owner edits/locks schemas, the mapper supplies/finalizes mapping rows, and any evaluator may run the assessment. State, revision, last operation and outcome are evidence, not decorative status.

## Visual system

- Use a distinctive editorial heading with a restrained monospace eyebrow for candidate/checkpoint context.
- Use generous white space and a two-column schema comparison on wide screens; collapse to one column without horizontal page overflow on narrow screens.
- Use teal only for verified/available actions and outcomes; amber for public-data and wrong-network cautions; red for actionable errors.
- Keep tables dense enough for comparison but never hide required fields behind hover-only controls.
- Use a small geometric “split-to-check” mark if a brand mark is introduced; it should suggest two schema columns converging into one verified gate, not a shield, coin, chain, or generic AI sparkle.
- Respect reduced motion. Any pending state must preserve explanatory text and never depend on animation to communicate truth.

## Non-negotiable behavior boundary

The redesign is presentation-only. It must not change the SDK client, chain/address configuration, provider discovery, wallet/session state, journal format, Web Locks, transaction lifecycle, RPC counts, hash rules, readback verification, contract calls, or test meaning. The visible UI must continue to render all submitted/evaluator text as text nodes and retain the exact public warning and assessment disclaimer.

## References

- `E:\Genlayer-Projects\data-schema-migration-loss-gate\frontend\src\App.tsx`
- `E:\Genlayer-Projects\data-schema-migration-loss-gate\frontend\src\styles.css`
- `E:\Genlayer-Projects\data-schema-migration-loss-gate\frontend\src\contract.ts`
- `E:\Genlayer-Projects\data-schema-migration-loss-gate\frontend\src\pending.ts`
- `E:\Genlayer-Projects\data-schema-migration-loss-gate\frontend\tests\flow.spec.ts`
- `E:\Genlayer-Projects\data-schema-migration-loss-gate\FRONTEND-DESIGN-RATIONALE.md`

Current official GenLayer references checked for this frontend boundary:

- https://docs.genlayer.com/developers/decentralized-applications/genlayer-js
- https://docs.genlayer.com/developers/decentralized-applications/writing-data
- https://docs.genlayer.com/developers/decentralized-applications/querying-a-transaction
- https://docs.genlayer.com/api-references/genlayer-node/gen/gen_getTransactionStatus
- https://docs.genlayer.com/api-references/genlayer-linter
