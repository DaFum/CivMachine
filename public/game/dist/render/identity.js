import { CivilizationPaths, PATH_IDS } from '../game/paths.js';
import { hash01, mixColor, shade, tint } from './primitives.js';
// Widest path motif: the bureaucratic filing cabinet at 28 px plus its rings.
const MOTIF_SLACK = 60;
/**
 * `crown` is not decoration on the descriptor: it is the geometry every tall civic and residential
 * solid in the city is finished with, so a path is legible from the skyline itself and not only from
 * its capital motif, its ambient marks and its hue. `structures.ts` knows how to draw each one; this
 * stays the single place that decides which path builds which way.
 */
const PATH_VISUALS = {
    machine_faith: { motif: 'ritual_geometry', landmark: 'engine_spire', crown: 'luminous_core', frame: 'industrial' },
    collective_mind: { motif: 'linked_nodes', landmark: 'neural_bridge', crown: 'synchronized_cluster', frame: 'organic' },
    temporal_dominion: { motif: 'chronal_rings', landmark: 'chronal_pylon', crown: 'offset_ring', frame: 'transcendent' },
    reality_engineering: { motif: 'lattice_frame', landmark: 'constraint_tower', crown: 'geometric_frame', frame: 'industrial' },
    biological_transcendence: { motif: 'organic_branching', landmark: 'chitin_spire', crown: 'living_crown', frame: 'organic' },
    cosmic_resistance: { motif: 'defense_chevrons', landmark: 'shield_bastion', crown: 'blackout_shield', frame: 'industrial' },
    bureaucratic_singularity: { motif: 'administrative_grid', landmark: 'admin_monolith', crown: 'ordered_block', frame: 'industrial' },
    post_mortal_civilization: { motif: 'continuity_halo', landmark: 'data_mausoleum', crown: 'continuity_beacon', frame: 'transcendent' },
    void_communion: { motif: 'negative_space', landmark: 'void_obelisk', crown: 'absence_well', frame: 'transcendent' },
    recursive_simulation: { motif: 'nested_frames', landmark: 'recursive_tower', crown: 'nested_crown', frame: 'transcendent' },
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
            return { pathId: '', tier: 0, motif: 'unaligned', landmark: 'none', crown: 'none', frame: 'none' };
        tier = 1;
    }
    if (dominant && (civ.pathState.completedEvents.includes(CONSOLIDATION_EVENT[dominant] ?? '') || (civ.pathState.endgameStates ?? []).length > 0))
        tier = 3;
    const visual = PATH_VISUALS[pathId] ?? { motif: 'unaligned', landmark: 'none', crown: 'none', frame: 'none' };
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
            // Light absorbed rather than a hole cut in the skyline: the well is dense at its centre and
            // gives out into the world at its edge, so the city behind it darkens instead of disappearing.
            surface.fillRadialGlow(x, top, 0, 34, [
                { offset: 0, color: 0x02040a, alpha: .96 },
                { offset: .62, color: 0x02040a, alpha: .72 },
                { offset: 1, color: 0x02040a, alpha: 0 },
            ]);
            surface.lineStyle(2.2, accent, .7).strokeCircle(x, top, 36);
            surface.lineStyle(1.2, accent, .35).strokeCircle(x, top, 44);
            // The rim the absorbed light leaves around the well.
            surface.fillRadialGlow(x, top, 36, 52, [
                { offset: 0, color: accent, alpha: .16 },
                { offset: 1, color: accent, alpha: 0 },
            ]);
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
    // Each path moves in its own way, not merely in its own colour. A pulse that travels along a chain
    // is a different civilization from one that breathes, or from one that refuses to move at all --
    // and at `ambientLoopFraction` 0 every one of them freezes without losing its geometry.
    const wave = (period, offset) => loop === 0 ? .7 : .5 + .5 * Math.sin(loop / period + offset);
    switch (path) {
        case 'machine_faith':
            // Ritual sequence: the shrine lights come up one after another along the world, like a liturgy
            // being said down the length of the civilization.
            for (let i = 0; i < 8; i += step) {
                const x = worldWidth * (.08 + i * .12);
                if (!shows(x))
                    continue;
                const litY = ground - 95 - (i % 3) * 18;
                const rite = wave(520, i * .9);
                surface.lineStyle(2, accent, alpha(.32)).line(x, ground - 35, x, litY + 5);
                surface.fillStyle(accent, alpha(.28 + rite * .32)).fillCircle(x, litY, 3 + rite * 2);
                if (detailed)
                    surface.lineStyle(1, accent, alpha(.14 + rite * .16)).strokeCircle(x, litY, 9 + rite * 4);
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
            // One pulse travelling the chain, so the nodes read as synchronized rather than as dots.
            const head = loop === 0 ? .35 : ((loop / 3200) % 1);
            for (const [index, point] of points.entries())
                if (shows(point.x)) {
                    const distance = Math.abs(index / Math.max(1, points.length - 1) - head);
                    const carry = Math.max(0, 1 - distance * 5);
                    surface.fillStyle(accent, alpha(.36 + carry * .5)).fillCircle(point.x, point.y, 2.6 + carry * 2.4);
                    if (detailed)
                        surface.lineStyle(1, accent, alpha(.14 + carry * .22)).strokeCircle(point.x, point.y, 7 + carry * 5);
                }
            break;
        }
        case 'temporal_dominion':
            // Chronal echo: every ring carries a second, offset copy of itself a beat behind.
            for (let i = 0; i < 7; i += step) {
                const x = worldWidth * (.1 + i * .13);
                const y = height * .22 + (i % 2) * 30;
                if (!shows(x))
                    continue;
                const echo = (loop === 0 ? .5 : (loop / 2600 + i * .2) % 1);
                surface.lineStyle(2, accent, alpha(.3)).strokeCircle(x, y, 12 + i * 2);
                surface.lineStyle(1, accent, alpha(.3 * (1 - echo))).strokeCircle(x + echo * 9, y - echo * 5, 12 + i * 2 + echo * 8);
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
            // Living light: the growths breathe, each on its own slow cycle.
            for (let i = 0; i < 18; i += step) {
                const x = worldWidth * hash01(civ.seed + i * 13);
                if (!shows(x))
                    continue;
                const breath = wave(1400, hash01(i * 7) * 6);
                const y = ground - 10 - hash01(i * 29) * 80;
                surface.fillStyle(accent, alpha(.09 + breath * .1)).fillCircle(x, y, (8 + hash01(i) * 14) * (.85 + breath * .25));
                if (detailed)
                    surface.lineStyle(1, accent, alpha(.16)).line(x, ground - 6, x, y);
            }
            break;
        case 'cosmic_resistance':
            // Warning lighting sweeping along the defensive line, one emplacement at a time.
            for (let i = 0; i < 12; i += step) {
                const x = worldWidth * (.03 + i * .085);
                if (!shows(x))
                    continue;
                const warn = loop === 0 ? .4 : Math.max(0, 1 - Math.abs(((loop / 4200) % 1) * 12 - i) * .8);
                surface.fillStyle(accent, alpha(.3 + warn * .35)).fillTriangle(x, ground - 48, x + 16, ground - 43, x, ground - 36);
                surface.lineStyle(1, 0xe5e5e5, alpha(.28 + warn * .3)).line(x, ground - 48, x, ground - 26);
                if (detailed)
                    surface.fillStyle(accent, alpha(.24)).fillTriangle(x, ground - 62, x + 12, ground - 58, x, ground - 53);
            }
            break;
        case 'bureaucratic_singularity':
            // Deliberately motionless. Every other path moves; ordered regularity that never changes is
            // this one's whole character, and animating it would take that away.
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
            // Continuity halos: they never go out, they only breathe -- nothing here ends.
            for (let i = 0; i < 9; i += step) {
                const x = worldWidth * (.07 + i * .11);
                const y = ground - 55 - (i % 3) * 20;
                if (!shows(x))
                    continue;
                const persist = wave(2200, i * .5);
                surface.fillStyle(accent, alpha(.08 + persist * .07)).fillCircle(x, y, 11);
                surface.lineStyle(1, accent, alpha(.28 + persist * .14)).strokeCircle(x, y, 7);
                if (detailed)
                    surface.lineStyle(1, accent, alpha(.14 + persist * .12)).strokeCircle(x, y, 15);
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
            // Nested frames stepping outward: the recursion runs, one frame at a time.
            for (let i = 0; i < 8; i += step) {
                const x = worldWidth * (.07 + i * .115);
                const y = ground - 75 - (i % 2) * 35;
                if (!shows(x))
                    continue;
                const rings = detailed ? 4 : 3;
                const active = loop === 0 ? 1 : Math.floor((loop / 900 + i) % rings);
                for (let ring = 0; ring < rings; ring++) {
                    surface.lineStyle(ring === active ? 1.6 : 1, accent, alpha(.14 + .05 * ring + (ring === active ? .22 : 0)))
                        .strokeRect(x - ring * 5, y - ring * 5, 22 + ring * 10, 14 + ring * 10);
                }
            }
            break;
    }
}
/**
 * Ceiling on how far a frame reaches from its settlement's centre. A settlement's radius reaches 18%
 * of the world, and a frame that wide would emit single primitives broader than the cull margin
 * covers -- and, worse, a mass that wide stops being a settlement's silhouette and becomes weather.
 * Every primitive a frame paints stays inside this, which is what lets the caller cull the whole
 * frame by one extent.
 */
export const FRAME_MAX_REACH = 120;
export function settlementFrameReach(radius) { return Math.min(FRAME_MAX_REACH, Math.max(28, radius * .92)); }
/**
 * The contour of a membrane at an angle: two frequencies, so the edge never repeats a lobe. Bounded
 * to at most `1 + MEMBRANE_WOBBLE * (1 + breath)` of the base radius, which is what lets the caller
 * fit the whole contour inside the reach it is culled by rather than hoping the wobble is small.
 */
const MEMBRANE_WOBBLE = .087;
/** Base radius as a fraction of the reach, chosen so the widest wobble still fits inside it. */
const MEMBRANE_FIT = .86;
function membraneRadius(angle, seed, breath) {
    // The two lobe weights sum to one, so the excursion is exactly `MEMBRANE_WOBBLE` at its widest --
    // the bound is a property of the function rather than an estimate of two loose coefficients.
    const lobes = Math.sin(angle * 3 + seed) * .63 + Math.cos(angle * 5 - seed * .8) * .37;
    return 1 + lobes * MEMBRANE_WOBBLE * (1 + breath);
}
const MEMBRANE_SEGMENTS = 14;
/**
 * The archetype mass a settlement is built inside, drawn behind its own skyline. Persistent
 * geometry, so this belongs on the cached scenery layer beside the structures -- and gated on the
 * identity tier, which is a band `structuralWorldKey` already tracks, never on a ticking stat.
 *
 * Each frame is a different set of primitives rather than the same shape in a different accent: a
 * membrane has no straight edge anywhere, an industrial mass has nothing but straight edges, and a
 * transcendent one is not touching the ground. That is the same rule the crowns are held to.
 */
export function drawSettlementFrame(surface, frame, geometry, ground, accent, tier, lightColor) {
    if (frame === 'none' || tier < 2)
        return;
    const { centerX, crown, seed } = geometry;
    const reach = settlementFrameReach(geometry.radius);
    // How far up the frame goes: its own settlement's skyline, so a camp is not wrapped in the mass a
    // metropolis earns, and never so far that it eats the sky above the city. Bounded against the
    // *reach* as well as the skyline, because a frame is a mass and not a mast: an arcology's crown is
    // three times what its footprint allows sideways, and a 120 x 260 dome is a spike.
    const rise = Math.max(24, Math.min(crown * .78, reach * 1.1, ground * .46));
    const strength = tier >= 3 ? 1 : .78;
    if (frame === 'organic') {
        // A membrane over the settlement: a closed dome whose radius is modulated at two frequencies, so
        // the contour reads as grown tissue rather than as an arc. The fill is a light field on the
        // cached layer, where a gradient is paid once per scroll.
        const dome = [];
        for (let i = 0; i <= MEMBRANE_SEGMENTS; i++) {
            const angle = Math.PI + (i / MEMBRANE_SEGMENTS) * Math.PI;
            const wobble = membraneRadius(angle, seed, 0);
            dome.push([centerX + Math.cos(angle) * reach * MEMBRANE_FIT * wobble, ground + Math.sin(angle) * rise * MEMBRANE_FIT * wobble]);
        }
        surface.fillEllipseGlow(centerX, ground, reach * .92, rise * .92, [
            { offset: 0, color: accent, alpha: .1 * strength },
            { offset: .62, color: accent, alpha: .05 * strength },
            { offset: 1, color: accent, alpha: 0 },
        ]);
        surface.lineStyle(1.4, accent, .3 * strength).strokePoly(dome);
        // The cell walls inside it, so the mass has an interior instead of being one bubble. Lit by the
        // city under it rather than by a colour of their own -- light is one system.
        for (let cell = 0; cell < 3; cell++) {
            const offset = (cell - 1) * reach * .42;
            surface.lineStyle(1, mixColor(accent, lightColor, .45), .16 * strength).line(centerX + offset, ground, centerX + offset * .55, ground - rise * (.5 + cell * .12));
        }
    }
    else if (frame === 'industrial') {
        // Orthogonal volumes stepping up behind the skyline, and the stacks that vent them: nothing here
        // is curved and nothing is off the grid. The terraces are wider than the plots they stand behind,
        // so the mass silhouettes past the buildings on both sides -- one narrower than the settlement's
        // own cluster is simply covered by it.
        for (let block = 0; block < 3; block++) {
            const halfWidth = reach * (.95 - block * .15);
            const blockHeight = rise * (.3 + block * .22);
            surface.fillStyle(shade(accent, .82), .6 * strength).fillRect(centerX - halfWidth, ground - blockHeight, halfWidth * 2, blockHeight);
            surface.lineStyle(1, accent, .3 * strength).strokeRect(centerX - halfWidth, ground - blockHeight, halfWidth * 2, blockHeight);
        }
        for (let stack = 0; stack < 2; stack++) {
            // Out at the settlement's edge rather than in its core, and taller than the mass they vent:
            // a chimney inside the cluster is hidden by the first building in front of it.
            const x = centerX + (stack === 0 ? -reach * .84 : reach * .84);
            const stackWidth = reach * .12;
            const stackHeight = rise * (1.45 + stack * .22);
            // Tapered, because a chimney is: a plain rectangle read as a missing building.
            surface.fillStyle(shade(accent, .88), .72 * strength).fillPoly([
                [x - stackWidth, ground], [x - stackWidth * .58, ground - stackHeight],
                [x + stackWidth * .58, ground - stackHeight], [x + stackWidth, ground],
            ]);
            surface.lineStyle(1, lightColor, .3 * strength).line(x - stackWidth * .58, ground - stackHeight, x + stackWidth * .58, ground - stackHeight);
        }
    }
    else {
        // Apotheosis: the mass has left the ground. A stele of light standing in the settlement, the
        // shadow of what floats above it, and the plinth the whole thing rose from.
        const steleWidth = reach * .18;
        const steleTop = Math.max(4, ground - rise * 1.9);
        surface.fillLinearGradientRect(centerX - steleWidth, steleTop, steleWidth * 2, ground - steleTop, [
            { offset: 0, color: accent, alpha: 0 },
            { offset: .7, color: accent, alpha: .1 * strength },
            { offset: 1, color: mixColor(accent, lightColor, .4), alpha: .22 * strength },
        ], centerX, steleTop, centerX, ground);
        surface.fillEllipseGlow(centerX, ground - 2, reach * .5, reach * .16, [
            { offset: 0, color: 0x000000, alpha: .34 * strength },
            { offset: 1, color: 0x000000, alpha: 0 },
        ]);
        surface.lineStyle(1.4, accent, .34 * strength).line(centerX - reach * .34, ground - 2, centerX + reach * .34, ground - 2);
    }
}
/**
 * The frame's one animated cue, drawn on the dynamic layer: a membrane breathing, a furnace burning,
 * a monolith holding itself above the ground. The caller shares a fixed count of settlements out
 * over what is on screen -- a frame's motion is a cosmetic on top of geometry that is already
 * legible on the cached layer, so this stays a handful of primitives per frame however wide the
 * world. Reduced motion keeps every cue and freezes it.
 */
export function drawSettlementFrameAccent(surface, frame, geometry, ground, accent, lightColor, time, reducedMotion) {
    if (frame === 'none')
        return;
    const { centerX, crown, seed } = geometry;
    const reach = settlementFrameReach(geometry.radius);
    const rise = Math.max(24, Math.min(crown * .78, reach * 1.1, ground * .46));
    const loop = reducedMotion ? 0 : time;
    if (frame === 'organic') {
        // The membrane breathing: the same contour, one slow cycle further out. Nine segments, because
        // this is the per-frame half of the cue and its cost is paid sixty times a second.
        const breath = loop === 0 ? .5 : .5 + .5 * Math.sin(loop * .0007 + seed);
        const contour = [];
        for (let i = 0; i <= 9; i++) {
            const angle = Math.PI + (i / 9) * Math.PI;
            const wobble = membraneRadius(angle, seed, breath * .5);
            contour.push([centerX + Math.cos(angle) * reach * MEMBRANE_FIT * wobble, ground + Math.sin(angle) * rise * MEMBRANE_FIT * wobble]);
        }
        surface.lineStyle(1, accent, .1 + breath * .14).strokePoly(contour);
    }
    else if (frame === 'industrial') {
        // The furnaces under the stacks, glimmering out of phase with each other.
        for (let stack = 0; stack < 2; stack++) {
            const x = centerX + (stack === 0 ? -reach * .84 : reach * .84);
            const burn = loop === 0 ? .5 : .5 + .5 * Math.sin(loop * .0016 + stack * 2.1 + seed);
            // The heat is the settlement's own light pushed toward the fire, not a warm hex of its own, so
            // a furnace answers the palette the windows and the street lamps already share.
            const fire = mixColor(lightColor, 0xff5a12, .45);
            surface.fillStyle(fire, .22 + burn * .4).fillRect(x - reach * .05, ground - rise * .3, reach * .1, rise * .22);
            surface.fillStyle(fire, .06 + burn * .1).fillCircle(x, ground - rise * (1.5 + burn * .12), reach * .09);
        }
    }
    else {
        // The monolith itself: levitating on a slow sine, with the ground shadow shrinking as it rises.
        const lift = loop === 0 ? 0 : Math.sin(loop * .0009 + seed) * 6;
        const y = ground - rise * 1.15 + lift;
        const half = reach * .22;
        surface.fillStyle(tint(accent, .55), .5).fillPoly([[centerX, y - half * 1.5], [centerX + half, y], [centerX, y + half * 1.5], [centerX - half, y]]);
        surface.lineStyle(1.2, accent, .55).strokePoly([[centerX, y - half * 1.5], [centerX + half, y], [centerX, y + half * 1.5], [centerX - half, y], [centerX, y - half * 1.5]]);
        surface.fillStyle(0x000000, .2 - lift * .012).fillCircle(centerX, ground - 1, half * .5);
    }
}
//# sourceMappingURL=identity.js.map