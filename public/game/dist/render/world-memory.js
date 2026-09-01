import { sanitizeWorldMemory } from '../game/world-memory.js';
/**
 * The structural half of saved memory: what a mark or scar *is*, never how many decisions have gone
 * past. `sequence` climbs on every completed decision, so folding it in would rebuild every cached
 * layer once per choice for memory that did not change.
 */
export function worldMemorySignature(value) {
    const memory = sanitizeWorldMemory(value);
    const marks = memory.marks.map(mark => `${mark.domain}:${mark.motif}:${mark.strength}:${mark.anchor01.toFixed(4)}:${mark.repaired ? 1 : 0}`).sort();
    const scars = memory.scars.map(scar => `${scar.domain}:${scar.motif}:${scar.strength}:${scar.anchor01.toFixed(4)}:${scar.evolution}`).sort();
    return `${marks.join(';')}|${scars.join(';')}`;
}
// A mark belongs to the civilization, not to empty ground, so its deterministic anchor snaps to the
// nearest settlement centre rather than landing wherever the hash pointed.
function anchorX(anchor01, worldWidth, settlements) {
    const target = Math.max(0, Math.min(worldWidth, anchor01 * worldWidth));
    if (!settlements.length)
        return target;
    // One scan rather than a copy and a sort: this runs per mark and per scar, and the scar halos run
    // on the dynamic layer. A strict `<` keeps the first settlement in layout order when two tie,
    // which is what the stable sort it replaces did.
    let best = settlements[0], bestDistance = Math.abs(best.centerX - target);
    for (let i = 1; i < settlements.length; i++) {
        const settlement = settlements[i], distance = Math.abs(settlement.centerX - target);
        if (distance < bestDistance) {
            best = settlement;
            bestDistance = distance;
        }
    }
    return best.centerX;
}
function visible(x, view, slack = 90) { return x >= view.from - slack && x <= view.to + slack; }
function drawMark(surface, mark, x, ground, accent) {
    const s = mark.strength;
    const color = mark.repaired ? 0x73e6bd : accent;
    const alpha = mark.repaired ? .38 : .68;
    if (mark.domain === 'built_environment') {
        surface.fillStyle(color, alpha * .3).fillRect(x - 10 - s * 4, ground - 20 - s * 10, 20 + s * 8, 20 + s * 10);
        surface.lineStyle(1.4, color, alpha).strokeRect(x - 12 - s * 4, ground - 22 - s * 10, 24 + s * 8, 24 + s * 10);
        if (mark.repaired)
            surface.lineStyle(1, 0x73e6bd, .5).line(x - 12 - s * 4, ground, x + 12 + s * 4, ground - 22 - s * 10);
    }
    else if (mark.domain === 'identity') {
        for (let i = 0; i < s + 1; i++)
            surface.lineStyle(1.4, color, alpha).strokeCircle(x, ground - 24 - s * 10, 8 + i * 7);
    }
    else if (mark.domain === 'control') {
        surface.lineStyle(1.4, color, alpha).line(x, ground - 4, x, ground - 60 - s * 9);
        surface.strokeCircle(x, ground - 65 - s * 9, 8 + s * 3);
    }
    else if (mark.domain === 'social') {
        for (let i = 0; i < 3 + s; i++)
            surface.fillStyle(mark.repaired ? 0x73e6bd : 0xee6973, alpha * .75).fillCircle(x - 20 + i * 9, ground - 4 - (i % 2) * 3, 2.5);
    }
    else if (mark.domain === 'ecology') {
        for (let i = 0; i < 2 + s; i++) {
            surface.lineStyle(1.3, mark.repaired ? 0x73e6bd : 0x8ee66b, alpha).line(x + i * 8 - 12, ground + 10, x + i * 10 - 18, ground - 22 - s * 6);
        }
    }
    else {
        surface.lineStyle(1.6, mark.repaired ? 0x73e6bd : 0xee6973, alpha).line(x - 14, ground - 55 - s * 9, x + 5, ground - 28);
        surface.line(x + 5, ground - 28, x - 10, ground - 4);
    }
}
function drawScar(surface, scar, x, ground, accent) {
    const s = scar.strength;
    const alpha = .6 + s * .12;
    if (scar.domain === 'reality') {
        // Scorched crater baseline extending deep into ground terrain
        surface.fillStyle(0x0a050d, .72).fillRect(x - 30 - s * 8, ground - 2, 60 + s * 16, 18);
        for (let i = 0; i < 3 + s + Math.min(2, scar.evolution); i++) {
            surface.lineStyle(1.6 + (i % 2) * 0.4, 0xee6973, alpha)
                .line(x - 26 + i * 10, ground - 92, x - 14 + i * 8, ground + 14);
        }
    }
    else if (scar.domain === 'civilization') {
        // Scorched foundation crater plinth and structural fracture lines
        surface.fillStyle(0x0e0612, .95).fillRect(x - 32 - s * 8, ground - 14 - s * 8, 64 + s * 16, 18 + s * 8);
        surface.lineStyle(1.5, 0xee6973, alpha).line(x - 32 - s * 8, ground - 14 - s * 8, x + 32 + s * 8, ground);
        surface.lineStyle(1.2, 0xee6973, alpha * .7).line(x - 20 - s * 4, ground, x + 20 + s * 4, ground - 14 - s * 8);
    }
    else {
        surface.fillStyle(0x0a050d, .6).fillRect(x - 24 - s * 5, ground - 6, 48 + s * 10, 10);
        surface.lineStyle(2.2, accent, alpha).strokeCircle(x, ground - 48 - s * 10, 18 + s * 7);
        surface.lineStyle(1.2, accent, alpha * .8).strokeRect(x - 14 - s * 4, ground - 60 - s * 12, 28 + s * 8, 28 + s * 8);
    }
}
/** Persistent geometry, so it belongs on the cached scenery layer that scrolls 1:1 with the world. */
export function drawWorldMemoryScenery(surface, civ, worldWidth, ground, settlements, accent, view) {
    const memory = sanitizeWorldMemory(civ.visualMemory);
    for (const mark of memory.marks) {
        const x = anchorX(mark.anchor01, worldWidth, settlements);
        if (visible(x, view))
            drawMark(surface, mark, x, ground, accent);
    }
    for (const scar of memory.scars) {
        const x = anchorX(scar.anchor01, worldWidth, settlements);
        if (visible(x, view, 120))
            drawScar(surface, scar, x, ground, accent);
    }
}
/** The only animated part of memory: a slow halo over scars, so the geometry itself stays cached. */
export function drawWorldMemoryAccents(surface, civ, worldWidth, ground, settlements, accent, view, time, reducedMotion) {
    const memory = sanitizeWorldMemory(civ.visualMemory);
    const pulse = reducedMotion ? 1 : .65 + Math.sin(time * .002) * .35;
    for (const scar of memory.scars) {
        const x = anchorX(scar.anchor01, worldWidth, settlements);
        if (!visible(x, view, 120))
            continue;
        if (scar.domain === 'reality')
            surface.lineStyle(1, 0xee6973, .12 + .12 * pulse).strokeCircle(x, ground - 42, 22 + scar.strength * 8);
        if (scar.domain === 'identity')
            surface.lineStyle(1, accent, .1 + .12 * pulse).strokeCircle(x, ground - 52, 28 + scar.strength * 7);
    }
}
//# sourceMappingURL=world-memory.js.map