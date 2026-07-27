# foldsig — specification

A fold-signature is a generative recipe whose validity is checkable in software with no hardware.

## Structure
`{ seed: 'fold-0', spine: [2,3,5,7,11,13,17], folds: [ {axis, angleK, depth}, … ] }`
- `seed` is always `'fold-0'` (the common un-folded start).
- `axis ∈ SPINE` (a prime); `17` is the **resolver** axis.
- `angleK ∈ ℤ` (golden-angle multiplier); `depth ∈ ℤ⁺`.
- File length = fold-depth: a simple object is a short DAG, a complex one deep.

## Gates
1. **`roundTrip(sig)`** — `canonical(sig) === canonical(parse(canonical(sig)))`. Canonical form has fixed key
   order and no whitespace, so the round-trip is byte-exact. Fails ⇒ the recipe is ambiguous.
2. **`witness(sig)` → `{ stable, forge, resolve, ratio }`** — `forge` = total depth, `resolve` = depth on
   axis 17. **Stable ⟺ `resolve ≥ κ·forge`** (κ = φ⁻¹). The empty recipe is trivially stable.
3. **`compose(a, b)`** — folds the two DAGs on the shared seed. **NON-MASKING:** returns `ok:true` only if
   `witness(a).stable ∧ witness(b).stable ∧ witness(composite).stable`. If a part runs away it returns
   `{ ok:false, part, aggregateStable }` — and `aggregateStable` may be `true`, which is the whole point: a
   runaway part is rejected even when the summed recipe would pass. A composite is only as sound as its
   weakest part.

## Content address
`hash(sig)` = 128-bit hash (four FNV-1a passes + fmix32) of `canonical(sig)` — 32 hex chars. Same recipe ⇒
same hash on every machine. The hash is the object's true name.

## Guarantees
- **Deterministic** — same signature ⇒ same canonical form, hash, and verdict, every run.
- **Never throws** — every function tolerates malformed input and returns a safe result.
- **Load-bearing:** round-trip determinism, non-masking composition, content-addressing. **Convention:** the
  witness ratio κ = φ⁻¹.

## Verification
`npm test` — 7 tests, incl. the non-masking case (aggregate stable, composite rejected because one part runs
away) — the guarantee that distinguishes foldsig from a naïve validator.
