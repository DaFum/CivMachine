import { hash01 } from './primitives.js';
import { factionRoster } from './factions.js';
import { structureKindsForEra } from './structures.js';
import { worldWidthMultiplier } from './world-model.js';
export const CLASS_ORDER = ['camp', 'village', 'town', 'city', 'metropolis', 'arcology'];
/**
 * How far a settlement centre may drift from its nominal slot, as a fraction of the world. Named
 * because the radius cap has to subtract it: the jitter is applied independently per settlement, so
 * two neighbours can each drift half of it toward the other and close their gap by the whole amount.
 */
export const CENTER_JITTER = .035;
export function depthLaneYOffset(lane) {
    if (lane === 'back')
        return -8;
    if (lane === 'front')
        return 8;
    return 0;
}
export function structureEffectiveGround(groundY, lane) {
    return groundY + depthLaneYOffset(lane);
}
export function settlementClassFor(structureCount, stage, era) {
    if (stage === 0)
        return structureCount >= 4 ? 'village' : 'camp';
    const score = structureCount + stage * 2 + era;
    if (score < 7)
        return 'village';
    if (score < 11)
        return 'town';
    if (score < 16)
        return 'city';
    if (score < 22)
        return 'metropolis';
    return 'arcology';
}
// The capital is weighted heavily so a developed world always contains one large settlement.
export function settlementSizes(civ, snapshot) {
    const count = snapshot.settlementCount;
    const weights = Array.from({ length: count }, (_, i) => i === 0 ? 1.9 : .55 + hash01(civ.seed * 29 + i * 13) * .9);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const sizes = weights.map(weight => Math.max(1, Math.floor(snapshot.buildingCount * weight / totalWeight)));
    let remainder = snapshot.buildingCount - sizes.reduce((sum, size) => sum + size, 0);
    for (let i = 0; remainder > 0; i = (i + 1) % count) {
        sizes[i] += 1;
        remainder--;
    }
    for (let i = count - 1; remainder < 0 && i >= 0; i--) {
        const reducible = Math.min(sizes[i] - 1, -remainder);
        sizes[i] -= reducible;
        remainder += reducible;
    }
    return sizes;
}
export function settlementClassSignature(civ, snapshot) {
    const counts = new Map();
    for (const size of settlementSizes(civ, snapshot)) {
        const settlementClass = settlementClassFor(size, snapshot.stage, civ.era);
        counts.set(settlementClass, (counts.get(settlementClass) ?? 0) + 1);
    }
    return CLASS_ORDER.filter(name => counts.has(name)).map(name => `${name}:${counts.get(name)}`).join('/');
}
// Every candidate is filtered through the era gate, so structureKindsForEra stays the single
// authority on what an era may contain and the two cannot drift apart.
function kindFor(index, count, settlementClass, era, stage, seed, allowed, distance) {
    const rank = CLASS_ORDER.indexOf(settlementClass);
    const mid = Math.floor(count / 2);
    const pick = (kind) => allowed.has(kind) ? kind : 'dwelling';
    if (stage === 0)
        return count >= 3 && index === count - 1 ? pick('farm') : 'dwelling';
    if (rank >= 4 && index === 0 && allowed.has('orbital_anchor'))
        return 'orbital_anchor';
    if (rank >= 3 && index === count - 1 && allowed.has('spaceport'))
        return 'spaceport';
    if (count >= 10 && index === mid - 1 && allowed.has('reactor'))
        return 'reactor';
    if (count >= 3 && index === mid)
        return pick('temple');
    if (count >= 6 && index === mid + 1 && allowed.has('academy'))
        return 'academy';
    if (stage >= 2 && count >= 8 && index === 1)
        return pick('monument');
    // The distance the caller passes is the structure's real offset from the settlement centre, not
    // its index: with clustered composition the two diverge, and it is the position that decides
    // whether a plot is agricultural outskirt or industrial edge.
    if (distance > .7)
        return pick('farm');
    if (distance > .5 && allowed.has('industry') && hash01(seed + index * 37) > .45)
        return 'industry';
    return 'dwelling';
}
/**
 * How a settlement's structures are grouped along its width. An evenly spaced row of buildings is
 * what made a city read as a bar chart, so the plots are gathered into neighbourhoods separated by
 * deliberate gaps: one dominant core in the middle, secondary districts beside it, and the
 * outskirts at the ends. Deterministic in the seed, and every returned position stays inside
 * `0..1` so the caller's radius culling remains exact.
 */
