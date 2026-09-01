import { CivilizationPaths, PATH_IDS } from '../game/paths.js';
import { hash01 } from './primitives.js';
// Widest path motif: the bureaucratic filing cabinet at 28 px plus its rings.
const MOTIF_SLACK = 60;
const PATH_VISUALS = {
    machine_faith: { motif: 'ritual_geometry', landmark: 'engine_spire', crown: 'luminous_core' },
    collective_mind: { motif: 'linked_nodes', landmark: 'neural_bridge', crown: 'synchronized_cluster' },
    temporal_dominion: { motif: 'chronal_rings', landmark: 'chronal_pylon', crown: 'offset_ring' },
    reality_engineering: { motif: 'lattice_frame', landmark: 'constraint_tower', crown: 'geometric_frame' },
    biological_transcendence: { motif: 'organic_branching', landmark: 'chitin_spire', crown: 'living_crown' },
    cosmic_resistance: { motif: 'defense_chevrons', landmark: 'shield_bastion', crown: 'blackout_shield' },
    bureaucratic_singularity: { motif: 'administrative_grid', landmark: 'admin_monolith', crown: 'ordered_block' },
    post_mortal_civilization: { motif: 'continuity_halo', landmark: 'data_mausoleum', crown: 'continuity_beacon' },
    void_communion: { motif: 'negative_space', landmark: 'void_obelisk', crown: 'absence_well' },
    recursive_simulation: { motif: 'nested_frames', landmark: 'recursive_tower', crown: 'nested_crown' },
};
const CONSOLIDATION_EVENT = {
    machine_faith: 'synod_of_the_second_engine', collective_mind: 'unanimous_afternoon', temporal_dominion: 'sovereign_hour',
    reality_engineering: 'department_of_permitted_physics', biological_transcendence: 'pollinators_of_the_state', cosmic_resistance: 'blackout_doctrine',
    bureaucratic_singularity: 'ministry_of_final_forms', post_mortal_civilization: 'immortal_electorate', void_communion: 'embassy_at_the_edge', recursive_simulation: 'recursion_registry',
};
export function pathIdentity(civ) {
    const dominant = civ.pathState.dominantPath;
    let pathId = dominant;
    let tier = dominant ? 2 : 0;
    if (!pathId) {
        pathId = [...PATH_IDS].sort((a, b) => CivilizationPaths.affinity(civ, b) - CivilizationPaths.affinity(civ, a))[0] ?? '';
        if (!pathId || CivilizationPaths.affinity(civ, pathId) < 2)
            return { pathId: '', tier: 0, motif: 'unaligned', landmark: 'none', crown: 'none' };
        tier = 1;
    }
    if (dominant && (civ.pathState.completedEvents.includes(CONSOLIDATION_EVENT[dominant] ?? '') || (civ.pathState.endgameStates ?? []).length > 0))
        tier = 3;
    const visual = PATH_VISUALS[pathId] ?? { motif: 'unaligned', landmark: 'none', crown: 'none' };
    return { pathId, tier, ...visual };
}
export function institutionLandmarks(civ) {
    const result = [];
    if (civ.institutions.includes('Lunar Ministry'))
        result.push({ institution: 'Lunar Ministry', kind: 'lunar_relay' });
    if (civ.institutions.includes('Ministry Of Sanity'))
        result.push({ institution: 'Ministry Of Sanity', kind: 'sanity_dome' });
    if (civ.institutions.includes('Consensus Office'))
        result.push({ institution: 'Consensus Office', kind: 'consensus_hall' });
    return result;
}
export function identitySignature(civ) {
    const identity = pathIdentity(civ);
    return `${identity.pathId || 'unaligned'}:${identity.tier}:${identity.landmark}|${institutionLandmarks(civ).map(item => item.kind).join(',')}`;
}
/**
 * The capital silhouette and the institution landmarks: persistent structures, so the caller draws
 * them on the cached scenery layer. Each path emits a different set of primitives rather than the
 * same shape in a different accent, so two civilizations stay distinguishable in a screenshot.
 */
