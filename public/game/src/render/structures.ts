import type { DrawSurface } from './draw-surface.js';
import { hash01, mixColor, type FactionSigil } from './primitives.js';
import { structureEffectiveGround, type Settlement, type Structure, type StructureKind } from './settlements.js';

export const BANNER_CLEARANCE = 34;
export const BANNER_POLE_MIN = 16;

export function settlementCrown(settlement: Settlement, groundY: number = 0): number {
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
export function bannerGeometry(settlement: Settlement, groundY: number, height: number): { x: number; topY: number; poleHeight: number } {
  const anchorY = groundY - settlementCrown(settlement, groundY);
  const topY = Math.max(height * .04, anchorY - BANNER_CLEARANCE);
  return { x: settlement.centerX, topY, poleHeight: Math.max(BANNER_POLE_MIN, anchorY - topY) };
}

export function structureKindsForEra(era: number, stage: number): StructureKind[] {
  if (stage === 0) return ['dwelling', 'farm'];
  const kinds: StructureKind[] = ['dwelling', 'farm', 'temple', 'monument'];
  if (era >= 1) kinds.push('industry', 'academy');
  if (era >= 2) kinds.push('reactor', 'spaceport');
  if (era >= 3) kinds.push('orbital_anchor');
  return kinds;
}

export function drawStructure(surface: DrawSurface, structure: Structure, baseGroundY: number, bodyColor: number, accent: number, windowColor: number, seed: number): void {
  const lane = structure.depthLane || 'mid';
  const groundY = structureEffectiveGround(baseGroundY, lane);
  const laneColorShift = lane === 'back' ? 0x050b14 : lane === 'front' ? 0x182433 : 0x000000;
  const laneAlphaShift = lane === 'back' ? 0.88 : lane === 'front' ? 1.0 : 0.96;
  const baseColor = mixColor(bodyColor, laneColorShift, lane === 'back' ? 0.35 : 0.15);

  const left = structure.x - structure.width / 2;
  const top = groundY - structure.height;
  const width = structure.width;
  const height = structure.height;

  // Ground base shadow for 2.5D depth
  surface.fillStyle(0x020509, 0.4).fillRect(left - width * 0.1, groundY - 2, width * 1.2, 4);

  switch (structure.kind) {
    case 'farm':
      surface.fillStyle(mixColor(baseColor, 0x6d8a45, .6), laneAlphaShift).fillRect(left, groundY - height * .34, width, height * .34);
      // Dark side plane
      surface.fillStyle(mixColor(baseColor, 0x000000, .4), laneAlphaShift).fillRect(left + width * 0.7, groundY - height * .34, width * 0.3, height * .34);
      surface.fillStyle(mixColor(baseColor, 0x2f3a1c, .55), laneAlphaShift).fillTriangle(left - width * .12, groundY - height * .34, structure.x, groundY - height * .62, left + width * 1.12, groundY - height * .34);
      for (let row = 0; row < 4; row++) surface.lineStyle(1, mixColor(accent, 0x8ee66b, .7), .28).line(left - width * .3, groundY + 3 + row * 4, left + width * 1.3, groundY + 3 + row * 4);
      break;
    case 'industry':
      // Heavy dark main body with side shading
      surface.fillStyle(mixColor(baseColor, 0x000000, .25), laneAlphaShift).fillRect(left, groundY - height * .58, width * 0.72, height * .58);
      surface.fillStyle(mixColor(baseColor, 0x000000, .55), laneAlphaShift).fillRect(left + width * 0.72, groundY - height * .58, width * 0.28, height * .58);
      // Chimneys with warm industrial emissions
      for (let stack = 0; stack < 2; stack++) {
        const stackX = left + width * (.24 + stack * .46);
        surface.fillStyle(mixColor(baseColor, 0x000000, .45), laneAlphaShift).fillRect(stackX, top, width * .16, height);
        surface.fillStyle(0xff7744, .25).fillCircle(stackX + width * .08, top - height * .08, width * .18);
        surface.fillStyle(0x8f9aa6, .18).fillCircle(stackX + width * .08, top - height * .16, width * .26);
      }
      break;
    case 'temple':
      surface.fillStyle(mixColor(baseColor, accent, .3), laneAlphaShift).fillRect(left, groundY - height * .72, width * 0.7, height * .72);
      surface.fillStyle(mixColor(baseColor, 0x000000, .45), laneAlphaShift).fillRect(left + width * 0.7, groundY - height * .72, width * 0.3, height * .72);
      surface.fillStyle(mixColor(baseColor, accent, .55), laneAlphaShift).fillRect(left + width * .16, top, width * .68, height * .3);
      surface.fillStyle(accent, .34).fillCircle(structure.x, top - width * .1, width * .3);
      surface.lineStyle(1.5, accent, .5).line(structure.x, top - width * .4, structure.x, top - width * .1);
      break;
    case 'academy':
      surface.fillStyle(mixColor(baseColor, accent, .18), laneAlphaShift).fillRect(left, top, width * 0.75, height);
      surface.fillStyle(mixColor(baseColor, 0x000000, .4), laneAlphaShift).fillRect(left + width * 0.75, top, width * 0.25, height);
      surface.lineStyle(1, accent, .42).strokeRect(left + width * .12, top + height * .12, width * .76, height * .5);
      for (let column = 0; column < 3; column++) surface.lineStyle(1.4, accent, .34).line(left + width * (.2 + column * .3), groundY - height * .3, left + width * (.2 + column * .3), groundY);
      break;
    case 'reactor':
      surface.fillStyle(mixColor(baseColor, 0x000000, .18), laneAlphaShift).fillRect(left, groundY - height * .5, width, height * .5);
      // Localized core glow
      surface.fillRadialGlow(structure.x, groundY - height * .62, 0, width * .75, [
        { offset: 0, color: accent, alpha: 0.5 },
        { offset: 0.5, color: accent, alpha: 0.2 },
        { offset: 1, color: accent, alpha: 0 }
      ]);
      surface.fillStyle(mixColor(baseColor, accent, .4), .9).fillCircle(structure.x, groundY - height * .62, width * .46);
      surface.lineStyle(2, accent, .6).strokeCircle(structure.x, groundY - height * .62, width * .62);
      break;
    case 'spaceport':
      surface.fillStyle(mixColor(baseColor, 0x000000, .3), laneAlphaShift).fillRect(left, groundY - height * .22, width * 1.3, height * .22);
      surface.lineStyle(2, accent, .55).line(structure.x, groundY - height * .22, structure.x, top);
      surface.lineStyle(1.4, accent, .4).line(left, groundY - height * .22, structure.x, top - height * .1);
      surface.lineStyle(1.4, accent, .4).line(left + width * 1.3, groundY - height * .22, structure.x, top - height * .1);
      surface.fillStyle(accent, .28).fillTriangle(structure.x - width * .18, top, structure.x, top - height * .3, structure.x + width * .18, top);
      // Launch pad illumination
      surface.fillStyle(0xffd9a0, .35).fillCircle(structure.x, groundY - height * .22, width * 0.25);
      break;
    case 'orbital_anchor':
      surface.fillStyle(mixColor(baseColor, accent, .45), laneAlphaShift).fillRect(structure.x - width * .16, top - height * .6, width * .32, height * 1.6);
      surface.lineStyle(1.2, accent, .5).line(structure.x, top - height * .9, structure.x, groundY);
      for (let ring = 0; ring < 3; ring++) surface.lineStyle(1, accent, .3).strokeCircle(structure.x, top - height * .1 + ring * height * .34, width * (.7 - ring * .16));
      break;
    case 'monument':
      surface.fillStyle(mixColor(baseColor, accent, .5), laneAlphaShift).fillTriangle(left + width * .1, groundY, structure.x, top - height * .25, left + width * .9, groundY);
      surface.lineStyle(1.4, accent, .45).strokeCircle(structure.x, top - height * .3, width * .22);
      break;
    default:
      // Darker side plane for 2.5D building facade
      surface.fillStyle(baseColor, laneAlphaShift).fillRect(left, top, width * 0.7, height);
      surface.fillStyle(mixColor(baseColor, 0x000000, 0.4), laneAlphaShift).fillRect(left + width * 0.7, top, width * 0.3, height);

      // Roof edge highlight
      surface.lineStyle(1, mixColor(accent, 0xffffff, 0.4), 0.45).line(left, top, left + width, top);
      surface.lineStyle(1, accent, .28).strokeRect(left, top, width, height);
      if (structure.level >= 3) surface.fillStyle(mixColor(baseColor, accent, .35), .9).fillRect(left + width * .18, top - height * .12, width * .64, height * .12);
      break;
  }

  const rows = Math.max(1, Math.min(6, Math.trunc(structure.height / 22)));
  for (let row = 0; row < rows; row++) {
    if (hash01(seed + structure.x + row * 17) < .38) continue;
    surface.fillStyle(windowColor, .3 + hash01(seed + row * 31) * .28).fillRect(left + width * .24, top + height * .18 + row * (height * .62 / rows), Math.max(1.5, width * .16), 2.4);
  }
}

const SIGIL_DRAW: Record<FactionSigil, (surface: DrawSurface, x: number, y: number, size: number, color: number) => void> = {
  spire: (s, x, y, size, color) => { s.fillStyle(color, .85).fillTriangle(x - size * .3, y + size * .4, x, y - size * .5, x + size * .3, y + size * .4); },
  node: (s, x, y, size, color) => { s.fillStyle(color, .85).fillCircle(x, y, size * .3); s.lineStyle(1, color, .7).line(x - size * .5, y, x + size * .5, y); },
  ring: (s, x, y, size, color) => { s.lineStyle(1.6, color, .85).strokeCircle(x, y, size * .42); },
  prism: (s, x, y, size, color) => { s.lineStyle(1.4, color, .85).line(x - size * .4, y + size * .35, x, y - size * .45).line(x, y - size * .45, x + size * .4, y + size * .35).line(x + size * .4, y + size * .35, x - size * .4, y + size * .35); },
  spiral: (s, x, y, size, color) => { for (let i = 0; i < 3; i++) s.lineStyle(1, color, .8 - i * .18).strokeCircle(x, y, size * (.16 + i * .14)); },
  chevron: (s, x, y, size, color) => { s.lineStyle(1.6, color, .85).line(x - size * .4, y + size * .2, x, y - size * .3).line(x, y - size * .3, x + size * .4, y + size * .2); },
  grid: (s, x, y, size, color) => { s.lineStyle(1, color, .8).line(x - size * .4, y - size * .12, x + size * .4, y - size * .12).line(x - size * .4, y + size * .18, x + size * .4, y + size * .18).line(x, y - size * .4, x, y + size * .4); },
  halo: (s, x, y, size, color) => { s.lineStyle(1.4, color, .85).strokeCircle(x, y - size * .1, size * .34); s.fillStyle(color, .3).fillCircle(x, y + size * .28, size * .16); },
  void: (s, x, y, size, color) => { s.fillStyle(color, .22).fillCircle(x, y, size * .46); s.lineStyle(1.4, color, .85).strokeCircle(x, y, size * .2); },
  nest: (s, x, y, size, color) => { for (let i = 0; i < 4; i++) s.fillStyle(color, .7 - i * .12).fillCircle(x + (i % 2 ? size * .22 : -size * .22), y + (i < 2 ? -size * .16 : size * .16), size * .15); },
};

export function drawBanner(surface: DrawSurface, x: number, topY: number, poleHeight: number, color: number, sigil: FactionSigil, wave: number): void {
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
