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
    return [...settlements].sort((a, b) => Math.abs(a.centerX - target) - Math.abs(b.centerX - target))[0].centerX;
}
function visible(x, view, slack = 90) { return x >= view.from - slack && x <= view.to + slack; }
function drawMark(surface, mark, x, ground, accent) {
    const s = mark.strength;
    const alpha = mark.repaired ? .35 : .62;
    if (mark.domain === 'built_environment') {
        surface.fillStyle(accent, alpha * .35).fillRect(x - 8 - s * 4, ground - 18 - s * 10, 16 + s * 8, 18 + s * 10);
        surface.lineStyle(1.2, accent, alpha).strokeRect(x - 10 - s * 4, ground - 20 - s * 10, 20 + s * 8, 20 + s * 10);
    }
    else if (mark.domain === 'identity') {
        for (let i = 0; i < s + 1; i++)
            surface.lineStyle(1.2, accent, alpha).strokeCircle(x, ground - 22 - s * 10, 8 + i * 7);
    }
    else if (mark.domain === 'control') {
        surface.lineStyle(1.2, accent, alpha).line(x, ground - 8, x, ground - 55 - s * 9);
        surface.strokeCircle(x, ground - 60 - s * 9, 7 + s * 3);
    }
    else if (mark.domain === 'social') {
        for (let i = 0; i < 3 + s; i++)
            surface.fillStyle(0xee6973, alpha * .65).fillCircle(x - 18 + i * 8, ground - 4 - (i % 2) * 3, 2.2);
    }
    else if (mark.domain === 'ecology') {
        for (let i = 0; i < 2 + s; i++)
            surface.lineStyle(1.1, 0x8b7358, alpha).line(x + i * 7 - 10, ground, x + i * 9 - 16, ground - 18 - s * 5);
    }
    else {
        surface.lineStyle(1.5, 0xee6973, alpha).line(x - 12, ground - 50 - s * 9, x + 4, ground - 25);
        surface.line(x + 4, ground - 25, x - 8, ground - 6);
    }
}
function drawScar(surface, scar, x, ground, accent) {
    const s = scar.strength;
    const alpha = .55 + s * .1;
    if (scar.domain === 'reality')
        for (let i = 0; i < 3 + s + Math.min(2, scar.evolution); i++)
            surface.lineStyle(1.4 + (i % 2), 0xee6973, alpha).line(x - 24 + i * 9, ground - 86, x - 12 + i * 7, ground - 8);
    else if (scar.domain === 'civilization') {
        surface.fillStyle(0x161019, .92).fillRect(x - 28 - s * 7, ground - 12 - s * 8, 56 + s * 14, 12 + s * 8);
        surface.lineStyle(1.3, 0xee6973, alpha).line(x - 28 - s * 7, ground - 12 - s * 8, x + 28 + s * 7, ground);
    }
    else {
        surface.lineStyle(2, accent, alpha).strokeCircle(x, ground - 45 - s * 10, 16 + s * 7);
        surface.lineStyle(1, accent, alpha * .75).strokeRect(x - 12 - s * 4, ground - 57 - s * 12, 24 + s * 8, 24 + s * 8);
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