export function drawIdentityLandmarks(surface, civ, settlements, ground, accent, view) {
    const identity = pathIdentity(civ);
    const capital = [...settlements].sort((a, b) => b.structures.length - a.structures.length)[0];
    if (capital && identity.tier >= 2 && capital.centerX >= view.from - 100 && capital.centerX <= view.to + 100) {
        const x = capital.centerX;
        const top = ground - 70 - identity.tier * 12;
        if (identity.pathId === 'machine_faith') {
            surface.lineStyle(2.5, accent, .85).line(x, ground - 6, x, top);
            surface.fillStyle(accent, .75).fillCircle(x, top - 8, 8 + identity.tier * 2);
            surface.lineStyle(1.2, accent, .45).strokeCircle(x, top - 8, 16 + identity.tier * 3);
            for (let g = 0; g < 3; g++)
                surface.lineStyle(1.4, accent, .6).line(x - 12 + g * 12, ground - 18, x - 12 + g * 12, top + 15);
        }
        else if (identity.pathId === 'collective_mind') {
            for (let i = -2; i <= 2; i++) {
                const nodeY = top + Math.abs(i) * 7;
                surface.fillStyle(accent, .65).fillCircle(x + i * 16, nodeY, 5);
                surface.lineStyle(1, accent, .35).line(x + i * 16, ground - 6, x + i * 16, nodeY);
                if (i < 2)
                    surface.lineStyle(1.6, accent, .55).line(x + i * 16, nodeY, x + (i + 1) * 16, top + Math.abs(i + 1) * 7);
            }
        }
        else if (identity.pathId === 'temporal_dominion') {
            for (let r = 0; r < 3; r++) {
                surface.lineStyle(1.8, accent, .65).strokeCircle(x, top, 12 + r * 10);
                surface.lineStyle(1.2, accent, .4).strokeRect(x - (12 + r * 10), top - (12 + r * 10), (12 + r * 10) * 2, (12 + r * 10) * 2);
            }
        }
        else if (identity.pathId === 'reality_engineering') {
            surface.lineStyle(2, accent, .7).strokeRect(x - 24, top - 22, 48, 48);
            surface.lineStyle(1.4, accent, .5).line(x - 24, top + 26, x + 24, top - 22).line(x - 24, top - 22, x + 24, top + 26);
            surface.fillStyle(accent, .25).fillRect(x - 12, top - 10, 24, 24);
        }
        else if (identity.pathId === 'biological_transcendence') {
            for (let i = -2; i <= 2; i++) {
                const branchTop = top + Math.abs(i) * 8;
                surface.lineStyle(2.2, accent, .6).line(x, ground - 5, x + i * 15, branchTop);
                surface.fillStyle(accent, .45).fillCircle(x + i * 15, branchTop, 4 + Math.abs(i));
            }
        }
        else if (identity.pathId === 'cosmic_resistance') {
            surface.fillStyle(accent, .45).fillTriangle(x - 30, top + 30, x, top - 20, x + 30, top + 30);
            surface.lineStyle(2.2, accent, .75).line(x - 36, top + 36, x + 36, top + 36).line(x - 24, top + 18, x + 24, top + 18);
        }
        else if (identity.pathId === 'bureaucratic_singularity') {
            for (let row = 0; row < 4; row++)
                surface.lineStyle(1.5, accent, .6).strokeRect(x - 26 + row * 4, top - 20 + row * 10, 52 - row * 8, 22);
        }
        else if (identity.pathId === 'post_mortal_civilization') {
            surface.lineStyle(2.2, accent, .75).strokeCircle(x, top, 26);
            surface.fillStyle(accent, .35).fillRect(x - 14, top - 36, 28, 72);
            surface.lineStyle(1.2, accent, .5).strokeCircle(x, top, 36);
        }
        else if (identity.pathId === 'void_communion') {
            surface.fillStyle(0x02040a, .95).fillCircle(x, top, 30);
            surface.lineStyle(2.2, accent, .7).strokeCircle(x, top, 36);
            surface.lineStyle(1.2, accent, .35).strokeCircle(x, top, 44);
        }
        else if (identity.pathId === 'recursive_simulation') {
            for (let r = 0; r < 4; r++)
                surface.lineStyle(1.4, accent, .55 + .08 * r).strokeRect(x - 30 + r * 6, top - 26 + r * 6, 60 - r * 12, 52 - r * 12);
        }
    }
    for (const landmark of institutionLandmarks(civ)) {
        const index = landmark.kind === 'lunar_relay' ? 0 : landmark.kind === 'sanity_dome' ? 1 : 2;
        const settlement = settlements[Math.min(index, Math.max(0, settlements.length - 1))];
        if (!settlement)
            continue;
        const x = settlement.centerX + 20 + index * 10;
        if (x < view.from - 80 || x > view.to + 80)
            continue;
        if (landmark.kind === 'lunar_relay') {
            surface.lineStyle(1.5, accent, .6).line(x, ground - 4, x, ground - 68);
            surface.strokeCircle(x + 8, ground - 72, 10);
        }
        else if (landmark.kind === 'sanity_dome') {
            surface.lineStyle(1.5, 0xb68cff, .55).strokeCircle(x, ground - 20, 24);
            surface.fillStyle(0xb68cff, .08).fillCircle(x, ground - 20, 22);
        }
        else {
            for (let i = -2; i <= 2; i++) {
                surface.fillStyle(accent, .5).fillCircle(x + i * 9, ground - 34 - Math.abs(i) * 5, 3);
                if (i < 2)
                    surface.lineStyle(1, accent, .45).line(x + i * 9, ground - 34 - Math.abs(i) * 5, x + (i + 1) * 9, ground - 34 - Math.abs(i + 1) * 5);
            }
        }
    }
}
// The leading affinity, read without normalizing the state. The `tier` the caller passes already
// encodes the affinity threshold, so the fallback only has to name the leading path -- never decide
// whether it is strong enough to count.
function leadingAffinityPath(state) {
    const affinity = state?.affinity;
    if (!affinity)
        return '';
    let best = '', top = 0;
    for (const id of PATH_IDS) {
        const value = Number(affinity[id] ?? 0);
        if (value > top) {
            top = value;
            best = id;
        }
    }
    return best;
}
/**
 * Ambient path marks scattered across the world, drawn on the dynamic layer. `tier` is the identity
 * tier: a merely leading affinity (tier 1) shows about half the marks at a lower alpha, a dominant
 * path (tier 2) shows the established count, and an entrenched one (tier 3) adds one further detail
 * to each motif. `ambientLoopFraction` comes from adaptive quality: at 0 the marks are still drawn,
 * they simply stop moving -- a slow device loses the animation, never the identity.
 */
