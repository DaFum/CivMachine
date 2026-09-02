import { hash01, mixColor, shade, tint } from './primitives.js';
import { structureEffectiveGround } from './settlements.js';
export const BANNER_CLEARANCE = 34;
export const BANNER_POLE_MIN = 16;
export function settlementCrown(settlement, groundY = 0) {
    return settlement.structures.reduce((max, structure) => {
        const effGround = structureEffectiveGround(groundY, structure.depthLane);
        const top = effGround - structure.height;
        return Math.max(max, groundY - top);
    }, 0);
}
/**
 * Banner geometry, shared by the cached and the animated layer. The top is clamped into view so a
 * tall arcology skyline cannot push a settlement's banner off the upper edge; the pole shortens
 * instead of the banner disappearing.
 */
export function bannerGeometry(settlement, groundY, height) {
    const anchorY = groundY - settlementCrown(settlement, groundY);
    const topY = Math.max(height * .04, anchorY - BANNER_CLEARANCE);
    return { x: settlement.centerX, topY, poleHeight: Math.max(BANNER_POLE_MIN, anchorY - topY) };
}
export function structureKindsForEra(era, stage) {
    if (stage === 0)
        return ['dwelling', 'farm'];
    const kinds = ['dwelling', 'farm', 'temple', 'monument'];
    if (era >= 1)
        kinds.push('industry', 'academy');
    if (era >= 2)
        kinds.push('reactor', 'spaceport');
    if (era >= 3)
        kinds.push('orbital_anchor');
    return kinds;
}
const LANE_FADE = { back: .38, mid: .15, front: .04 };
const LANE_SHADE = { back: .3, mid: .12, front: 0 };
// One light direction for the whole world: the sky is brightest at the horizon behind the city, so
// every solid is lit on its left face and turns away into shadow on its right.
const SIDE_SPLIT = .72;
/**
 * A lit front plane, a shadowed side plane, a roof edge catching the sky and a contact shadow on the
 * ground. Every kind builds its silhouette out of this, which is what makes the material read as one
 * world rather than as nine unrelated icons.
 */