function districtPlots(count, rank, seed) {
    const clusterTarget = count <= 3 ? 1 : count <= 7 ? 2 : rank >= 4 ? 4 : 3;
    const clusters = Math.max(1, Math.min(clusterTarget, count));
    const coreIndex = clusters <= 1 ? 0 : Math.floor(clusters / 2);
    // Weights first, then whole plots, so the core always ends up the densest neighbourhood.
    const weights = Array.from({ length: clusters }, (_, i) => i === coreIndex ? 2.4 : .6 + hash01(seed * 19 + i * 41) * .7);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const counts = weights.map(weight => Math.max(1, Math.floor(count * weight / totalWeight)));
    let remainder = count - counts.reduce((sum, value) => sum + value, 0);
    for (let i = coreIndex; remainder > 0; i = (i + 1) % clusters) {
        counts[i] += 1;
        remainder--;
    }
    for (let i = clusters - 1; remainder < 0 && i >= 0; i--) {
        const reducible = Math.min(counts[i] - 1, -remainder);
        counts[i] -= reducible;
        remainder += reducible;
    }
    const gap = clusters > 1 ? Math.min(.09, .3 / clusters) : 0;
    const usable = 1 - gap * (clusters - 1);
    const plots = [];
    let cursor = 0;
    for (let c = 0; c < clusters; c++) {
        const size = counts[c];
        const width = usable * size / count;
        const peak = Math.floor(size / 2);
        for (let j = 0; j < size; j++) {
            // Half-step spacing inside the cluster plus a bounded jitter, so a neighbourhood is irregular
            // without a plot ever leaving its own cluster.
            const jitter = (hash01(seed * 7 + plots.length * 53) - .5) * (width / size) * .5;
            const u = Math.max(0, Math.min(1, cursor + width * (j + .5) / size + jitter));
            const district = c === coreIndex ? 'core' : (c === 0 || c === clusters - 1) ? 'edge' : 'inner';
            plots.push({ u, district, coreOfCluster: j === peak });
        }
        cursor += width + gap;
    }
    return plots;
}
export function settlementLayout(civ, worldWidth, height, snapshot) {
    const stage = snapshot.stage;
    const sizes = settlementSizes(civ, snapshot);
    const roster = factionRoster(civ);
    const scale = [.24, .46, .7, .96, 1.28][stage] ?? .24;
    const viewportWidth = worldWidth / worldWidthMultiplier(civ);
    // Two scales, not one. A narrow viewport needs *wider* structures -- a 14 px tower is a hairline on
    // a phone -- but the same multiplier applied to height filled a portrait screen with skyline and
    // left no sky, no ridges and no atmosphere at all. Height shrinks where width grows.
    const widthScale = viewportWidth < 800 ? 1.25 : (viewportWidth < 1200 ? 1.12 : 1.0);
    const heightScale = viewportWidth < 800 ? .74 : (viewportWidth < 1200 ? .88 : 1.0);
    // And a hard skyline budget from the aspect ratio, so the tallest structure can never eat the sky:
    // a portrait viewport keeps well over half its height above the roofline.
    const aspect = viewportWidth / Math.max(1, height);
    const skylineBudget = height * (aspect < 1 ? .40 : aspect < 1.5 ? .52 : .62);
    const allowed = new Set(structureKindsForEra(civ.era, stage));
    const settlements = [];
    let globalIndex = 0;
    for (let index = 0; index < sizes.length; index++) {
        const count = sizes[index];
        const settlementClass = settlementClassFor(count, stage, civ.era);
        const rank = CLASS_ORDER.indexOf(settlementClass);
        // Settlements reach nearer the world edges than they used to: at full scroll the last quarter of
        // a stage-4 world was empty ground, because nothing was ever placed past 94% of its width.
        const centerX = Math.max(0, Math.min(worldWidth, worldWidth * (.045 + (index + .5) / sizes.length * .915) + (hash01(civ.seed * 11 + index * 23) - .5) * worldWidth * CENTER_JITTER));
        // Bounded by the room a settlement actually has. Without the slot term nine settlements on a
        // phone-sized world each claimed a radius wider than the gap to their neighbour, and the whole
        // world became one continuous wall of buildings with no gaps, no outskirts and no silhouette.
        //
        // Measured against the *worst-case* gap rather than the nominal slot. Each centre carries its own
        // jitter of +/- worldWidth * .0175, so two neighbours can drift toward each other and close the
        // gap by worldWidth * .035 -- and two radii capped at .46 of the nominal slot then overlap by a
        // third of their own width. Measured before this: 1.34x on a 390 px world at nine settlements,
        // which is the exact case the cap was added for.
        const slot = worldWidth * .915 / sizes.length;
        const worstGap = Math.max(0, slot - worldWidth * CENTER_JITTER);
        const radius = Math.max(24, Math.min(worldWidth * .18, worstGap * .46, 20 + count * (7 + stage * 2.6)));
        const structures = [];
        const plots = districtPlots(count, rank, civ.seed * 3 + index * 29);
        for (let i = 0; i < count; i++) {
            const plot = plots[i];
            const level = stage === 0
                ? (hash01(civ.seed * 37 + globalIndex * 7) < .82 ? 0 : 1)
                : Math.min(6, Math.max(1, stage - 1 + Math.trunc(civ.development / 180) + civ.era + Math.trunc(hash01(civ.seed * 13 + globalIndex * 19) * 1.6)));
            // Deterministic depth lane, nudged by where the plot stands: the outskirts sit further back or
            // further forward than the core, which is what keeps a skyline from collapsing onto one line.
            const laneVal = hash01(civ.seed * 41 + globalIndex * 17) * .78 + (plot.district === 'core' ? .11 : plot.district === 'edge' ? (hash01(globalIndex * 13) < .5 ? 0 : .22) : .11);
            const depthLane = laneVal < 0.28 ? 'back' : laneVal > 0.72 ? 'front' : 'mid';
            const laneScale = depthLane === 'back' ? 0.85 : depthLane === 'front' ? 1.12 : 1.0;
            const distFromCenter = Math.abs(plot.u - .5) * 2;
            let classScale = 1.0;
            if (settlementClass === 'camp')
                classScale = 0.5;
            else if (settlementClass === 'village')
                classScale = 0.7;
            else if (settlementClass === 'town')
                classScale = 0.9;
            else if (settlementClass === 'city')
                classScale = 1.15;
            else if (settlementClass === 'metropolis')
                classScale = 1.35;
            else if (settlementClass === 'arcology')
                classScale = distFromCenter < 0.25 ? 1.85 : 0.85;
            // Skyline hierarchy: tall in the core, falling away to the outskirts, with one dominant
            // structure per neighbourhood so each district reads as a place rather than as a queue.
            const dominance = plot.coreOfCluster ? (plot.district === 'core' ? 1.45 : 1.22) : .92 + hash01(civ.seed * 61 + globalIndex * 23) * .2;
            const heightDensityMult = Math.max(0.42, (1.25 - distFromCenter * 0.62) * classScale * dominance);
            const width = (14 + hash01(civ.seed * 17 + globalIndex * 29) * 30 + level * 3) * (stage === 0 ? .7 : 1 + stage * .08) * laneScale * widthScale;
            const baseHeight = (26 + hash01(civ.seed * 53 + globalIndex * 13) * 120 + level * 22) * scale * heightDensityMult * laneScale * heightScale;
            const kind = kindFor(i, count, settlementClass, civ.era, stage, civ.seed + index * 101, allowed, distFromCenter);
            // Profile by use, so a class is legible from its silhouette alone: farms lie along the ground,
            // industry keeps a heavy low mass under its chimneys, and only the civic and residential
            // structures compete for the skyline.
            const kindProfile = kind === 'farm' ? .4 : kind === 'industry' ? .72 : kind === 'monument' ? .82 : 1;
            const structureHeight = Math.max(18, Math.min(skylineBudget, baseHeight * kindProfile));
            structures.push({
                id: `s${index}:${i}`,
                x: centerX - radius + radius * 2 * plot.u,
                width, height: structureHeight,
                kind,
                level,
                depthLane,
                district: plot.district,
                lightPhase: hash01(civ.seed * 97 + globalIndex * 31),
            });
            globalIndex++;
        }
        // Sort structures deterministically by depth lane (back -> mid -> front) so front buildings overlap back buildings cleanly
        const laneWeight = { back: 0, mid: 1, front: 2 };
        structures.sort((a, b) => (laneWeight[a.depthLane || 'mid'] - laneWeight[b.depthLane || 'mid']) || (a.x - b.x));
        settlements.push({ id: `s${index}`, centerX, radius, settlementClass, factionIndex: -1, structures, lightPhase: hash01(civ.seed * 71 + index * 137) });
    }
    if (roster.length) {
        const order = [...settlements].sort((a, b) => b.structures.length - a.structures.length);
        let cursor = 0;
        for (let f = 0; f < roster.length && cursor < order.length; f++) {
            const quota = f === roster.length - 1
                ? order.length - cursor
                : Math.max(1, Math.round(roster[f].share * order.length));
            for (let taken = 0; taken < quota && cursor < order.length; taken++)
                order[cursor++].factionIndex = f;
        }
        for (const settlement of order)
            if (settlement.factionIndex < 0)
                settlement.factionIndex = 0;
    }
    return settlements;
}
export const OUTSKIRT_SPACING = 210;
export const MAX_OUTSKIRTS = 64;
/** Widest prop, so the renderer can state its cull slack in terms of the design. */
export const OUTSKIRT_WIDTH = 74;
export function worldOutskirts(civ, worldWidth, snapshot, settlements) {
    const stage = snapshot.stage;
    const cells = Math.min(MAX_OUTSKIRTS, Math.max(0, Math.floor(worldWidth / OUTSKIRT_SPACING)));
    const props = [];
    for (let cell = 0; cell < cells; cell++) {
        const roll = hash01(civ.seed * 13 + cell * 71);
        // Two thirds of the cells stay empty: the point is to break the emptiness, not to tile the world.
        if (roll > .62)
            continue;
        const x = (cell + .5) * OUTSKIRT_SPACING + (hash01(civ.seed * 29 + cell * 17) - .5) * OUTSKIRT_SPACING * .5;
        if (x < 0 || x > worldWidth)
            continue;
        // How far the nearest settlement is decides what stands here: fields and groves belong to a
        // civilization's edge, rocks and ruins to the ground it never took.
        let nearest = Number.POSITIVE_INFINITY;
        for (const settlement of settlements)
            nearest = Math.min(nearest, Math.abs(settlement.centerX - x) - settlement.radius);
        const pick = hash01(civ.seed * 53 + cell * 37);
        let kind;
        if (nearest < 60)
            kind = pick < .55 ? 'field' : 'grove';
        else if (stage >= 2 && pick < .3)
            kind = 'pylon';
        else if (stage >= 3 && pick < .45)
            kind = 'ruin';
        else
            kind = pick < .72 ? 'rocks' : 'grove';
        props.push({ x, kind, scale: .7 + hash01(civ.seed * 41 + cell * 13) * .6, seed: civ.seed + cell * 101 });
    }
    return props;
}
//# sourceMappingURL=settlements.js.map