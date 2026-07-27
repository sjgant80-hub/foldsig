import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidShape, canonical, parse, roundTrip, hash, witness, compose, validate, SPINE, KAPPA } from './foldsig.mjs';

const sig = (folds) => ({ seed: 'fold-0', spine: SPINE.slice(), folds });

test('shape validation: a fold-op needs a spine axis, an integer angle, and a positive-int depth', () => {
  assert.equal(isValidShape(sig([{ axis: 2, angleK: 1, depth: 3 }])), true);
  assert.equal(isValidShape(sig([{ axis: 4, angleK: 1, depth: 3 }])), false, '4 is not a spine prime');
  assert.equal(isValidShape(sig([{ axis: 2, angleK: 1, depth: 0 }])), false, 'depth must be > 0');
  assert.equal(isValidShape(sig([{ axis: 2, angleK: 1.5, depth: 3 }])), false, 'angleK must be an integer');
  assert.equal(isValidShape({ seed: 'not-fold-0', folds: [] }), false, 'seed must be fold-0');
  assert.doesNotThrow(() => isValidShape(null));
  assert.doesNotThrow(() => isValidShape({ folds: 'nope' }));
});

test('ROUND-TRIP: serialize→parse→serialize is byte-identical (the recipe is unambiguous)', () => {
  const s = sig([{ axis: 3, angleK: -2, depth: 5 }, { axis: 17, angleK: 1, depth: 8 }]);
  assert.equal(roundTrip(s), true);
  assert.equal(canonical(parse(canonical(s))), canonical(s));
  assert.equal(parse('{ not json'), null);
});

test('WITNESS: a recipe that generates without resolving runs away; resolving ≥ κ closes it', () => {
  assert.equal(witness(sig([{ axis: 2, angleK: 0, depth: 100 }])).stable, false, 'all forge, no resolve → runaway');
  assert.equal(witness(sig([{ axis: 17, angleK: 0, depth: 100 }])).stable, true, 'all resolver → stable');
  assert.equal(witness(sig([])).stable, true, 'the empty recipe is trivially stable');
  // resolve/forge must reach κ (≈0.618)
  const below = sig([{ axis: 2, angleK: 0, depth: 100 }, { axis: 17, angleK: 0, depth: 50 }]); // 50/150 = .33
  const at = sig([{ axis: 2, angleK: 0, depth: 10 }, { axis: 17, angleK: 0, depth: 17 }]);      // 17/27 = .63
  assert.equal(witness(below).stable, false);
  assert.equal(witness(at).stable, true);
});

test('COMPOSE non-masking: a stable half can NOT carry a runaway half, even when the aggregate looks fine', () => {
  const a = sig([{ axis: 2, angleK: 0, depth: 1 }, { axis: 17, angleK: 0, depth: 1000 }]); // very stable
  const b = sig([{ axis: 3, angleK: 0, depth: 1 }]);                                        // runaway (no resolver)
  // the AGGREGATE would pass — 1000 / 1002 ≈ 0.998 ≥ κ:
  const aggregate = witness({ seed: 'fold-0', folds: [...a.folds, ...b.folds] });
  assert.equal(aggregate.stable, true, 'the summed recipe looks stable — this is the masking trap');
  // but non-masking compose REJECTS it because b, alone, runs away:
  const r = compose(a, b);
  assert.equal(r.ok, false);
  assert.equal(r.part, 'b');
  assert.equal(r.aggregateStable, true, 'proves it was the per-part check, not the aggregate, that caught it');
});

test('COMPOSE: two stable recipes fold into a valid, hashed composite', () => {
  const a = sig([{ axis: 2, angleK: 0, depth: 10 }, { axis: 17, angleK: 0, depth: 17 }]);
  const b = sig([{ axis: 3, angleK: 0, depth: 5 }, { axis: 17, angleK: 0, depth: 9 }]);
  const r = compose(a, b);
  assert.equal(r.ok, true);
  assert.equal(r.signature.folds.length, 4);
  assert.match(r.hash, /^[0-9a-f]{32}$/, 'content-addressed, 128-bit');
});

test('HASH: content-addressing — same recipe same name, different recipe different name', () => {
  const a = sig([{ axis: 5, angleK: 2, depth: 3 }]);
  const b = sig([{ axis: 5, angleK: 2, depth: 3 }]);
  const c = sig([{ axis: 5, angleK: 2, depth: 4 }]);
  assert.equal(hash(a), hash(b));
  assert.notEqual(hash(a), hash(c));
  assert.equal(hash(a).length, 32);
});

// ── hardening: pin the branches the mutation gate found unguarded ─────────────
test('hardening: isValidShape returns false (not just non-throwing) for null and bad folds', () => {
  assert.equal(isValidShape(null), false);
  assert.equal(isValidShape({ seed: 'fold-0', folds: 'nope' }), false);   // folds not an array
  assert.equal(isValidShape({ seed: 'fold-0' }), false);                  // folds missing
});

test('hardening: hash is a fixed content-address — golden values pin the exact algorithm', () => {
  assert.equal(hash(sig([{ axis: 2, angleK: 0, depth: 1 }])), '7b275d20a9a42701888fbca3a9284f17');
  assert.equal(hash(sig([])), '405f99330413a996134f7a07ce5a9981');
});

test('hardening: witness.ratio = resolve/forge, and 1 for the empty recipe', () => {
  const w = witness(sig([{ axis: 2, angleK: 0, depth: 3 }, { axis: 17, angleK: 0, depth: 1 }]));
  assert.equal(w.forge, 4); assert.equal(w.resolve, 1); assert.equal(w.ratio, 0.25);
  assert.equal(witness(sig([])).ratio, 1);
});

test('hardening: validate — junk is not round-trippable/valid; a well-formed runaway is not valid', () => {
  const junk = validate({ junk: true });
  assert.equal(junk.roundtrip, false);
  assert.equal(junk.valid, false);
  const runaway = validate(sig([{ axis: 2, angleK: 0, depth: 100 }]));   // shape+rt ok, but runs away
  assert.equal(runaway.shape, true);
  assert.equal(runaway.roundtrip, true);
  assert.equal(runaway.witness.stable, false);
  assert.equal(runaway.valid, false, 'a runaway is never valid, however well-formed');
});

test('hardening: compose rejects a malformed part outright (either side)', () => {
  const good = sig([{ axis: 17, angleK: 0, depth: 5 }]);
  assert.equal(compose({ junk: true }, good).ok, false);
  assert.match(compose({ junk: true }, good).reason, /malformed/);
  assert.equal(compose(good, { junk: true }).ok, false);
});

test('validate: the whole gate in one call, never throws on junk', () => {
  const good = sig([{ axis: 2, angleK: 0, depth: 10 }, { axis: 17, angleK: 0, depth: 17 }]);
  const v = validate(good);
  assert.equal(v.valid, true);
  assert.equal(v.roundtrip, true);
  assert.equal(v.witness.stable, true);
  assert.match(v.hash, /^[0-9a-f]{32}$/);
  assert.equal(validate({ junk: true }).valid, false);
  assert.doesNotThrow(() => validate(null));
});
