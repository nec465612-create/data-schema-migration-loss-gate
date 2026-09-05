# Design Brief — Data Schema Migration Loss Gate

## Handoff status

- Scope: substantial public frontend redesign, iteration 1 of a maximum of 2.
- Implemented frontend revision: `ff9268dd32b7749d38f81831a1904b4f93f8c8e0`.
- The functional shell is complete. Claude owns the visible presentation redesign; the primary AI retains architecture, behavior, verification and acceptance ownership.
- This brief is a project-local design constraint and review brief. It is not an instruction to change the contract, wallet/session infrastructure, journal, tests, configuration or release state.

## Product-specific design brief

Data Schema Migration Loss Gate is a public evidence workstation for one narrow question: does an explicit mapping from a declared old schema to a declared new schema preserve information? A first-time user or GenLayer judge must be able to understand the trust boundary before connecting a wallet or submitting anything.

The visible product journey is:

1. understand the question, public-data warning and assessment disclaimer;
2. discover and explicitly choose an actually detected MetaMask, OKX Wallet or Rabby provider;
3. confirm the configured network and wallet state;
4. create or open a case;
5. compare the old and new schema definitions;
6. submit and freeze the mapper's explicit mapping and defaults;
7. evaluate the frozen case and read the resulting LOSSLESS, LOSS_FOUND or UNRESOLVED outcome with its historical evidence;
8. recover or export retained transaction context when a write is pending, inconclusive, finalized with an error, quarantined or requires reconciliation.

The information architecture must follow this evidence journey rather than a generic crypto dashboard or marketing landing-page template. Public documentation may be an in-page “How it works” section or equivalent navigation target inside the existing application; it must use the exact final labels and explain the actual path.

## Audience, actors and content hierarchy

- Audience: a first-time public user and an independent GenLayer judge with no Task or developer context.
- Schema owner: declares, edits and locks the old/new schemas.
- Mapper: supplies and freezes the explicit mapping rows and defaults.
- Evaluator: may evaluate a frozen case and retry an agreed unresolved result after the contract's cooldown.
- Evidence: case phase, revision, actors, last operation, outcome, transaction hash, finality, semantic execution result and authoritative readback are factual state; they must not be presented as decorative badges or optimistic success.

The first viewport must answer “Does this mapping preserve information?”, state that only the exact submitted material is assessed, and show the public-data warning. The next visible layer should make wallet/network prerequisites and the three roles understandable. The case editor, schema comparison, mapping/default controls, result/readback and recovery journal must remain discoverable and coherent.

## Visual direction

The visual identity should be specific to a careful schema-audit workstation: calm, precise, legible and evidence-led. The existing rationale permits warm paper-like surfaces, ink-dark text, restrained verification accents and caution accents, but Claude owns the final visual direction, macrostructure, typography pairing, component composition, spacing and brand expression. The result must feel authored for this product, not like a color-swapped shared template.

If a brand mark is used, it should express two schema columns converging into one checked gate. Do not use coin, shield, chain, generic AI sparkle or stock imagery metaphors. Do not invent metrics, testimonials, logos, case counts or success claims.

## Negative constraints

- No generic crypto/DeFi dashboard, copied SaaS hero, repetitive feature-card grid, arbitrary gradients or glows, excessive pills, decorative clutter or identical section rhythm.
- No fake browser/phone/IDE chrome, executable Markdown, `innerHTML`, untrusted URLs as trusted links, or fabricated/seed-only data presented as real.
- No static wallet catalog, unavailable wallet tiles, generic injected-wallet option or wallet option that does not carry the discovered provider.
- No hidden required fields, hover-only meaning, misleading status, optimistic success or animation used as evidence.
- No internal reviewer, AI, checkpoint, debug, private-owner or developer-only language in the public UI.
- Do not change the existing information architecture or behavior outside the approved presentation layer.

## Required quality and acceptance checks

- Complete polished public product, not only a restyled main form: branding, introduction/problem statement, accurate GenLayer role, Docs/How it works, workflow guidance, navigation, network/contract context, all existing sections and all product-applicable states.
- Preserve exact public warning, exact assessment disclaimer and test-visible labels.
- Preserve text-node rendering for all submitted/evaluator data and all existing functional calls.
- Every applicable interaction remains understandable in default, hover, focus-visible, active, disabled, loading, error and success states; pending, finality, readback, reconciliation and quarantine copy must remain visible without relying on motion.
- Semantic HTML, real labels/accessibility names, keyboard operation, visible focus ring, accessible status/live regions and readable long-content behavior.
- Responsive acceptance at 320, 375, 414 and 768 CSS pixels: no horizontal page scroll, no clipped controls, no two-line clickable labels, usable schema comparison and mapping controls on mobile.
- Use the Hallmark anti-slop review: structural variety, honest copy, named CSS tokens, no italic display headings, reduced motion, no layout-property animation and no fake chrome. Work within the project boundary: do not create `tokens.css`, `.hallmark/log.json` or any other unapproved file.

## Allowed implementation boundary

Claude may modify only:

- `frontend/src/App.tsx`
- `frontend/src/styles.css`
- optional local visual asset(s) under `frontend/src/assets/`

Claude must not modify `contract.ts`, `pending.ts`, `progress.ts`, `main.tsx`, tests, package/config files, contracts, schemas, documentation, governance, `.hallmark/` or release artifacts.

The existing wallet discovery, canonical wallet-session store, SDK calls, chain/address configuration, Web Locks, journal, operation fingerprint, transaction lifecycle, RPC budget, hash inputs, finality checks, authoritative readback and test meaning are fixed behavior boundaries.
