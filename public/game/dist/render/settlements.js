import { hash01 } from './primitives.js';
import { factionRoster } from './factions.js';
import { structureKindsForEra } from './structures.js';
import { worldWidthMultiplier } from './world-model.js';
export const CLASS_ORDER = ['camp', 'village', 'town', 'city', 'metropolis', 'arcology'];
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
function kindFor(index, count, settlementClass, era, stage, seed, allowed) {
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
    const distance = count <= 1 ? 0 : Math.abs((index + .5) / count - .5) * 2;
    if (distance > .7)
        return pick('farm');
    if (distance > .5 && allowed.has('industry') && hash01(seed + index * 37) > .45)
        return 'industry';
    return 'dwelling';
}
export function settlementLayout(civ, worldWidth, height, snapshot) {
    const stage = snapshot.stage;
    const sizes = settlementSizes(civ, snapshot);
    const roster = factionRoster(civ);
    const scale = [.24, .46, .7, .96, 1.28][stage] ?? .24;
    const viewportWidth = worldWidth / worldWidthMultiplier(civ);
    const mobileScale = viewportWidth < 800 ? 1.25 : (viewportWidth < 1200 ? 1.12 : 1.0);
    const allowed = new Set(structureKindsForEra(civ.era, stage));
    const settlements = [];
    let globalIndex = 0;
    for (let index = 0; index < sizes.length; index++) {
        const count = sizes[index];
        const settlementClass = settlementClassFor(count, stage, civ.era);
        const centerX = Math.max(0, Math.min(worldWidth, worldWidth * (.06 + (index + .5) / sizes.length * .88) + (hash01(civ.seed * 11 + index * 23) - .5) * worldWidth * .04));
        const radius = Math.max(24, Math.min(worldWidth * .18, 20 + count * (7 + stage * 2.6)));
        const structures = [];
        for (let i = 0; i < count; i++) {
            const level = stage === 0
                ? (hash01(civ.seed * 37 + globalIndex * 7) < .82 ? 0 : 1)
                : Math.min(6, Math.max(1, stage - 1 + Math.trunc(civ.development / 180) + civ.era + Math.trunc(hash01(civ.seed * 13 + globalIndex * 19) * 1.6)));
            // Deterministic depth lane
            const laneVal = hash01(civ.seed * 41 + globalIndex * 17);
            const depthLane = laneVal < 0.28 ? 'back' : laneVal > 0.72 ? 'front' : 'mid';
            const laneScale = depthLane === 'back' ? 0.85 : depthLane === 'front' ? 1.12 : 1.0;
            // Skyline hierarchy & class-differentiated spatial composition
            const distFromCenter = count <= 1 ? 0 : Math.abs((i + 0.5) / count - 0.5) * 2;
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
            const heightDensityMult = Math.max(0.5, (1.25 - distFromCenter * 0.55) * classScale);
            const width = (14 + hash01(civ.seed * 17 + globalIndex * 29) * 30 + level * 3) * (stage === 0 ? .7 : 1 + stage * .08) * laneScale * mobileScale;
            const baseHeight = (26 + hash01(civ.seed * 53 + globalIndex * 13) * 120 + level * 22) * scale * heightDensityMult * laneScale * mobileScale;
            const structureHeight = Math.max(18, Math.min(height * .68, baseHeight));
            structures.push({
                id: `s${index}:${i}`,
                x: centerX - radius + radius * 2 * (i + .5) / count,
                width, height: structureHeight,
                kind: kindFor(i, count, settlementClass, civ.era, stage, civ.seed + index * 101, allowed),
                level,
                depthLane,
            });
            globalIndex++;
        }
        // Sort structures deterministically by depth lane (back -> mid -> front) so front buildings overlap back buildings cleanly
        const laneWeight = { back: 0, mid: 1, front: 2 };
        structures.sort((a, b) => (laneWeight[a.depthLane || 'mid'] - laneWeight[b.depthLane || 'mid']) || (a.x - b.x));
        settlements.push({ id: `s${index}`, centerX, radius, settlementClass, factionIndex: -1, structures });
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
//# sourceMappingURL=settlements.js.map