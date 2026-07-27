# foldsig

**Live:** [sjgant80-hub.github.io/foldsig](https://sjgant80-hub.github.io/foldsig/)

A **fold-signature** format + validator — describe a thing as a **recipe**, not a snapshot. A fold-signature
is an ordered fold-DAG on a prime spine, starting from a common seed: a program that *generates* the object,
not a picture of it. (An STL file is a surface; this is the construction.) The format precedes any hardware
that would read it — and its worth is checkable **now, in software**, by three gates.

## The three gates

1. **Round-trip** — `serialize → parse → serialize` is **byte-identical**, so the recipe is unambiguous (a
   quine; it can't drift).
2. **Witness** — the recipe **closes**: it resolves at least κ (= φ⁻¹ ≈ 0.618) of what it generates, rather
   than running away. Generation far outrunning resolution never settles into a definite thing.
3. **Compose — NON-MASKING** — two signatures fold into a valid larger one **only if every part
   independently closes.** A stable half can never carry a runaway half — *even when the aggregate would
   look fine.* This is the format-level twin of the law [`konomify`](https://sjgant80-hub.github.io/konomify/)
   enforces on modules: **a build is only as sound as its weakest part.**

Content-addressed: `hash(canonical(sig))` is the object's true name — same recipe, same name, any machine.

## Use

```js
import { validate, compose, hash } from 'foldsig';

validate(sig)           // → { shape, roundtrip, witness:{stable,forge,resolve,ratio}, hash, valid }
compose(a, b)           // → { ok, signature, hash } — or { ok:false, part, aggregateStable } if a part runs away
hash(sig)               // → 32 hex chars, the recipe's true name
```

A fold-op is `{ axis ∈ [2,3,5,7,11,13,17], angleK ∈ ℤ, depth ∈ ℤ⁺ }`; axis 17 is the resolver.

## What it is / isn't

- **Is:** a real, tested, composable format with genuine guarantees — round-trip determinism, non-masking
  composition, content-addressing. Everything here is buildable software, today, zero dependencies.
- **Isn't:** a machine that folds anything into matter. It *describes* a fold; nothing here condenses one.
  "Valid" means *internally consistent, closes, composes* — not "has been built."

The load-bearing guarantees (round-trip, non-masking compose, content-address) are exact; the witness ratio
(κ = φ⁻¹) is the estate's stability convention. Carry a validated signature in a card with `fallkard-forge`.

Zero dependencies. Deterministic. MIT.
