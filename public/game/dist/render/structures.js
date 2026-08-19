import { hash01, mixColor } from './primitives.js';
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
export function drawStructure(surface, structure, groundY, bodyColor, accent, windowColor, seed) {
    const left = structure.x - structure.width / 2;
    const top = groundY - structure.height;
    const width = structure.width;
    const height = structure.height;
    switch (structure.kind) {
        case 'farm':
            surface.fillStyle(mixColor(bodyColor, 0x6d8a45, .6), .95).fillRect(left, groundY - height * .34, width, height * .34);
            surface.fillStyle(mixColor(bodyColor, 0x2f3a1c, .55), .95).fillTriangle(left - width * .12, groundY - height * .34, structure.x, groundY - height * .62, left + width * 1.12, groundY - height * .34);
            for (let row = 0; row < 4; row++)
                surface.lineStyle(1, mixColor(accent, 0x8ee66b, .7), .28).line(left - width * .3, groundY + 3 + row * 4, left + width * 1.3, groundY + 3 + row * 4);
            break;
        case 'industry':
            surface.fillStyle(mixColor(bodyColor, 0x000000, .25), .97).fillRect(left, groundY - height * .58, width, height * .58);
            for (let stack = 0; stack < 2; stack++) {
                const stackX = left + width * (.24 + stack * .46);
                surface.fillStyle(mixColor(bodyColor, 0x000000, .45), .97).fillRect(stackX, top, width * .16, height);
                surface.fillStyle(0x8f9aa6, .16).fillCircle(stackX + width * .08, top - height * .1, width * .22);
            }
            break;
        case 'temple':
            surface.fillStyle(mixColor(bodyColor, accent, .3), .97).fillRect(left, groundY - height * .72, width, height * .72);
            surface.fillStyle(mixColor(bodyColor, accent, .55), .95).fillRect(left + width * .16, top, width * .68, height * .3);
            surface.fillStyle(accent, .34).fillCircle(structure.x, top - width * .1, width * .3);
            surface.lineStyle(1.5, accent, .5).line(structure.x, top - width * .4, structure.x, top - width * .1);
            break;
        case 'academy':
            surface.fillStyle(mixColor(bodyColor, accent, .18), .97).fillRect(left, top, width, height);
            surface.lineStyle(1, accent, .42).strokeRect(left + width * .12, top + height * .12, width * .76, height * .5);
            for (let column = 0; column < 3; column++)
                surface.lineStyle(1.4, accent, .34).line(left + width * (.2 + column * .3), groundY - height * .3, left + width * (.2 + column * .3), groundY);
            break;
        case 'reactor':
            surface.fillStyle(mixColor(bodyColor, 0x000000, .18), .97).fillRect(left, groundY - height * .5, width, height * .5);
            surface.fillStyle(mixColor(bodyColor, accent, .4), .9).fillCircle(structure.x, groundY - height * .62, width * .46);
            surface.lineStyle(2, accent, .5).strokeCircle(structure.x, groundY - height * .62, width * .62);
            break;
        case 'spaceport':
            surface.fillStyle(mixColor(bodyColor, 0x000000, .3), .97).fillRect(left, groundY - height * .22, width * 1.3, height * .22);
            surface.lineStyle(2, accent, .55).line(structure.x, groundY - height * .22, structure.x, top);
            surface.lineStyle(1.4, accent, .4).line(left, groundY - height * .22, structure.x, top - height * .1);
            surface.lineStyle(1.4, accent, .4).line(left + width * 1.3, groundY - height * .22, structure.x, top - height * .1);
            surface.fillStyle(accent, .28).fillTriangle(structure.x - width * .18, top, structure.x, top - height * .3, structure.x + width * .18, top);
            break;
        case 'orbital_anchor':
            surface.fillStyle(mixColor(bodyColor, accent, .45), .95).fillRect(structure.x - width * .16, top - height * .6, width * .32, height * 1.6);
            surface.lineStyle(1.2, accent, .5).line(structure.x, top - height * .9, structure.x, groundY);
            for (let ring = 0; ring < 3; ring++)
                surface.lineStyle(1, accent, .3).strokeCircle(structure.x, top - height * .1 + ring * height * .34, width * (.7 - ring * .16));
            break;
        case 'monument':
            surface.fillStyle(mixColor(bodyColor, accent, .5), .96).fillTriangle(left + width * .1, groundY, structure.x, top - height * .25, left + width * .9, groundY);
            surface.lineStyle(1.4, accent, .45).strokeCircle(structure.x, top - height * .3, width * .22);
            break;
        default:
            surface.fillStyle(bodyColor, .98).fillRect(left, top, width, height);
            surface.lineStyle(1, accent, .28).strokeRect(left, top, width, height);
            if (structure.level >= 3)
                surface.fillStyle(mixColor(bodyColor, accent, .35), .9).fillRect(left + width * .18, top - height * .12, width * .64, height * .12);
            break;
    }
    const rows = Math.max(1, Math.min(6, Math.trunc(structure.height / 22)));
    for (let row = 0; row < rows; row++) {
        if (hash01(seed + structure.x + row * 17) < .38)
            continue;
        surface.fillStyle(windowColor, .3 + hash01(seed + row * 31) * .28).fillRect(left + width * .24, top + height * .18 + row * (height * .62 / rows), Math.max(1.5, width * .16), 2.4);
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