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
// Below this a solid is too small for a crown to be anything but noise on its roofline.
const CROWN_MIN_HEIGHT = 70;
/**
 * One crown, drawn on a roof already painted. Deliberately three or four primitives each: it runs
 * once per tall structure on the cached layer, and the identity has to read at skyline scale rather
 * than reward zooming in.
 */
function drawCrown(surface, crown, x, top, width, height, accent, body, lightLevel, detail) {
    // Sized by the *smaller* of the solid's two dimensions, not by its width. A short wide building --
    // which is what a landscape phone is full of, since a narrow viewport widens its structures and
    // budgets away its skyline -- was getting a crown half its own footprint across, and the frame
    // filled with lit discs floating over the roofline.
    const half = Math.max(4, Math.min(width, height * .55) * .5);
    // The lane's own contrast, applied to the crown rather than used to gate it. A back-lane solid is
    // further away, not a different civilization: gating on `detail` dropped the crown from a quarter
    // of the eligible skyline, including towers within 3% of the tallest in the world, and left those
    // roofs speaking for no path at all. Fading it keeps the aerial perspective and the identity both.
    const a = (alpha) => alpha * detail;
    switch (crown) {
        case 'luminous_core':
            // Machine Faith: a mast carrying a lit bead -- the machine kept burning above the roof. Held
            // deliberately dim: one of these is a signature, and a skyline carries eight of them at once.
            surface.lineStyle(1.4, accent, a(.42)).line(x, top, x, top - half * .7);
            surface.fillStyle(accent, a(.34 + lightLevel * .18)).fillCircle(x, top - half * .7, Math.max(1.4, half * .13));
            surface.lineStyle(1, accent, a(.16)).strokeCircle(x, top - half * .7, half * .3);
            break;
        case 'synchronized_cluster':
            // Collective Mind: three roof nodes wired to each other, never one alone.
            surface.lineStyle(1, accent, a(.38)).line(x - half * .6, top - half * .3, x + half * .6, top - half * .3);
            for (let node = -1; node <= 1; node++)
                surface.fillStyle(accent, a(.5)).fillCircle(x + node * half * .6, top - half * .3, Math.max(1.3, half * .14));
            break;
        case 'offset_ring':
            // Temporal Dominion: the roof and its echo, one beat out of place.
            surface.lineStyle(1.3, accent, a(.45)).strokeCircle(x, top - half * .34, half * .46);
            surface.lineStyle(1, accent, a(.24)).strokeCircle(x + half * .22, top - half * .48, half * .46);
            break;
        case 'geometric_frame':
            // Reality Engineering: a constraint standing on the roof, braced.
            surface.lineStyle(1.2, accent, a(.42)).strokeRect(x - half * .5, top - half * .62, half, half * .62);
            surface.lineStyle(1, accent, a(.26)).line(x - half * .5, top, x + half * .5, top - half * .62);
            break;
        case 'living_crown':
            // Biological Transcendence: growth, not termination -- three lobes off a short stem.
            surface.lineStyle(1.2, mixColor(accent, 0x8ee66b, .4), a(.4)).line(x, top, x, top - half * .4);
            for (let lobe = -1; lobe <= 1; lobe++)
                surface.fillStyle(mixColor(accent, 0x8ee66b, .4), a(.34)).fillCircle(x + lobe * half * .34, top - half * (.5 + Math.abs(lobe) * -.14), Math.max(1.8, half * .2));
            break;
        case 'blackout_shield':
            // Cosmic Resistance: a chevron cap over the roof, and the warning light under it.
            surface.lineStyle(1.6, accent, a(.45)).line(x - half * .6, top - half * .06, x, top - half * .5).line(x, top - half * .5, x + half * .6, top - half * .06);
            surface.fillStyle(accent, a(.3 + lightLevel * .2)).fillRect(x - half * .18, top - half * .1, half * .36, 2);
            break;
        case 'ordered_block':
            // Bureaucratic Singularity: a flat filed block, ruled twice. Nothing rises, nothing glows.
            surface.fillStyle(shade(body, .25), a(.9)).fillRect(x - half * .58, top - half * .3, half * 1.16, half * .3);
            surface.lineStyle(1, accent, a(.3)).line(x - half * .58, top - half * .2, x + half * .58, top - half * .2);
            surface.lineStyle(1, accent, a(.18)).line(x - half * .58, top - half * .1, x + half * .58, top - half * .1);
            break;
        case 'continuity_beacon':
            // Post-Mortal: a halo that never goes out, held clear of the roof it belongs to.
            surface.lineStyle(1.3, accent, a(.42)).strokeCircle(x, top - half * .55, half * .38);
            surface.fillStyle(accent, a(.18 + lightLevel * .12)).fillCircle(x, top - half * .55, half * .18);
            break;
        case 'absence_well':
            // Void Communion: the roofline taken away rather than added to, with the rim the loss leaves.
            surface.fillStyle(0x02040a, a(.82)).fillRect(x - half * .42, top - half * .22, half * .84, half * .34);
            surface.lineStyle(1, accent, a(.28)).line(x - half * .46, top - half * .22, x + half * .46, top - half * .22);
            break;
        case 'nested_crown':
            // Recursive Simulation: the same roof again, inside itself, twice.
            surface.lineStyle(1.1, accent, a(.38)).strokeRect(x - half * .62, top - half * .34, half * 1.24, half * .34);
            surface.lineStyle(1, accent, a(.26)).strokeRect(x - half * .38, top - half * .24, half * .76, half * .24);
            break;
    }
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
 *
 * The lit face is graded rather than filled flat: the top of a solid stands in the sky's own light
 * and its base stands in the air and the shadow the city puts there. One gradient per solid, on the
 * cached layer where it is paid per scroll -- a flat fill is what made a stage-4 skyline read as
 * cardboard whatever the palette did.
 */
function solid(surface, left, top, width, height, lit, dark, roof, alpha, roofLight) {
    if (width <= 0 || height <= 0)
        return;
    const face = Math.max(1, width * SIDE_SPLIT);
    if (height >= 14) {
        surface.fillLinearGradientRect(left, top, face, height, [
            { offset: 0, color: tint(lit, .1), alpha },
            { offset: .55, color: lit, alpha },
            { offset: 1, color: shade(lit, .3), alpha },
        ], left, top, left, top + height);
    }
    else {
        surface.fillStyle(lit, alpha).fillRect(left, top, face, height);
    }
    surface.fillStyle(dark, alpha).fillRect(left + face, top, Math.max(0, width - face), height);
    // The edge between the two planes, and the one down the lit side that catches the horizon. Two
    // hairlines are what actually sell a solid as a solid at the size a skyline is read at.
    if (height >= 20) {
        surface.lineStyle(1, shade(dark, .5), .4 * alpha).line(left + face, top, left + face, top + height);
        surface.lineStyle(1, tint(lit, .28), .22 * alpha).line(left + .5, top + 1, left + .5, top + height);
    }
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
    const lightColor = style.lightColor ?? windowColor;
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
    // The scale of the lights a building carries -- a temple's crown, a reactor's core, a monument's
    // ring. Bounded by the *shorter* dimension rather than by the width alone: once a structure's
    // footprint follows its height, a short wide solid has a wide footprint too, and a lamp sized off
    // that width alone became a disc half the building across. This is what keeps a light the size of
    // a light on a landscape phone, where every structure is short and wide.
    const emblem = Math.min(width, height * .5);
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
                // Hotter than the rest of the city, but the same light: the shared colour pushed toward the
                // red end rather than a warm hex of its own.
                const heat = mixColor(lightColor, 0xff5a22, .35);
                surface.fillRadialGlow(stackX + width * .08, top - height * .06, 0, width * .34, [
                    { offset: 0, color: heat, alpha: .22 + lightLevel * .14 },
                    { offset: 1, color: heat, alpha: 0 },
                ]);
                surface.fillStyle(0x8f9aa6, .08 * detail).fillCircle(stackX + width * .08 + width * .12, top - height * .18, width * .3);
            }
            surface.fillStyle(mixColor(lightColor, 0xff5a22, .28), (.16 + lightLevel * .2) * detail).fillRect(left + width * .1, groundY - bodyHeight * .3, width * .5, bodyHeight * .1);
            break;
        }
        case 'temple': {
            // Clean geometry crowned with accent light: the only kind whose crown leaves the silhouette.
            const bodyHeight = height * .7;
            solid(surface, left, groundY - bodyHeight, width, bodyHeight, mixColor(litColor, accent, .22), mixColor(darkColor, accent, .1), roofColor, laneAlphaShift, true);
            surface.fillStyle(mixColor(baseColor, accent, .5), laneAlphaShift).fillRect(left + width * .16, top, width * .68, height * .3);
            // Tight enough to read as a lit crown on the building. A wide one turned every temple in the
            // world into a pale disc behind the skyline that read as a second moon.
            surface.fillRadialGlow(structure.x, top - emblem * .1, 0, emblem * .34, [
                { offset: 0, color: accent, alpha: .2 + lightLevel * .14 },
                { offset: .4, color: accent, alpha: .06 },
                { offset: 1, color: accent, alpha: 0 },
            ]);
            surface.fillStyle(accent, .42).fillCircle(structure.x, top - emblem * .1, emblem * .15);
            surface.lineStyle(1.5, accent, .5).line(structure.x, top - emblem * .4, structure.x, top - emblem * .1);
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
            const coreY = groundY - bodyHeight - emblem * .18;
            solid(surface, left, groundY - bodyHeight, width, bodyHeight, litColor, darkColor, roofColor, laneAlphaShift, true);
            // The core sits *on* its containment block rather than floating above it, and it is a piece of
            // machinery with a lit centre -- not a disc bright enough to read as a second moon.
            surface.fillRadialGlow(structure.x, coreY, 0, emblem * (.7 + lightLevel * .25), [
                { offset: 0, color: accent, alpha: .32 + lightLevel * .14 },
                { offset: .4, color: accent, alpha: .12 },
                { offset: 1, color: accent, alpha: 0 },
            ]);
            surface.fillStyle(mixColor(darkColor, accent, .45), .95).fillCircle(structure.x, coreY, emblem * .3);
            surface.fillStyle(tint(accent, .35), .72).fillCircle(structure.x, coreY, emblem * .15);
            surface.lineStyle(2, accent, .5).strokeCircle(structure.x, coreY, emblem * .38);
            surface.lineStyle(1, accent, .3).strokeCircle(structure.x, coreY, emblem * .52);
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
            // Pad floods: the city's own light with a touch of the path's accent in it, never a yellow of
            // its own -- a spaceport lit differently from the street below it reads as a separate world.
            const pad = mixColor(lightColor, accent, .3);
            surface.fillRadialGlow(structure.x, groundY - apron * .4, 0, emblem * .9, [
                { offset: 0, color: pad, alpha: .3 + lightLevel * .22 },
                { offset: 1, color: pad, alpha: 0 },
            ]);
            break;
        }
        case 'orbital_anchor': {
            // A dramatic vertical, and the emphasis is on *vertical*: the tether leaves the frame, the
            // rings hold it and the buttressed foot carries it. A constant-width shaft made the drama out
            // of a 12 px hairline running the height of the frame -- it read as a scratch on the glass, not
            // as the thing a civilization built to reach orbit. The taper is what gives it a base.
            const anchorTop = top - height * .34;
            const footHalf = width * .3;
            const tipHalf = width * .12;
            // The mass stays the city's own material; only the bands, the rings and the tether light
            // carry the accent. At a .4 mix the shaft was the palest thing in the frame and a phone-sized
            // viewport became one bright wedge with a city behind it.
            const shaftColor = mixColor(baseColor, accent, .16);
            const taper = (y) => footHalf + (tipHalf - footHalf) * Math.max(0, Math.min(1, (groundY - y) / Math.max(1, groundY - anchorTop)));
            // Lit and shadowed plane of the same tapering solid, split on the world's one light direction.
            const split = (half) => half * (SIDE_SPLIT * 2 - 1);
            surface.fillStyle(shaftColor, laneAlphaShift).fillPoly([
                [structure.x - footHalf, groundY], [structure.x - tipHalf, anchorTop],
                [structure.x + split(tipHalf), anchorTop], [structure.x + split(footHalf), groundY],
            ]);
            surface.fillStyle(shade(shaftColor, .45), laneAlphaShift).fillPoly([
                [structure.x + split(footHalf), groundY], [structure.x + split(tipHalf), anchorTop],
                [structure.x + tipHalf, anchorTop], [structure.x + footHalf, groundY],
            ]);
            // The buttresses the foot stands on, so the tether meets the ground instead of ending at it.
            for (const side of [-1, 1]) {
                surface.fillStyle(shade(shaftColor, .58), laneAlphaShift)
                    .fillTriangle(structure.x + side * footHalf, groundY, structure.x + side * footHalf, groundY - height * .16, structure.x + side * width * .62, groundY);
            }
            surface.lineStyle(1.2, accent, .45).line(structure.x, top - height * .52, structure.x, groundY);
            // Segment bands up the tether, each one as wide as the shaft is there.
            for (let band = 0; band < 5; band++) {
                const y = anchorTop + band * height * .27;
                const half = taper(y);
                surface.fillStyle(shade(shaftColor, .3), .8).fillRect(structure.x - half, y, half * 2, 2);
            }
            for (let ring = 0; ring < 3; ring++)
                surface.lineStyle(1, accent, .2).strokeCircle(structure.x, top - height * .06 + ring * height * .3, width * (.5 - ring * .12));
            surface.fillRadialGlow(structure.x, top - height * .06, 0, emblem * .8, [
                { offset: 0, color: accent, alpha: .12 + lightLevel * .1 },
                { offset: 1, color: accent, alpha: 0 },
            ]);
            break;
        }
        case 'monument': {
            // An obelisk on a stepped plinth, not a needle. Drawn as a full-height triangle a monument was
            // the most repeated shape in a stage-4 world -- a row of identical spikes standing between the
            // towers -- so it is built the way a monument is: a base wide enough to read as masonry, a
            // shaft that tapers only slightly, and a lit cap where the silhouette ends.
            const capY = top + height * .16;
            const shaftFoot = width * .42;
            const shaftHead = width * .29;
            const stone = mixColor(litColor, accent, .16);
            surface.fillStyle(stone, laneAlphaShift).fillPoly([
                [structure.x - shaftFoot, groundY - height * .07], [structure.x - shaftHead, capY],
                [structure.x, capY], [structure.x, groundY - height * .07],
            ]);
            surface.fillStyle(shade(mixColor(baseColor, accent, .16), .4), laneAlphaShift).fillPoly([
                [structure.x, groundY - height * .07], [structure.x, capY],
                [structure.x + shaftHead, capY], [structure.x + shaftFoot, groundY - height * .07],
            ]);
            // The pyramidion, and the plinth the whole thing stands on.
            surface.fillStyle(tint(stone, .18), laneAlphaShift).fillTriangle(structure.x - shaftHead, capY, structure.x, top, structure.x + shaftHead, capY);
            surface.fillStyle(shade(baseColor, .5), laneAlphaShift).fillRect(left + width * .1, groundY - height * .09, width * .8, height * .09);
            surface.fillStyle(shade(baseColor, .34), laneAlphaShift).fillRect(left + width * .22, groundY - height * .13, width * .56, height * .045);
            surface.lineStyle(1.4, accent, .45).strokeCircle(structure.x, top - emblem * .22, emblem * .18);
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
    // The dominant path's own way of ending a building. Restricted to the tall civic and residential
    // solids -- the ones that make the skyline -- so the signature reads as the city's architecture
    // rather than as a decoration stamped on every shed in the outskirts. Height and use decide that;
    // the lane decides only how strongly it is drawn.
    if (style.crown && height >= CROWN_MIN_HEIGHT && (structure.kind === 'dwelling' || structure.kind === 'academy')) {
        drawCrown(surface, style.crown, structure.x, top, width, height, accent, baseColor, lightLevel, detail);
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