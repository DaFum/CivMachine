import { developmentStage, worldSnapshot } from './world-model.js';
const PATH_ACCENTS = {
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
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const band = (value) => value < 25 ? 0 : value < 50 ? 1 : value < 75 ? 2 : 3;
export function decisionImpulseKind(eventId) {
    if (eventId === 'tactical:stabilize')
        return 'containment';
    if (eventId === 'tactical:accelerate')
        return 'time-streak';
    if (eventId === 'tactical:probe')
        return 'scan';
    if (eventId.startsWith('entropy_crisis_'))
        return 'fracture';
    return 'decision';
}
export function entropyThresholdColor(eventId) {
    if (eventId.endsWith('_25'))
        return 0xf2d06b;
    if (eventId.endsWith('_50'))
        return 0xf29a52;
    return 0xee6973;
}
function mix(from, to, amount) {
    const t = clamp01(amount);
    const channel = (shift) => Math.round(((from >> shift) & 0xff) * (1 - t) + ((to >> shift) & 0xff) * t);
    return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
export function worldPresentation(civ) {
    const stability = clamp01(civ.stats.stability / Math.max(1, civ.stats.stabilityMax));
    const danger = clamp01((55 - civ.stats.stability) / 55);
    const sanityDistortion = clamp01((60 - civ.stats.sanity) / 60);
    const awareness = clamp01(civ.stats.awareness / 100);
    const attention = clamp01(civ.stats.attention / 100);
    const entropy = clamp01(civ.tactical.entropy / 100);
    const accent = PATH_ACCENTS[civ.pathState.dominantPath] ?? 0x6fe7e1;
    const eraLight = clamp01((civ.era + developmentStage(civ) * .35) / 4.4);
    return {
        accent,
        danger,
        sanityDistortion,
        awareness,
        attention,
        entropy,
        stability,
        bands: {
            stability: band(civ.stats.stability),
            sanity: band(civ.stats.sanity),
            awareness: band(civ.stats.awareness),
            attention: band(civ.stats.attention),
            entropy: band(civ.tactical.entropy),
        },
        colors: {
            skyTop: mix(mix(0x050815, danger > .45 ? 0x250711 : 0x091a2d, Math.max(eraLight * .45, danger * .6)), 0x290705, entropy * .62),
            skyBottom: mix(mix(0x10263a, danger > .45 ? 0x6a1d29 : accent, .16 + attention * .2 + eraLight * .12), 0x7d2c18, entropy * .48),
            farTerrain: mix(mix(0x142738, accent, .08 + awareness * .12), 0x52251d, entropy * .38),
            nearTerrain: mix(mix(0x0a121c, danger > .5 ? 0x35121b : accent, .08 + danger * .16), 0x43120e, entropy * .5),
            settlement: mix(mix(0x182b39, accent, .2 + awareness * .18), 0x5e261a, entropy * .32),
            window: mix(mix(0xf2cd7b, accent, attention * .36), 0xff6f43, entropy * .45),
            haze: mix(mix(0x5ca9bc, accent, .35), 0xd65432, entropy * .55),
        },
    };
}
export function structuralWorldKey(civ, viewportWidth) {
    const snapshot = worldSnapshot(civ, viewportWidth);
    const presentation = worldPresentation(civ);
    return [
        civ.seed,
        Math.round(viewportWidth / 80),
        civ.era,
        snapshot.stage,
        snapshot.buildingCount,
        Math.trunc(civ.development / 25),
        civ.institutions.length,
        civ.pathState.dominantPath || 'unaligned',
        presentation.bands.stability,
        presentation.bands.sanity,
        presentation.bands.awareness,
        presentation.bands.attention,
        presentation.bands.entropy,
    ].join('|');
}
//# sourceMappingURL=world-presentation.js.map