export function drawPathAmbience(surface, civ, worldWidth, height, ground, time, accent, view, tier, ambientLoopFraction = 1) {
    // Read the saved path state directly. This runs on every dynamic frame, and `CivilizationPaths.ensure`
    // normalizes -- that is, writes to -- the civilization it is handed, which the renderer must never do.
    const state = civ.pathState;
    const path = state?.dominantPath || leadingAffinityPath(state);
    if (!path || tier < 1)
        return;
    // Every motif scatters a handful of marks across the whole world. Each is small, so one slack
    // covers them all, and the guard keeps the dominant path from being the one thing still painted
    // world-wide on the layer that repaints every frame.
    const shows = (x) => x >= view.from - MOTIF_SLACK && x <= view.to + MOTIF_SLACK;
    // Stride rather than truncate, so a thinned tier-1 motif still spans the world instead of
    // crowding into its first half.
    const step = tier <= 1 ? 2 : 1;
    const alpha = (base) => Math.min(1, base * (tier <= 1 ? .7 : tier >= 3 ? 1.15 : 1));
    const detailed = tier >= 3;
    const loop = ambientLoopFraction > 0 ? time : 0;
    switch (path) {
        case 'machine_faith':
            for (let i = 0; i < 8; i += step) {
                const x = worldWidth * (.08 + i * .12);
                if (!shows(x))
                    continue;
                surface.lineStyle(2, accent, alpha(.32)).line(x, ground - 35, x, ground - 90 - (i % 3) * 18);
                surface.fillStyle(accent, alpha(.42)).fillCircle(x, ground - 95 - (i % 3) * 18, 4);
                if (detailed)
                    surface.lineStyle(1, accent, alpha(.22)).strokeCircle(x, ground - 95 - (i % 3) * 18, 11);
            }
            break;
        case 'collective_mind': {
            const points = Array.from({ length: 12 }, (_, i) => ({ x: worldWidth * (.05 + hash01(civ.seed + i) * .9), y: ground - 40 - hash01(i * 17) * 100 }))
                .filter((_, i) => i % step === 0);
            surface.lineStyle(1, accent, alpha(.22));
            // A segment survives if either end shows, or the chain would break at the band edge.
            for (let i = 1; i < points.length; i++) {
                const a = points[i - 1], b = points[i];
                if (!shows(a.x) && !shows(b.x))
                    continue;
                surface.line(a.x, a.y, b.x, b.y);
            }
            for (const point of points)
                if (shows(point.x)) {
                    surface.fillStyle(accent, alpha(.5)).fillCircle(point.x, point.y, 3);
                    if (detailed)
                        surface.lineStyle(1, accent, alpha(.2)).strokeCircle(point.x, point.y, 8);
                }
            break;
        }
        case 'temporal_dominion':
            for (let i = 0; i < 7; i += step) {
                const x = worldWidth * (.1 + i * .13);
                const y = height * .22 + (i % 2) * 30;
                if (!shows(x))
                    continue;
                surface.lineStyle(2, accent, alpha(.3)).strokeCircle(x, y, 12 + i * 2);
                surface.lineStyle(1, accent, alpha(.45)).line(x, y, x + Math.cos(loop * .001 + i) * 10, y + Math.sin(loop * .001 + i) * 10);
                if (detailed)
                    surface.lineStyle(1, accent, alpha(.2)).strokeCircle(x, y, 19 + i * 2);
            }
            break;
        case 'reality_engineering':
            for (let i = 0; i < 9; i += step) {
                const x = worldWidth * (.08 + i * .105);
                const y = ground - 50 - (i % 3) * 35;
                if (!shows(x))
                    continue;
                surface.lineStyle(2, accent, alpha(.3)).line(x - 12, y + 12, x, y - 12).line(x, y - 12, x + 12, y + 12).line(x + 12, y + 12, x - 12, y + 12);
                if (detailed)
                    surface.lineStyle(1, accent, alpha(.2)).line(x - 6, y + 12, x + 6, y + 12);
            }
            break;
        case 'biological_transcendence':
            for (let i = 0; i < 18; i += step) {
                const x = worldWidth * hash01(civ.seed + i * 13);
                if (!shows(x))
                    continue;
                surface.fillStyle(accent, alpha(.14)).fillCircle(x, ground - 10 - hash01(i * 29) * 80, 8 + hash01(i) * 14);
                if (detailed)
                    surface.lineStyle(1, accent, alpha(.16)).line(x, ground - 6, x, ground - 10 - hash01(i * 29) * 80);
            }
            break;
        case 'cosmic_resistance':
            for (let i = 0; i < 12; i += step) {
                const x = worldWidth * (.03 + i * .085);
                if (!shows(x))
                    continue;
                surface.fillStyle(accent, alpha(.38)).fillTriangle(x, ground - 48, x + 16, ground - 43, x, ground - 36);
                surface.lineStyle(1, 0xe5e5e5, alpha(.35)).line(x, ground - 48, x, ground - 26);
                if (detailed)
                    surface.fillStyle(accent, alpha(.24)).fillTriangle(x, ground - 62, x + 12, ground - 58, x, ground - 53);
            }
            break;
        case 'bureaucratic_singularity':
            for (let i = 0; i < 10; i += step) {
                const x = worldWidth * (.06 + i * .095);
                const y = ground - 70 - (i % 2) * 28;
                if (!shows(x))
                    continue;
                surface.lineStyle(1, accent, alpha(.25)).strokeRect(x, y, 28, 20);
                surface.lineStyle(1, accent, alpha(.18)).line(x + 4, y + 6, x + 23, y + 6);
                if (detailed)
                    surface.lineStyle(1, accent, alpha(.18)).line(x + 4, y + 13, x + 23, y + 13);
            }
            break;
        case 'post_mortal_civilization':
            for (let i = 0; i < 9; i += step) {
                const x = worldWidth * (.07 + i * .11);
                const y = ground - 55 - (i % 3) * 20;
                if (!shows(x))
                    continue;
                surface.fillStyle(accent, alpha(.11)).fillCircle(x, y, 11);
                surface.lineStyle(1, accent, alpha(.34)).strokeCircle(x, y, 7);
                if (detailed)
                    surface.lineStyle(1, accent, alpha(.2)).strokeCircle(x, y, 15);
            }
            break;
        case 'void_communion':
            for (let i = 0; i < 7; i += step) {
                const x = worldWidth * (.1 + i * .13);
                const y = height * .18 + (i % 3) * 24;
                if (!shows(x))
                    continue;
                surface.fillStyle(accent, alpha(.12)).fillCircle(x, y, 26 + Math.sin(loop * .001 + i) * 3);
                surface.lineStyle(2, accent, alpha(.28)).strokeCircle(x, y, 9);
                if (detailed)
                    surface.lineStyle(1, accent, alpha(.18)).strokeCircle(x, y, 34);
            }
            break;
        case 'recursive_simulation':
            for (let i = 0; i < 8; i += step) {
                const x = worldWidth * (.07 + i * .115);
                const y = ground - 75 - (i % 2) * 35;
                if (!shows(x))
                    continue;
                for (let ring = 0; ring < (detailed ? 4 : 3); ring++)
                    surface.lineStyle(1, accent, alpha(.18 + .06 * ring)).strokeRect(x - ring * 5, y - ring * 5, 22 + ring * 10, 14 + ring * 10);
            }
            break;
    }
}
//# sourceMappingURL=identity.js.map