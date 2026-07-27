// ════════════════════════════════════════════════════════════════
// foldsig · a fold-signature format + validator — describe a thing as a RECIPE, not a snapshot
//
// A fold-signature describes an object by its construction: an ordered fold-DAG on a prime spine, starting
// from a common seed. It's a program that GENERATES the thing, not a picture of it (STL is a surface; this
// is the recipe). The format precedes any hardware that would read it — an STL was valid before printers
// were good. So its worth is checkable now, in software, by three gates:
//
//   1. ROUND-TRIP   serialize→parse→serialize is byte-identical  → the recipe is unambiguous (a quine).
//   2. WITNESS      it "closes" (resolves at least κ of what it generates) rather than running away.
//   3. COMPOSE      two signatures fold into a valid larger one — NON-MASKING: a stable half can never
//                   carry a runaway half, even when the aggregate would look fine. (The same law konomify
//                   enforces on modules: a build is only as sound as its weakest part.)
//
// Content-addressed: the hash of the canonical recipe is the object's true name. Zero dependencies.
// Deterministic. The load-bearing guarantees are round-trip determinism, non-masking compose, and
// content-addressing; the exact witness ratio is the framework's stability convention (κ = φ⁻¹).
// ════════════════════════════════════════════════════════════════

export const SPINE = [2, 3, 5, 7, 11, 13, 17];   // prime axes; 17 is the resolver (resolution)
export const RESOLVER = 17;
export const KAPPA = (Math.sqrt(5) - 1) / 2;      // φ⁻¹ ≈ 0.6180339887

const isInt = (v) => typeof v === 'number' && Number.isInteger(v);
const isPosInt = (v) => isInt(v) && v > 0;

// A fold-op is { axis ∈ SPINE, angleK ∈ ℤ, depth ∈ ℤ⁺ }. Validate the whole signature's shape. Never throws.
export function isValidShape(sig) {
  if (!sig || typeof sig !== 'object') return false;
  if (sig.seed !== 'fold-0') return false;
  if (!Array.isArray(sig.folds)) return false;
  return sig.folds.every(f =>
    f && typeof f === 'object' && SPINE.includes(f.axis) && isInt(f.angleK) && isPosInt(f.depth));
}

// Canonical serialization: fixed key order, no whitespace — so round-trip is byte-exact. Never throws.
export function canonical(sig) {
  const folds = (Array.isArray(sig?.folds) ? sig.folds : [])
    .map(f => `{"axis":${f.axis},"angleK":${f.angleK},"depth":${f.depth}}`)
    .join(',');
  return `{"seed":"fold-0","spine":[${SPINE.join(',')}],"folds":[${folds}]}`;
}
export function parse(str) {
  try { const o = JSON.parse(str); return { seed: 'fold-0', spine: SPINE.slice(), folds: Array.isArray(o.folds) ? o.folds : [] }; }
  catch { return null; }
}
// serialize→parse→serialize must be byte-identical, or the recipe is ambiguous.
export function roundTrip(sig) {
  const a = canonical(sig);
  const b = canonical(parse(a) || {});
  return a === b;
}

// ── content address ──────────────────────────────────────────────────────────
// 128-bit hash of the canonical recipe = the object's true name (from fallhardened, inlined so this file
// is self-contained). Same recipe ⇒ same name, any time, any machine.
export function hash(sig) {
  const s = canonical(sig);
  let out = '';
  for (const seed of [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35]) {
    let h = seed;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    out += (h >>> 0).toString(16).padStart(8, '0');
  }
  return out;
}

// ── witness (stability) ───────────────────────────────────────────────────────
// forge  = total generative depth (how much the recipe builds).
// resolve = depth on the resolver axis (17) — how much it closes/resolves.
// A recipe CLOSES (stable) if it resolves at least κ of what it generates: resolve ≥ κ·forge. A recipe
// that generates far more than it resolves "runs away" — it never settles into a definite thing.
export function witness(sig) {
  const folds = Array.isArray(sig?.folds) ? sig.folds : [];
  let forge = 0, resolve = 0;
  for (const f of folds) {
    const d = isPosInt(f?.depth) ? f.depth : 0;
    forge += d;
    if (f?.axis === RESOLVER) resolve += d;
  }
  const stable = forge === 0 ? true : resolve >= KAPPA * forge;
  return { stable, forge, resolve, ratio: forge === 0 ? 1 : resolve / forge };
}

// ── compose (NON-MASKING) ──────────────────────────────────────────────────────
// Fold two signatures into a larger one on the shared seed. The composite is valid ONLY if BOTH parts are
// stable AND the whole is stable. A stable part can never carry a runaway part — even if the aggregate
// ratio would pass, a runaway sub-recipe rejects the composite. This is the format-level twin of
// konomify's non-masking module gate.
export function compose(a, b) {
  if (!isValidShape(a) || !isValidShape(b)) return { ok: false, reason: 'a part is malformed' };
  const wa = witness(a), wb = witness(b);
  const composite = { seed: 'fold-0', spine: SPINE.slice(), folds: [...a.folds, ...b.folds] };
  const wc = witness(composite);
  // NON-MASKING: every part must independently close, not just the aggregate.
  if (!wa.stable) return { ok: false, reason: 'left part runs away', part: 'a', aggregateStable: wc.stable };
  if (!wb.stable) return { ok: false, reason: 'right part runs away', part: 'b', aggregateStable: wc.stable };
  if (!wc.stable) return { ok: false, reason: 'composite runs away', part: 'composite', aggregateStable: false };
  return { ok: true, signature: composite, hash: hash(composite), witness: wc };
}

// ── validate (the whole gate) ──────────────────────────────────────────────────
export function validate(sig) {
  const shape = isValidShape(sig);
  const rt = shape && roundTrip(sig);
  const w = witness(sig);
  return {
    shape, roundtrip: rt, witness: w, hash: shape ? hash(sig) : null,
    valid: shape && rt && w.stable,
  };
}

export default { SPINE, RESOLVER, KAPPA, isValidShape, canonical, parse, roundTrip, hash, witness, compose, validate };