function solid(surface, left, top, width, height, lit, dark, roof, alpha, roofLight) {
    if (width <= 0 || height <= 0)
        return;
    const face = Math.max(1, width * SIDE_SPLIT);
    surface.fillStyle(lit, alpha).fillRect(left, top, face, height);
    surface.fillStyle(dark, alpha).fillRect(left + face, top, Math.max(0, width - face), height);
    if (roofLight)
        surface.lineStyle(1, roof, .4).line(left, top, left + width, top);
}
export function drawStructure(surface, structure, baseGroundY, bodyColor, accent, windowColor, seed, style = {}) {
    const lane = structure.depthLane || 'mid';
    const groundY = structureEffectiveGround(baseGroundY, lane);
    const fadeColor = style.fadeColor ?? 0x1b2c3d;
    // Aerial perspective: the further back a plane sits, the more of the atmosphere is in front of it.
    const fade = LANE_FADE[lane] * (style.fade ?? 1);
    const lightLevel = Math.max(0, Math.min(1, style.lightLevel ?? .5));
    const baseColor = mixColor(shade(bodyColor, LANE_SHADE[lane]), fadeColor, fade);
    const litColor = tint(baseColor, lane === 'front' ? .07 : .03);
    const darkColor = shade(baseColor, .44);
    const roofColor = mixColor(tint(baseColor, .3), accent, .25);
    const laneAlphaShift = lane === 'back' ? 0.9 : 1.0;
    const detail = lane === 'back' ? .55 : lane === 'front' ? 1 : .8;
    const left = structure.x - structure.width / 2;
    const top = groundY - structure.height;
    const width = structure.width;
    const height = structure.height;
    // Contact shadow: the one thing that stops a building from floating over its own ground line.
    surface.fillStyle(0x020509, .34 * detail).fillRect(left - width * 0.12, groundY - 2, width * 1.24, 4);
    switch (structure.kind) {
        case 'farm': {
            // Low, horizontal and organic: a long shed under a broad roof with worked ground around it.
            const shedHeight = height * .3;
            solid(surface, left, groundY - shedHeight, width, shedHeight, mixColor(litColor, 0x5c7040, .38), mixColor(darkColor, 0x33401f, .34), roofColor, laneAlphaShift, false);
            surface.fillStyle(mixColor(baseColor, 0x2b3520, .42), laneAlphaShift).fillTriangle(left - width * .14, groundY - shedHeight, structure.x, groundY - height * .58, left + width * 1.14, groundY - shedHeight);
            surface.lineStyle(1, tint(mixColor(accent, 0x8ee66b, .6), .25), .3).line(left - width * .14, groundY - shedHeight, structure.x, groundY - height * .58);
            for (let row = 0; row < 4; row++)
                surface.lineStyle(1, mixColor(accent, 0x7fbf62, .55), .2 * detail).line(left - width * .34, groundY + 3 + row * 4, left + width * 1.34, groundY + 3 + row * 4);
            break;
        }
        case 'industry': {
            // Heavy dark mass, chimney silhouette, warm emission. The body is deliberately the darkest
            // solid in the settlement, so an industrial edge reads as one even in a screenshot.
            const bodyHeight = height * .56;
            solid(surface, left, groundY - bodyHeight, width * .78, bodyHeight, shade(litColor, .3), shade(darkColor, .25), roofColor, laneAlphaShift, false);
            surface.fillStyle(shade(darkColor, .4), laneAlphaShift).fillRect(left + width * .78, groundY - bodyHeight * .74, width * .22, bodyHeight * .74);
            for (let stack = 0; stack < 2; stack++) {
                const stackX = left + width * (.24 + stack * .46);
                surface.fillStyle(shade(baseColor, .5), laneAlphaShift).fillRect(stackX, top, width * .16, height);
                surface.fillRadialGlow(stackX + width * .08, top - height * .06, 0, width * .34, [
                    { offset: 0, color: mixColor(0xff7744, windowColor, .3), alpha: .22 + lightLevel * .14 },
                    { offset: 1, color: mixColor(0xff7744, windowColor, .3), alpha: 0 },
                ]);
                surface.fillStyle(0x8f9aa6, .08 * detail).fillCircle(stackX + width * .08 + width * .12, top - height * .18, width * .3);
            }
            surface.fillStyle(mixColor(0xff7744, windowColor, .4), (.16 + lightLevel * .2) * detail).fillRect(left + width * .1, groundY - bodyHeight * .3, width * .5, bodyHeight * .1);
            break;
        }
        case 'temple': {
            // Clean geometry crowned with accent light: the only kind whose crown leaves the silhouette.
            const bodyHeight = height * .7;
            solid(surface, left, groundY - bodyHeight, width, bodyHeight, mixColor(litColor, accent, .22), mixColor(darkColor, accent, .1), roofColor, laneAlphaShift, true);
            surface.fillStyle(mixColor(baseColor, accent, .5), laneAlphaShift).fillRect(left + width * .16, top, width * .68, height * .3);
            // Tight enough to read as a lit crown on the building. A wide one turned every temple in the
            // world into a pale disc behind the skyline that read as a second moon.
            surface.fillRadialGlow(structure.x, top - width * .1, 0, width * .34, [
                { offset: 0, color: accent, alpha: .2 + lightLevel * .14 },
                { offset: .4, color: accent, alpha: .06 },
                { offset: 1, color: accent, alpha: 0 },
            ]);
            surface.fillStyle(accent, .42).fillCircle(structure.x, top - width * .1, width * .15);
            surface.lineStyle(1.5, accent, .5).line(structure.x, top - width * .4, structure.x, top - width * .1);
            break;
        }
        case 'academy': {
            // Restrained luminous framing over a colonnade: institutional, not industrial.
            solid(surface, left, top, width, height, mixColor(litColor, accent, .12), darkColor, roofColor, laneAlphaShift, true);
            surface.lineStyle(1, accent, .42).strokeRect(left + width * .12, top + height * .12, width * .76, height * .5);
            surface.fillStyle(accent, (.05 + lightLevel * .08) * detail).fillRect(left + width * .12, top + height * .12, width * .76, height * .5);
            for (let column = 0; column < 3; column++)
                surface.lineStyle(1.4, accent, .32 * detail).line(left + width * (.2 + column * .3), groundY - height * .3, left + width * (.2 + column * .3), groundY);
            break;
        }
        case 'reactor': {
            // A containment block with a genuine core: the glow is the light source, the block is what it
            // lights, and the ring is the only hard edge.
            const bodyHeight = height * .48;
            const coreY = groundY - bodyHeight - width * .18;
            solid(surface, left, groundY - bodyHeight, width, bodyHeight, litColor, darkColor, roofColor, laneAlphaShift, true);
            // The core sits *on* its containment block rather than floating above it, and it is a piece of
            // machinery with a lit centre -- not a disc bright enough to read as a second moon.
            surface.fillRadialGlow(structure.x, coreY, 0, width * (.7 + lightLevel * .25), [
                { offset: 0, color: accent, alpha: .32 + lightLevel * .14 },
                { offset: .4, color: accent, alpha: .12 },
                { offset: 1, color: accent, alpha: 0 },
            ]);
            surface.fillStyle(mixColor(darkColor, accent, .45), .95).fillCircle(structure.x, coreY, width * .3);
            surface.fillStyle(tint(accent, .35), .72).fillCircle(structure.x, coreY, width * .15);
            surface.lineStyle(2, accent, .5).strokeCircle(structure.x, coreY, width * .38);
            surface.lineStyle(1, accent, .3).strokeCircle(structure.x, coreY, width * .52);
            break;
        }
        case 'spaceport': {
            // Strong horizontal base, a mast, guy lines and pad illumination lying on the apron.
            const apron = height * .2;
            solid(surface, left, groundY - apron, width * 1.3, apron, litColor, darkColor, roofColor, laneAlphaShift, true);
            surface.lineStyle(2, accent, .55).line(structure.x, groundY - apron, structure.x, top);
            surface.lineStyle(1.2, accent, .28).line(left + width * .1, groundY - apron, structure.x, top + height * .32);
            surface.lineStyle(1.2, accent, .28).line(left + width * 1.2, groundY - apron, structure.x, top + height * .32);
            surface.fillStyle(accent, .26).fillTriangle(structure.x - width * .18, top, structure.x, top - height * .3, structure.x + width * .18, top);
            surface.fillRadialGlow(structure.x, groundY - apron * .4, 0, width * .8, [
                { offset: 0, color: mixColor(0xffd9a0, accent, .3), alpha: .3 + lightLevel * .22 },
                { offset: 1, color: mixColor(0xffd9a0, accent, .3), alpha: 0 },
            ]);
            break;
        }
        case 'orbital_anchor': {
            // A dramatic vertical: the tether leaves the frame and the rings hold it, nothing else.
            surface.fillStyle(mixColor(baseColor, accent, .4), laneAlphaShift).fillRect(structure.x - width * .16, top - height * .34, width * .32, height * 1.34);
            surface.fillStyle(shade(mixColor(baseColor, accent, .4), .45), laneAlphaShift).fillRect(structure.x + width * .07, top - height * .34, width * .09, height * 1.34);
            surface.lineStyle(1.2, accent, .45).line(structure.x, top - height * .52, structure.x, groundY);
            // Segment bands up the tether: without them the shaft was one flat pale slab.
            for (let band = 0; band < 5; band++) {
                surface.fillStyle(shade(mixColor(baseColor, accent, .4), .3), .8).fillRect(structure.x - width * .16, top - height * .34 + band * height * .27, width * .32, 2);
            }
            for (let ring = 0; ring < 3; ring++)
                surface.lineStyle(1, accent, .2).strokeCircle(structure.x, top - height * .06 + ring * height * .3, width * (.5 - ring * .12));
            surface.fillRadialGlow(structure.x, top - height * .06, 0, width * .8, [
                { offset: 0, color: accent, alpha: .12 + lightLevel * .1 },
                { offset: 1, color: accent, alpha: 0 },
            ]);
            break;
        }
        case 'monument': {
            surface.fillStyle(mixColor(litColor, accent, .45), laneAlphaShift).fillTriangle(left + width * .1, groundY, structure.x, top - height * .25, left + width * .52, groundY);
            surface.fillStyle(shade(mixColor(baseColor, accent, .45), .38), laneAlphaShift).fillTriangle(left + width * .52, groundY, structure.x, top - height * .25, left + width * .9, groundY);
            surface.lineStyle(1.4, accent, .45).strokeCircle(structure.x, top - height * .3, width * .22);
            break;
        }
        default: {
            // Dwellings and offices: the bulk of any skyline, so this is where the setbacks, plinths and
            // roof furniture live. A tall one steps in as it rises rather than ending in a flat slab.
            const stepped = height > 90 && structure.level >= 3;
            const shaftHeight = stepped ? height * .72 : height;
            solid(surface, left, groundY - shaftHeight, width, shaftHeight, litColor, darkColor, roofColor, laneAlphaShift, true);
            if (stepped) {
                const inset = width * .16;
                solid(surface, left + inset, top, width - inset * 2, height - shaftHeight, tint(litColor, .04), shade(darkColor, .08), roofColor, laneAlphaShift, true);
            }
            // Plinth: a slightly wider, darker base tying the shaft to the ground plane.
            surface.fillStyle(shade(baseColor, .5), laneAlphaShift).fillRect(left - width * .05, groundY - Math.max(3, height * .05), width * 1.1, Math.max(3, height * .05));
            surface.lineStyle(1, shade(roofColor, .2), .22).strokeRect(left, groundY - shaftHeight, width, shaftHeight);
            if (structure.level >= 4 && detail > .6) {
                // Roof furniture, aligned to the lit face so it reads as part of the same solid.
                surface.fillStyle(darkColor, laneAlphaShift).fillRect(left + width * .2, top - height * .06, width * .24, height * .06);
                surface.lineStyle(1, accent, .4).line(left + width * .74, top, left + width * .74, top - height * .14);
            }
            break;
        }
    }
    // The persistent window grid. Rows and columns rather than a single stripe per row: a facade with
    // two lit columns and a dark one is what makes a building read as inhabited at real display size.
    const columns = Math.max(1, Math.min(4, Math.trunc(width / 11)));
    const rows = Math.max(1, Math.min(7, Math.trunc(structure.height / 20)));
    const bodyTop = structure.kind === 'farm' ? groundY - height * .3 : structure.kind === 'industry' ? groundY - height * .56 : top;
    const bodyHeight = groundY - bodyTop;
    if (bodyHeight > 16 && structure.kind !== 'orbital_anchor' && structure.kind !== 'monument') {
        const cellW = (width * SIDE_SPLIT) / columns;
        const cellH = bodyHeight * .74 / rows;
        for (let row = 0; row < rows; row++) {
            for (let column = 0; column < columns; column++) {
                if (hash01(seed + structure.x + row * 17 + column * 131) < .42)
                    continue;
                const alpha = (.22 + hash01(seed + row * 31 + column * 7) * .3) * (.55 + lightLevel * .6) * detail;
                surface.fillStyle(windowColor, Math.min(.9, alpha))
                    .fillRect(left + cellW * (column + .28), bodyTop + bodyHeight * .12 + row * cellH, Math.max(1.4, cellW * .44), Math.max(1.6, Math.min(3.4, cellH * .42)));
            }
        }
    }
}
const SIGIL_DRAW = {
    spire: (s, x, y, size, color) => { s.fillStyle(color, .85).fillTriangle(x - size * .3, y + size * .4, x, y - size * .5, x + size * .3, y + size * .4); },
    node: (s, x, y, size, color) => { s.fillStyle(color, .85).fillCircle(x, y, size * .3); s.lineStyle(1, color, .7).line(x - size * .5, y, x + size * .5, y); },
    ring: (s, x, y, size, color) => { s.lineStyle(1.6, color, .85).strokeCircle(x, y, size * .42); },
    prism: (s, x, y, size, color) => { s.lineStyle(1.4, color, .85).line(x - size * .4, y + size * .35, x, y - size * .45).line(x, y - size * .45, x + size * .4, y + size * .35).line(x + size * .4, y + size * .35, x - size * .4, y + size * .35); },
    spiral: (s, x, y, size, color) => { for (let i = 0; i < 3; i++)
        s.lineStyle(1, color, .8 - i * .18).strokeCircle(x, y, size * (.16 + i * .14)); },
    chevron: (s, x, y, size, color) => { s.lineStyle(1.6, color, .85).line(x - size * .4, y + size * .2, x, y - size * .3).line(x, y - size * .3, x + size * .4, y + size * .2); },
    grid: (s, x, y, size, color) => { s.lineStyle(1, color, .8).line(x - size * .4, y - size * .12, x + size * .4, y - size * .12).line(x - size * .4, y + size * .18, x + size * .4, y + size * .18).line(x, y - size * .4, x, y + size * .4); },
    halo: (s, x, y, size, color) => { s.lineStyle(1.4, color, .85).strokeCircle(x, y - size * .1, size * .34); s.fillStyle(color, .3).fillCircle(x, y + size * .28, size * .16); },
    void: (s, x, y, size, color) => { s.fillStyle(color, .22).fillCircle(x, y, size * .46); s.lineStyle(1.4, color, .85).strokeCircle(x, y, size * .2); },
    nest: (s, x, y, size, color) => { for (let i = 0; i < 4; i++)
        s.fillStyle(color, .7 - i * .12).fillCircle(x + (i % 2 ? size * .22 : -size * .22), y + (i < 2 ? -size * .16 : size * .16), size * .15); },
};
export function drawBanner(surface, x, topY, poleHeight, color, sigil, wave) {
    const bottomY = topY + poleHeight;
    surface.lineStyle(1.6, mixColor(color, 0x000000, .45), .9).line(x, topY, x, bottomY);
    const clothWidth = Math.max(9, poleHeight * .46);
    const clothHeight = Math.max(7, poleHeight * .36);
    const sway = Math.sin(wave * Math.PI * 2) * clothWidth * .16;
    surface.fillStyle(color, .82).fillPoly([
        [x, topY + 1],
        [x + clothWidth + sway, topY + 1 + sway * .4],
        [x + clothWidth + sway * .5, topY + clothHeight + sway * .4],
        [x, topY + clothHeight],
    ]);
    SIGIL_DRAW[sigil](surface, x + clothWidth * .52 + sway * .5, topY + clothHeight * .5, clothHeight, mixColor(color, 0x08111a, .7));
}
//# sourceMappingURL=structures.js.map