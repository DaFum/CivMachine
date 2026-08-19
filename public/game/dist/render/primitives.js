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
export function mixColor(from, to, amount) {
    const t = Math.max(0, Math.min(1, amount));
    const channel = (shift) => Math.round(((from >> shift) & 0xff) * (1 - t) + ((to >> shift) & 0xff) * t);
    return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
//# sourceMappingURL=primitives.js.map