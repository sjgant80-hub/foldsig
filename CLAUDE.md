# CLAUDE.md — foldsig

## What this is
A fold-signature format + validator: describe an object as a generative fold-DAG recipe, validate it by
round-trip / witness / non-masking-compose, content-address it by hash. Pure software, zero deps.

## Invariants (do not regress)
- **Deterministic, never-throw.** Same signature ⇒ same canonical/hash/verdict. Every function tolerates
  junk input and returns a safe result — no exceptions out of `validate`, `compose`, `witness`, `hash`.
- **Canonical form is byte-exact.** Fixed key order, no whitespace. Round-trip must stay byte-identical or
  the format is ambiguous. Don't "prettify" the serializer.
- **Non-masking compose.** A composite is valid only if EVERY part independently closes — never trust the
  aggregate. This is the load-bearing guarantee; the `aggregateStable` field exists to prove the per-part
  check is what caught a runaway. Never weaken it to an aggregate-only check.
- **Content-address = true name.** `hash(canonical(sig))`. Same recipe ⇒ same name, always.

## Honest scope
`valid` means *internally consistent, closes, composes* — NOT "has been built into matter." foldsig
describes a fold; it condenses nothing. Keep the README/SPEC honest about that line.

## Convention vs guarantee
Load-bearing (exact): round-trip, non-masking compose, content-address. Convention (framework flavour): the
witness ratio κ = φ⁻¹ and axis 17 as the resolver. If you change the convention, say so; don't touch the
guarantees.

## Verify
- `npm test` — 7 tests. The keystone is the non-masking compose test (aggregate stable, composite rejected).
- Gate with witness before publishing: `npx github:sjgant80-hub/witness mutate foldsig.mjs`.
