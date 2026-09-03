export const DEFAULT_ACCENT = 0x6fe7e1;
export const PATH_ACCENTS = {
    machine_faith: 0xf0ca6f,
    collective_mind: 0x77e3ff,
    temporal_dominion: 0xffa45f,
    reality_engineering: 0x68f0c5,
    biological_transcendence: 0x8ee66b,
    cosmic_resistance: 0xff6b7f,
    bureaucratic_singularity: 0xe3b76f,
    post_mortal_civilization: 0xdca4ff,
    void_communion: 0xa86cf0,
    recursive_simulation: 0x5ce1e6,
};
export const FACTION_SIGILS = {
    machine_faith: 'spire',
    collective_mind: 'node',
    temporal_dominion: 'ring',
    reality_engineering: 'prism',
    biological_transcendence: 'nest',
    cosmic_resistance: 'chevron',
    bureaucratic_singularity: 'grid',
    post_mortal_civilization: 'halo',
    void_communion: 'void',
    recursive_simulation: 'spiral',
};
export function pathAccentFor(pathId) { return PATH_ACCENTS[pathId] ?? DEFAULT_ACCENT; }
export function hash01(n) {
    const value = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
}
/**
 * Smooth deterministic value noise over one dimension: `hash01` sampled on the integer lattice and
 * interpolated with a smoothstep, so a ridgeline built from it undulates instead of stepping. No
 * library, no `Math.random()` -- the same `x` and `seed` always give the same value.
 */
export function valueNoise(x, seed) {
    const cell = Math.floor(x);
    const t = x - cell;
    const smooth = t * t * (3 - 2 * t);
    const a = hash01(seed + cell * 57.13);
    const b = hash01(seed + (cell + 1) * 57.13);
    return a + (b - a) * smooth;
}
/**
 * Two octaves of `valueNoise`, which is what separates a ridge with large geological forms carrying
 * finer detail from one regular enough to read as a repeated triangle. Bounded to 0..1.
 */
export function ridgeNoise(x, seed, detail = .45) {
    const base = valueNoise(x, seed);
    const fine = valueNoise(x * 2.7 + 11.3, seed * 1.7 + 31);
    return Math.max(0, Math.min(1, base * (1 - detail) + fine * detail));
}
/**
 * The van der Corput sequence in base 2, offset onto a span. Where `hash01` answers "where does
 * mark `i` go", this answers "where do the *first n* marks go, for every n at once": every prefix of
 * the sequence is spread evenly across the span, and mark `i` sits at the same place however many
 * marks there turn out to be.
 *
 * That second half is the point. A cue whose count follows a live stat -- fractures on Stability,
 * beacons on Awareness -- cannot be laid out on a lattice sized by that count: the frame Stability
 * ticks a third fracture into existence, a lattice moves the other two from the quarters of the
 * world to its sixths, and every mark on screen jumps at exactly the moment the player is reading
 * the state. Nor can it be scattered by a hash, which clusters and leaves whole viewports of a
 * stage-4 world with no cue in them at all. This is the one placement that is both.
 */
export function spreadPosition(span, index, offset) {
    let position = 0, denominator = 1, value = Math.max(0, Math.trunc(index));
    while (value > 0) {
        denominator *= 2;
        position += (value % 2) / denominator;
        value = Math.floor(value / 2);
    }
    const shifted = (position + offset) % 1;
    return span * (shifted < 0 ? shifted + 1 : shifted);
}
/** `color` pushed toward black. The single name for the darker plane of a 2.5D solid. */
export function shade(color, amount) { return mixColor(color, 0x000000, amount); }
/** `color` pushed toward white. The single name for a rim light or a lit roof edge. */
export function tint(color, amount) { return mixColor(color, 0xffffff, amount); }
export function mixColor(from, to, amount) {
    const t = Math.max(0, Math.min(1, amount));
    const channel = (shift) => Math.round(((from >> shift) & 0xff) * (1 - t) + ((to >> shift) & 0xff) * t);
    return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
//# sourceMappingURL=primitives.js.map