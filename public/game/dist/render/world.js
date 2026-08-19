import { CivilizationPaths } from '../game/paths.js';
import { developmentStage, worldSnapshot } from './world-model.js';
import { decisionImpulseKind, entropyThresholdColor, structuralWorldKey, worldPresentation } from './world-presentation.js';
const DYNAMIC_FRAME_MS = 33;
const devicePixelRatio = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
function hash01(n) {
    const value = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
}
function buildingLayout(civ, worldWidth, height, count, stage) {
    const scale = [.24, .46, .7, .96, 1.28][stage] ?? .24;
    const buildings = [];
    for (let i = 0; i < count; i++) {
        const x = worldWidth * .04 + hash01(civ.seed * 31 + i * 17 + 91) * worldWidth * .92;
        const level = stage === 0
            ? (hash01(civ.seed * 37 + i * 7) < .82 ? 0 : 1)
            : Math.min(6, Math.max(1, stage - 1 + Math.trunc(civ.development / 180) + civ.era + Math.trunc(hash01(civ.seed * 13 + i * 19) * 1.6)));
        const width = (14 + hash01(civ.seed * 17 + i * 29) * 30 + level * 3) * (stage === 0 ? .7 : 1 + stage * .08);
        const buildingHeight = Math.max(18, Math.min(height * .64, (26 + hash01(civ.seed * 53 + i * 13) * 120 + level * 22) * scale));
        buildings.push({ x, width, height: buildingHeight, kind: i % 5 });
    }
    return buildings.sort((a, b) => a.x - b.x);
}
function drawSky(layer, civ, worldWidth, height, presentation, particleCount) {
    layer.clear();
    layer.fillStyle(presentation.colors.skyTop, 1).fillRect(0, 0, worldWidth, height * .48);
    layer.fillStyle(presentation.colors.skyBottom, 1).fillRect(0, height * .48, worldWidth, height * .52);
    for (let band = 0; band < 5; band++) {
        layer.fillStyle(presentation.colors.haze, .025 + presentation.attention * .018)
            .fillRect(0, height * (.24 + band * .085), worldWidth, height * .08);
    }
    for (let i = 0; i < particleCount; i++) {
        const x = hash01(civ.seed + i * 17) * worldWidth;
        const y = hash01(civ.seed + i * 31) * height * .58;
        const alpha = .18 + hash01(i * 41) * (.38 + presentation.awareness * .22);
        layer.fillStyle(i % 9 === 0 ? presentation.accent : 0xc9e1ff, alpha)
            .fillCircle(x, y, .55 + hash01(i * 7) * 1.7);
    }
    if (civ.stats.attention >= 60) {
        const observerX = worldWidth * (.72 + hash01(civ.seed) * .12);
        layer.fillStyle(presentation.accent, .035 + presentation.attention * .05).fillCircle(observerX, height * .18, 78);
        layer.lineStyle(1.5, presentation.accent, .12 + presentation.attention * .16).strokeCircle(observerX, height * .18, 42);
    }
}
function drawTerrain(layer, civ, worldWidth, height, presentation) {
    layer.clear();
    const horizon = height * .69;
    for (let i = 0; i < Math.ceil(worldWidth / 160) + 1; i++) {
        const x = i * 160 - 80;
        const peak = horizon - 60 - hash01(civ.seed * 3 + i * 29) * 100;
        layer.fillStyle(presentation.colors.farTerrain, .82)
            .fillTriangle(x, horizon, x + 110, peak, x + 230, horizon);
    }
    layer.fillStyle(presentation.colors.nearTerrain, .82).fillRect(0, horizon, worldWidth, height - horizon);
}
function drawSettlement(layer, civ, worldWidth, height, buildings, presentation) {
    layer.clear();
    const stage = developmentStage(civ);
    const ground = height * .72;
    layer.fillStyle(presentation.colors.nearTerrain, 1).fillRect(0, ground, worldWidth, height - ground);
    layer.fillStyle(stage === 0 ? 0x493821 : 0x11191f, .98).fillRect(0, ground + 4, worldWidth, stage === 0 ? 11 : 23);
    if (stage > 0) {
        for (let i = 0; i < Math.ceil(worldWidth / 42); i++) {
            layer.fillStyle(presentation.colors.window, .18).fillRect(i * 42 + 10, ground + 13, 18, 2);
        }
        if (stage >= 2)
            layer.lineStyle(2, presentation.accent, .24).lineBetween(0, ground - 9, worldWidth, ground - 9);
        if (stage >= 4)
            layer.lineStyle(2, presentation.accent, .4).lineBetween(0, ground - 18, worldWidth, ground - 18);
    }
    for (const building of buildings) {
        const left = building.x - building.width / 2;
        const top = ground - building.height;
        if (stage === 0) {
            layer.fillStyle(0x765c39, .96).fillTriangle(left, ground, building.x, top, left + building.width, ground);
            if (building.kind % 2 === 0)
                layer.fillStyle(0x56422c, .95).fillRect(left + building.width * .58, ground - building.height * .36, building.width * .28, building.height * .36);
            layer.fillStyle(0x26180f, 1).fillRect(left + building.width * .44, ground - Math.max(7, building.height * .28), Math.max(4, building.width * .12), Math.max(7, building.height * .28));
            continue;
        }
        layer.fillStyle(presentation.colors.settlement, .98).fillRect(left, top, building.width, building.height);
        layer.lineStyle(1, presentation.accent, .28 + presentation.awareness * .12).strokeRect(left, top, building.width, building.height);
        if (stage >= 2 && hash01(building.x + civ.seed) > .55) {
            layer.lineStyle(2, presentation.accent, .58).lineBetween(building.x, top, building.x, top - Math.max(8, building.height * .12));
        }
        if (stage >= 3 && hash01(building.x * 2 + civ.seed) > .6) {
            layer.fillStyle(presentation.accent, .1).fillCircle(building.x, top, Math.max(8, building.width * .38));
        }
        if (stage >= 4) {
            layer.lineStyle(2, presentation.accent, .23).beginPath().arc(building.x, top + 5, Math.max(10, building.width * .6), Math.PI, Math.PI * 2).strokePath();
        }
    }
}
function drawPathMotif(layer, civ, worldWidth, height, ground, time, accent) {
    const path = CivilizationPaths.ensure(civ).dominantPath;
    if (!path)
        return;
    switch (path) {
        case 'machine_faith':
            for (let i = 0; i < 8; i++) {
                const x = worldWidth * (.08 + i * .12);
                layer.lineStyle(2, accent, .32).lineBetween(x, ground - 35, x, ground - 90 - (i % 3) * 18);
                layer.fillStyle(accent, .42).fillCircle(x, ground - 95 - (i % 3) * 18, 4);
            }
            break;
        case 'collective_mind': {
            const points = Array.from({ length: 12 }, (_, i) => ({ x: worldWidth * (.05 + hash01(civ.seed + i) * .9), y: ground - 40 - hash01(i * 17) * 100 }));
            layer.lineStyle(1, accent, .22);
            for (let i = 1; i < points.length; i++)
                layer.lineBetween(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
            for (const point of points)
                layer.fillStyle(accent, .5).fillCircle(point.x, point.y, 3);
            break;
        }
        case 'temporal_dominion':
            for (let i = 0; i < 7; i++) {
                const x = worldWidth * (.1 + i * .13);
                const y = height * .22 + (i % 2) * 30;
                layer.lineStyle(2, accent, .3).strokeCircle(x, y, 12 + i * 2);
                layer.lineStyle(1, accent, .45).lineBetween(x, y, x + Math.cos(time * .001 + i) * 10, y + Math.sin(time * .001 + i) * 10);
            }
            break;
        case 'reality_engineering':
            for (let i = 0; i < 9; i++) {
                const x = worldWidth * (.08 + i * .105);
                const y = ground - 50 - (i % 3) * 35;
                layer.lineStyle(2, accent, .3).strokeTriangle(x - 12, y + 12, x, y - 12, x + 12, y + 12);
            }
            break;
        case 'biological_transcendence':
            for (let i = 0; i < 18; i++)
                layer.fillStyle(accent, .14).fillCircle(worldWidth * hash01(civ.seed + i * 13), ground - 10 - hash01(i * 29) * 80, 8 + hash01(i) * 14);
            break;
        case 'cosmic_resistance':
            for (let i = 0; i < 12; i++) {
                const x = worldWidth * (.03 + i * .085);
                layer.fillStyle(accent, .38).fillTriangle(x, ground - 48, x + 16, ground - 43, x, ground - 36);
                layer.lineStyle(1, 0xe5e5e5, .35).lineBetween(x, ground - 48, x, ground - 26);
            }
            break;
        case 'bureaucratic_singularity':
            for (let i = 0; i < 10; i++) {
                const x = worldWidth * (.06 + i * .095);
                const y = ground - 70 - (i % 2) * 28;
                layer.lineStyle(1, accent, .25).strokeRect(x, y, 28, 20);
                layer.lineStyle(1, accent, .18).lineBetween(x + 4, y + 6, x + 23, y + 6);
            }
            break;
        case 'post_mortal_civilization':
            for (let i = 0; i < 9; i++) {
                const x = worldWidth * (.07 + i * .11);
                const y = ground - 55 - (i % 3) * 20;
                layer.fillStyle(accent, .11).fillCircle(x, y, 11);
                layer.lineStyle(1, accent, .34).strokeCircle(x, y, 7);
            }
            break;
        case 'void_communion':
            for (let i = 0; i < 7; i++) {
                const x = worldWidth * (.1 + i * .13);
                const y = height * .18 + (i % 3) * 24;
                layer.fillStyle(accent, .12).fillCircle(x, y, 26 + Math.sin(time * .001 + i) * 3);
                layer.lineStyle(2, accent, .28).strokeCircle(x, y, 9);
            }
            break;
        case 'recursive_simulation':
            for (let i = 0; i < 8; i++) {
                const x = worldWidth * (.07 + i * .115);
                const y = ground - 75 - (i % 2) * 35;
                for (let ring = 0; ring < 3; ring++)
                    layer.lineStyle(1, accent, .18 + .06 * ring).strokeRect(x - ring * 5, y - ring * 5, 22 + ring * 10, 14 + ring * 10);
            }
            break;
    }
}
function drawAtmosphere(layer, civ, width, height, time, snapshot, presentation, buildings) {
    layer.clear();
    const animationTime = reducedMotion ? 0 : time;
    const worldWidth = snapshot.worldWidth;
    const ground = height * .72;
    for (let i = 0; i < snapshot.hazeBands; i++) {
        const drift = (animationTime * (.002 + i * .00035)) % (width * .6);
        const y = height * (.28 + i * .07) + Math.sin(animationTime * .0005 + i) * (reducedMotion ? 0 : 4);
        layer.fillStyle(presentation.colors.haze, .02 + presentation.sanityDistortion * .025).fillRect(drift - width * .3, y, worldWidth * .34, 22 + i * 4);
    }
    for (let i = 0; i < Math.min(buildings.length, 46); i++) {
        const building = buildings[i];
        if (snapshot.stage === 0 || hash01(civ.seed + i * 73 + Math.trunc(animationTime / 850)) < .42)
            continue;
        const rows = Math.max(2, Math.min(10, Math.trunc(building.height / 18)));
        const row = i % rows;
        layer.fillStyle(presentation.colors.window, .45 + hash01(i * 9) * .32)
            .fillRect(building.x - building.width * .28 + (i % 3) * 5, ground - building.height + 8 + row * 13, 2.5 + snapshot.stage * .28, 3);
    }
    if (snapshot.stage >= 2) {
        for (let i = 0; i < snapshot.trafficCount; i++) {
            const progress = (hash01(civ.seed + i * 47) + animationTime * .00002 * (.5 + hash01(i * 13))) % 1;
            layer.fillStyle(i % 2 ? presentation.accent : presentation.colors.window, .72).fillRect(progress * worldWidth, ground + 9 + (i % 3) * 5, 5 + snapshot.stage * 1.5, 2.5);
        }
    }
    for (let i = 0; i < snapshot.aircraftCount; i++) {
        const progress = (hash01(civ.seed + i * 71) + animationTime * .000008 * (.7 + hash01(i * 5))) % 1;
        const x = progress * worldWidth;
        const y = height * (.18 + hash01(i * 23) * .22);
        layer.lineStyle(1.5, presentation.accent, .62).lineBetween(x - 10, y, x + 10, y);
        layer.fillStyle(0xffffff, .82).fillCircle(x, y, 1.5);
    }
    for (let i = 0; i < snapshot.satelliteCount; i++) {
        const x = ((hash01(civ.seed + i * 101) + animationTime * .000003 * (i + 1)) % 1) * worldWidth;
        const y = height * (.08 + .1 * hash01(i * 11));
        layer.lineStyle(1, presentation.accent, .44).strokeRect(x - 3, y - 2, 6, 4);
    }
    for (let i = 0; i < snapshot.beaconCount; i++) {
        const x = worldWidth * (.08 + hash01(civ.seed + i * 97) * .84);
        const pulse = reducedMotion ? 1 : .7 + Math.sin(animationTime * .003 + i) * .3;
        layer.lineStyle(1, presentation.accent, .16 + presentation.awareness * .25 * pulse).strokeCircle(x, ground - 55 - (i % 3) * 28, 10 + pulse * 8);
    }
    for (let i = 0; i < snapshot.fractureCount; i++) {
        const x = worldWidth * hash01(civ.seed + i * 61);
        layer.lineStyle(1.4, 0xee6973, .24 + presentation.danger * .42)
            .lineBetween(x, ground + 2, x + (hash01(i * 11) - .5) * 46, ground + 24 + hash01(i * 17) * 34);
    }
    if (presentation.sanityDistortion > .18) {
        for (let i = 0; i < 3; i++) {
            const wobble = reducedMotion ? 0 : Math.sin(animationTime * .0014 + i) * 9 * presentation.sanityDistortion;
            layer.lineStyle(1, 0xb68cff, .08 + presentation.sanityDistortion * .13).strokeCircle(worldWidth * (.22 + i * .29) + wobble, height * (.28 + i * .04), 35 + i * 17);
        }
    }
    drawPathMotif(layer, civ, worldWidth, height, ground, animationTime, presentation.accent);
}
function impulseColor(feedback, kind) {
    if (kind === 'containment')
        return 0x73e6bd;
    if (kind === 'time-streak')
        return 0xf2bd63;
    if (kind === 'scan')
        return 0x6bdcf6;
    if (kind === 'fracture')
        return entropyThresholdColor(feedback.eventId);
    return feedback.tone === 'positive' ? 0x73e6bd : feedback.tone === 'negative' ? 0xee6973 : 0xb68cff;
}
function drawDecisionImpulse(layer, feedback, startTime, time, width, height) {
    layer.clear();
    if (!feedback || startTime <= 0)
        return;
    const kind = decisionImpulseKind(feedback.eventId);
    const color = impulseColor(feedback, kind);
    if (reducedMotion) {
        if (time - startTime >= 1400)
            return;
        const radius = Math.min(width, height) * .2;
        if (kind === 'time-streak')
            for (let i = 0; i < 4; i++)
                layer.lineStyle(2, color, .42).lineBetween(width * .18, height * (.38 + i * .1), width * .82, height * (.38 + i * .1));
        else if (kind === 'scan') {
            layer.lineStyle(2, color, .48).lineBetween(width * .16, height * .5, width * .84, height * .5);
            layer.lineStyle(1, color, .4).strokeCircle(width * .5, height * .5, radius);
        }
        else if (kind === 'fracture')
            for (let i = 0; i < 6; i++)
                layer.lineStyle(2, color, .44).lineBetween(width * (.3 + i * .07), height * .3, width * (.34 + i * .06), height * .72);
        else {
            layer.lineStyle(kind === 'containment' ? 4 : 2, color, .48).strokeCircle(width * .5, height * .54, radius);
            layer.fillStyle(color, .06).fillCircle(width * .5, height * .54, radius * .72);
        }
        return;
    }
    const progress = Math.min(1, Math.max(0, (time - startTime) / 1800));
    if (progress >= 1)
        return;
    const alpha = (1 - progress) * .62;
    const radius = 34 + progress * Math.min(width, height) * .56;
    if (kind === 'containment') {
        for (let ring = 0; ring < 3; ring++)
            layer.lineStyle(4 - ring, color, alpha * (1 - ring * .18)).strokeCircle(width * .5, height * .54, radius * (.58 + ring * .2));
        layer.fillStyle(color, alpha * .08).fillCircle(width * .5, height * .54, radius * .5);
    }
    else if (kind === 'time-streak') {
        for (let i = 0; i < 9; i++) {
            const y = height * (.2 + i * .075);
            const inset = ((i % 3) * 36 + progress * width * .18) % Math.max(1, width * .28);
            layer.lineStyle(1.2 + (i % 2), color, alpha * (.45 + (i % 3) * .15)).lineBetween(-width * .08 + inset, y, width * (.7 + progress * .35) + inset, y);
        }
    }
    else if (kind === 'scan') {
        const y = height * (.16 + progress * .68);
        layer.lineStyle(2, color, alpha).lineBetween(width * .12, y, width * .88, y);
        layer.lineStyle(1, color, alpha * .75).strokeCircle(width * .5, height * .52, radius * .48);
        layer.lineBetween(width * .5 - radius * .62, height * .52, width * .5 + radius * .62, height * .52);
        layer.lineBetween(width * .5, height * .52 - radius * .62, width * .5, height * .52 + radius * .62);
    }
    else if (kind === 'fracture') {
        for (let i = 0; i < 10; i++) {
            const x = width * (.16 + i * .075);
            const bend = (hash01(i * 31 + feedback.sequence) - .5) * width * .08;
            layer.lineStyle(1.2 + (i % 3), color, alpha).lineBetween(x, height * .18, x + bend, height * (.42 + progress * .2));
            layer.lineBetween(x + bend, height * (.42 + progress * .2), x - bend * .35, height * .84);
        }
    }
    else {
        layer.lineStyle(3 - progress * 2, color, alpha).strokeCircle(width * .5, height * .54, radius);
        layer.lineStyle(1, 0xffffff, alpha * .5).strokeCircle(width * .5, height * .54, radius * .72);
        layer.fillStyle(color, alpha * .07).fillCircle(width * .5, height * .54, radius * .45);
    }
}
function drawCanvasDecisionImpulse(context, feedback, startTime, time, width, height, toColor) {
    const age = time - startTime;
    if (age < 0)
        return;
    const duration = reducedMotion ? 1400 : 1800;
    if (age >= duration)
        return;
    const kind = decisionImpulseKind(feedback.eventId);
    const color = impulseColor(feedback, kind);
    const progress = reducedMotion ? 0 : Math.min(1, age / 1800);
    const alpha = reducedMotion ? .48 : (1 - progress) * .62;
    const radius = (reducedMotion ? .2 : .12 + progress * .48) * Math.min(width, height);
    context.save();
    context.strokeStyle = toColor(color, alpha);
    context.fillStyle = toColor(color, alpha * .08);
    context.lineWidth = reducedMotion ? 2 : Math.max(1, 3 - progress * 2);
    if (kind === 'time-streak') {
        for (let i = 0; i < 8; i++) {
            const y = height * (.2 + i * .08);
            context.beginPath();
            context.moveTo(width * (reducedMotion ? .18 : -.08 + progress * .18), y);
            context.lineTo(width * (reducedMotion ? .82 : .72 + progress * .3), y);
            context.stroke();
        }
    }
    else if (kind === 'scan') {
        const y = reducedMotion ? height * .5 : height * (.16 + progress * .68);
        context.beginPath();
        context.moveTo(width * .12, y);
        context.lineTo(width * .88, y);
        context.stroke();
        context.beginPath();
        context.arc(width * .5, height * .52, radius * .55, 0, Math.PI * 2);
        context.stroke();
    }
    else if (kind === 'fracture') {
        for (let i = 0; i < 9; i++) {
            const x = width * (.16 + i * .08);
            const bend = (hash01(i * 31 + feedback.sequence) - .5) * width * .08;
            context.beginPath();
            context.moveTo(x, height * .18);
            context.lineTo(x + bend, height * .5);
            context.lineTo(x - bend * .35, height * .84);
            context.stroke();
        }
    }
    else {
        const rings = kind === 'containment' ? 3 : 1;
        for (let ring = 0; ring < rings; ring++) {
            context.beginPath();
            context.arc(width * .5, height * .54, radius * (.68 + ring * .2), 0, Math.PI * 2);
            context.stroke();
        }
        context.beginPath();
        context.arc(width * .5, height * .54, radius * .45, 0, Math.PI * 2);
        context.fill();
    }
    context.restore();
}
class FallbackWorld {
    constructor(engine, host) {
        this.engine = engine;
        this.host = host;
        this.scroll = 0;
        this.raf = 0;
        this.dragging = false;
        this.lastX = 0;
        this.width = 0;
        this.height = 0;
        this.lastFrame = 0;
        this.lastStructuralKey = '';
        this.lastStaticScroll = Number.NaN;
        this.snapshot = null;
        this.buildings = [];
        this.feedbackSequence = 0;
        this.feedbackStartTime = 0;
        this.loop = (time) => {
            this.raf = requestAnimationFrame(this.loop);
            if (time - this.lastFrame < (reducedMotion ? 180 : DYNAMIC_FRAME_MS))
                return;
            this.lastFrame = time;
            const rect = this.host.getBoundingClientRect();
            const resized = rect.width !== this.width || rect.height !== this.height;
            if (resized) {
                this.width = Math.max(1, rect.width);
                this.height = Math.max(1, rect.height);
                this.resizeCanvas(this.staticCanvas);
                this.resizeCanvas(this.dynamicCanvas);
                this.lastStructuralKey = '';
            }
            const civ = this.engine.state.civilization;
            if (!civ)
                return;
            const snapshot = worldSnapshot(civ, rect.width);
            const presentation = worldPresentation(civ);
            this.scroll = Math.max(0, Math.min(snapshot.worldWidth - rect.width, this.scroll));
            const key = `${structuralWorldKey(civ, this.width)}|${Math.round(this.height / 40)}|${civ.traits.join(',')}`;
            if (key !== this.lastStructuralKey || this.scroll !== this.lastStaticScroll) {
                this.lastStructuralKey = key;
                this.lastStaticScroll = this.scroll;
                this.snapshot = snapshot;
                this.buildings = buildingLayout(civ, snapshot.worldWidth, this.height, snapshot.buildingCount, snapshot.stage);
                this.drawStatic(civ, presentation);
            }
            this.drawDynamic(time, civ, snapshot, presentation);
        };
        this.staticCanvas = document.createElement('canvas');
        this.dynamicCanvas = document.createElement('canvas');
        this.staticCanvas.className = 'fallback-canvas fallback-static';
        this.dynamicCanvas.className = 'fallback-canvas fallback-dynamic';
        this.staticContext = this.staticCanvas.getContext('2d');
        this.dynamicContext = this.dynamicCanvas.getContext('2d');
        host.appendChild(this.staticCanvas);
        host.appendChild(this.dynamicCanvas);
        this.staticCanvas.addEventListener('pointerdown', event => {
            this.dragging = true;
            this.lastX = event.clientX;
            this.staticCanvas.setPointerCapture?.(event.pointerId);
        });
        this.staticCanvas.addEventListener('pointermove', event => {
            if (!this.dragging)
                return;
            this.scroll -= event.clientX - this.lastX;
            this.lastX = event.clientX;
            this.lastStaticScroll = Number.NaN;
        });
        this.staticCanvas.addEventListener('pointerup', () => { this.dragging = false; });
        this.staticCanvas.addEventListener('pointercancel', () => { this.dragging = false; });
        this.loop(0);
    }
    nudge(direction) { this.scroll += direction * Math.max(220, this.width * .65); this.lastStaticScroll = Number.NaN; }
    resizeCanvas(canvas) {
        canvas.width = Math.max(1, Math.round(this.width * devicePixelRatio));
        canvas.height = Math.max(1, Math.round(this.height * devicePixelRatio));
        canvas.style.width = `${this.width}px`;
        canvas.style.height = `${this.height}px`;
    }
    color(value, alpha = 1) {
        const red = value >> 16 & 0xff;
        const green = value >> 8 & 0xff;
        const blue = value & 0xff;
        return `rgba(${red},${green},${blue},${alpha})`;
    }
    drawStatic(civ, presentation) {
        if (!this.snapshot)
            return;
        const context = this.staticContext;
        const snapshot = this.snapshot;
        const worldWidth = snapshot.worldWidth;
        const ground = this.height * .72;
        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        context.clearRect(0, 0, this.width, this.height);
        const sky = context.createLinearGradient(0, 0, 0, this.height);
        sky.addColorStop(0, this.color(presentation.colors.skyTop));
        sky.addColorStop(.7, this.color(presentation.colors.skyBottom));
        sky.addColorStop(1, this.color(presentation.colors.nearTerrain));
        context.fillStyle = sky;
        context.fillRect(0, 0, this.width, this.height);
        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, -this.scroll * .1 * devicePixelRatio, 0);
        for (let i = 0; i < snapshot.particleCount; i++) {
            context.globalAlpha = .2 + hash01(i * 41) * (.35 + presentation.awareness * .2);
            context.fillStyle = i % 9 === 0 ? this.color(presentation.accent) : '#c9e1ff';
            context.beginPath();
            context.arc(hash01(civ.seed + i * 17) * worldWidth, hash01(civ.seed + i * 31) * this.height * .58, .6 + hash01(i * 7) * 1.6, 0, Math.PI * 2);
            context.fill();
        }
        context.globalAlpha = 1;
        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, -this.scroll * .52 * devicePixelRatio, 0);
        context.fillStyle = this.color(presentation.colors.farTerrain, .84);
        for (let i = 0; i < Math.ceil(worldWidth / 160) + 1; i++) {
            const x = i * 160 - 80;
            const peak = ground - 60 - hash01(civ.seed * 3 + i * 29) * 100;
            context.beginPath();
            context.moveTo(x, ground);
            context.lineTo(x + 110, peak);
            context.lineTo(x + 230, ground);
            context.fill();
        }
        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, -this.scroll * devicePixelRatio, 0);
        context.fillStyle = this.color(presentation.colors.nearTerrain);
        context.fillRect(0, ground, worldWidth, this.height - ground);
        context.fillStyle = snapshot.stage === 0 ? '#493821' : '#11191f';
        context.fillRect(0, ground + 4, worldWidth, snapshot.stage === 0 ? 11 : 23);
        for (const building of this.buildings) {
            const left = building.x - building.width / 2;
            const top = ground - building.height;
            if (snapshot.stage === 0) {
                context.fillStyle = '#765c39';
                context.beginPath();
                context.moveTo(left, ground);
                context.lineTo(building.x, top);
                context.lineTo(left + building.width, ground);
                context.fill();
                context.fillStyle = '#26180f';
                context.fillRect(left + building.width * .44, ground - Math.max(7, building.height * .28), Math.max(4, building.width * .12), Math.max(7, building.height * .28));
            }
            else {
                context.fillStyle = this.color(presentation.colors.settlement);
                context.fillRect(left, top, building.width, building.height);
                context.strokeStyle = this.color(presentation.accent, .32 + presentation.awareness * .12);
                context.lineWidth = 1;
                context.strokeRect(left, top, building.width, building.height);
                if (snapshot.stage >= 2 && hash01(building.x + civ.seed) > .55) {
                    context.strokeStyle = this.color(presentation.accent, .58);
                    context.lineWidth = 2;
                    context.beginPath();
                    context.moveTo(building.x, top);
                    context.lineTo(building.x, top - Math.max(8, building.height * .12));
                    context.stroke();
                }
            }
        }
        context.setTransform(1, 0, 0, 1, 0, 0);
    }
    drawFallbackPath(context, civ, presentation, time) {
        const path = CivilizationPaths.ensure(civ).dominantPath;
        if (!path || !this.snapshot)
            return;
        const ground = this.height * .72;
        const worldWidth = this.snapshot.worldWidth;
        context.strokeStyle = this.color(presentation.accent, .38);
        context.fillStyle = this.color(presentation.accent, .2);
        context.lineWidth = 1.5;
        for (let i = 0; i < 10; i++) {
            const x = worldWidth * (.06 + i * .095);
            const y = ground - 44 - i % 3 * 25;
            context.beginPath();
            if (path === 'collective_mind') {
                context.arc(x, y, 3, 0, Math.PI * 2);
                context.fill();
                if (i) {
                    context.moveTo(x - worldWidth * .095, ground - 44 - (i - 1) % 3 * 25);
                    context.lineTo(x, y);
                    context.stroke();
                }
            }
            else if (path === 'temporal_dominion' || path === 'void_communion' || path === 'post_mortal_civilization') {
                const pulse = path === 'void_communion' ? Math.sin(time * .001 + i) * 3 : 0;
                context.arc(x, y, 9 + i % 4 * 3 + pulse, 0, Math.PI * 2);
                context.stroke();
            }
            else if (path === 'reality_engineering' || path === 'biological_transcendence') {
                context.moveTo(x - 11, y + 9);
                context.lineTo(x, y - 11);
                context.lineTo(x + 11, y + 9);
                context.closePath();
                path === 'biological_transcendence' ? context.fill() : context.stroke();
            }
            else {
                context.rect(x - 10, y - 8, 20, 16);
                path === 'cosmic_resistance' ? context.fill() : context.stroke();
            }
        }
    }
    drawDynamic(time, civ, snapshot, presentation) {
        const context = this.dynamicContext;
        const animationTime = reducedMotion ? 0 : time;
        const worldWidth = snapshot.worldWidth;
        const ground = this.height * .72;
        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        context.clearRect(0, 0, this.width, this.height);
        for (let i = 0; i < snapshot.hazeBands; i++) {
            const drift = animationTime * (.002 + i * .00035) % (this.width * .6);
            context.fillStyle = this.color(presentation.colors.haze, .025 + presentation.sanityDistortion * .035);
            context.fillRect(drift - this.width * .3, this.height * (.28 + i * .07), this.width * .55, 22 + i * 4);
        }
        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, -this.scroll * devicePixelRatio, 0);
        for (let i = 0; i < Math.min(this.buildings.length, 46); i++) {
            const building = this.buildings[i];
            if (snapshot.stage === 0 || hash01(civ.seed + i * 73 + Math.trunc(animationTime / 850)) < .42)
                continue;
            context.fillStyle = this.color(presentation.colors.window, .5 + hash01(i * 9) * .3);
            context.fillRect(building.x - building.width * .28 + i % 3 * 5, ground - building.height + 8 + i % 7 * 12, 3, 3);
        }
        for (let i = 0; i < snapshot.trafficCount; i++) {
            const progress = (hash01(civ.seed + i * 47) + animationTime * .00002 * (.5 + hash01(i * 13))) % 1;
            context.fillStyle = this.color(i % 2 ? presentation.accent : presentation.colors.window, .74);
            context.fillRect(progress * worldWidth, ground + 9 + i % 3 * 5, 6 + snapshot.stage, 2.5);
        }
        for (let i = 0; i < snapshot.aircraftCount; i++) {
            const progress = (hash01(civ.seed + i * 71) + animationTime * .000008 * (.7 + hash01(i * 5))) % 1;
            const x = progress * worldWidth;
            const y = this.height * (.18 + hash01(i * 23) * .22);
            context.strokeStyle = this.color(presentation.accent, .62);
            context.beginPath();
            context.moveTo(x - 10, y);
            context.lineTo(x + 10, y);
            context.stroke();
        }
        for (let i = 0; i < snapshot.beaconCount; i++) {
            const x = worldWidth * (.08 + hash01(civ.seed + i * 97) * .84);
            const pulse = reducedMotion ? 1 : .7 + Math.sin(animationTime * .003 + i) * .3;
            context.strokeStyle = this.color(presentation.accent, .16 + presentation.awareness * .25 * pulse);
            context.beginPath();
            context.arc(x, ground - 55 - i % 3 * 28, 10 + pulse * 8, 0, Math.PI * 2);
            context.stroke();
        }
        for (let i = 0; i < snapshot.fractureCount; i++) {
            const x = worldWidth * hash01(civ.seed + i * 61);
            context.strokeStyle = this.color(0xee6973, .24 + presentation.danger * .42);
            context.beginPath();
            context.moveTo(x, ground + 2);
            context.lineTo(x + (hash01(i * 11) - .5) * 46, ground + 24 + hash01(i * 17) * 34);
            context.stroke();
        }
        this.drawFallbackPath(context, civ, presentation, animationTime);
        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        const feedback = this.engine.worldImpulse;
        if (feedback && feedback.sequence !== this.feedbackSequence) {
            this.feedbackSequence = feedback.sequence;
            this.feedbackStartTime = time;
        }
        if (feedback && this.feedbackStartTime > 0)
            drawCanvasDecisionImpulse(context, feedback, this.feedbackStartTime, time, this.width, this.height, (value, alpha = 1) => this.color(value, alpha));
        context.setTransform(1, 0, 0, 1, 0, 0);
    }
    destroy() { cancelAnimationFrame(this.raf); this.staticCanvas.remove(); this.dynamicCanvas.remove(); }
}
export function startWorldRenderer(engine, host) {
    let game = null;
    let scene = null;
    let layers = null;
    let fallback = null;
    let lastStructuralKey = '';
    let lastDynamicFrame = 0;
    let lastStage = -1;
    let cachedSnapshot = null;
    let cachedPresentation = null;
    let cachedBuildings = [];
    let feedbackSequence = 0;
    let feedbackStartTime = 0;
    let activeFeedback = null;
    let rendererFailed = false;
    const resetRenderState = () => {
        lastStructuralKey = '';
        lastDynamicFrame = 0;
        lastStage = -1;
        cachedSnapshot = null;
        cachedPresentation = null;
        cachedBuildings = [];
        feedbackSequence = 0;
        feedbackStartTime = 0;
        activeFeedback = null;
    };
    const activateFallback = () => {
        rendererFailed = true;
        try {
            game?.destroy(true);
        }
        catch { /* Renderer teardown must never block the UI. */ }
        game = null;
        scene = null;
        layers = null;
        resetRenderState();
        host.replaceChildren();
        if (engine.state.phase === 'civilization' && engine.state.civilization && !fallback) {
            fallback = new FallbackWorld(engine, host);
        }
    };
    const ensure = () => {
        if (engine.state.phase !== 'civilization' || !engine.state.civilization) {
            if (game) {
                game.destroy(true);
                game = null;
                scene = null;
                layers = null;
                host.replaceChildren();
            }
            fallback?.destroy();
            fallback = null;
            rendererFailed = false;
            resetRenderState();
            return;
        }
        if (game || fallback)
            return;
        const PhaserRuntime = globalThis.Phaser;
        if (!PhaserRuntime) {
            fallback = new FallbackWorld(engine, host);
            return;
        }
        const sceneConfig = {
            create() {
                try {
                    scene = this;
                    this.scale.resize(Math.max(320, host.clientWidth), Math.max(300, host.clientHeight));
                    const skyLayer = this.add.graphics().setDepth(0).setScrollFactor(.1, 1);
                    const terrainLayer = this.add.graphics().setDepth(1).setScrollFactor(.52, 1);
                    const settlementLayer = this.add.graphics().setDepth(2).setScrollFactor(1, 1);
                    const atmosphereLayer = this.add.graphics().setDepth(3).setScrollFactor(1, 1);
                    const impulseLayer = this.add.graphics().setDepth(4).setScrollFactor(0, 0);
                    layers = { skyLayer, terrainLayer, settlementLayer, atmosphereLayer, impulseLayer };
                    this.input.on('pointerdown', (pointer) => { this.__dragX = pointer.x; this.__startScroll = this.cameras.main.scrollX; });
                    this.input.on('pointermove', (pointer) => {
                        if (!pointer.isDown)
                            return;
                        const max = Math.max(0, this.cameras.main.getBounds().width - this.scale.width);
                        this.cameras.main.scrollX = Math.max(0, Math.min(max, this.__startScroll + (this.__dragX - pointer.x)));
                    });
                    this.input.on('wheel', (_pointer, _objects, deltaX, deltaY) => {
                        const max = Math.max(0, this.cameras.main.getBounds().width - this.scale.width);
                        this.cameras.main.scrollX = Math.max(0, Math.min(max, this.cameras.main.scrollX + deltaX + deltaY * .35));
                    });
                }
                catch {
                    if (!rendererFailed) {
                        rendererFailed = true;
                        queueMicrotask(activateFallback);
                    }
                }
            },
            update(time) {
                try {
                    const civ = engine.state.civilization;
                    if (!civ || !layers || rendererFailed)
                        return;
                    const width = this.scale.width;
                    const height = this.scale.height;
                    const key = `${structuralWorldKey(civ, width)}|${Math.round(height / 40)}|${civ.traits.join(',')}`;
                    if (key !== lastStructuralKey) {
                        lastStructuralKey = key;
                        cachedSnapshot = worldSnapshot(civ, width);
                        cachedPresentation = worldPresentation(civ);
                        cachedBuildings = buildingLayout(civ, cachedSnapshot.worldWidth, height, cachedSnapshot.buildingCount, cachedSnapshot.stage);
                        drawSky(layers.skyLayer, civ, cachedSnapshot.worldWidth, height, cachedPresentation, cachedSnapshot.particleCount);
                        drawTerrain(layers.terrainLayer, civ, cachedSnapshot.worldWidth, height, cachedPresentation);
                        drawSettlement(layers.settlementLayer, civ, cachedSnapshot.worldWidth, height, cachedBuildings, cachedPresentation);
                        this.cameras.main.setBounds(0, 0, cachedSnapshot.worldWidth, height);
                        if (lastStage !== cachedSnapshot.stage) {
                            lastStage = cachedSnapshot.stage;
                            this.cameras.main.centerOn(cachedSnapshot.worldWidth * .5, height * .5);
                        }
                    }
                    if (!cachedSnapshot || !cachedPresentation)
                        return;
                    const feedback = engine.worldImpulse;
                    if (feedback && feedback.sequence !== feedbackSequence) {
                        feedbackSequence = feedback.sequence;
                        feedbackStartTime = time;
                        activeFeedback = feedback;
                    }
                    if (time - lastDynamicFrame < (reducedMotion ? 180 : DYNAMIC_FRAME_MS))
                        return;
                    lastDynamicFrame = time;
                    const dynamicSnapshot = worldSnapshot(civ, width);
                    const dynamicPresentation = worldPresentation(civ);
                    drawAtmosphere(layers.atmosphereLayer, civ, width, height, time, dynamicSnapshot, dynamicPresentation, cachedBuildings);
                    drawDecisionImpulse(layers.impulseLayer, activeFeedback, feedbackStartTime, time, width, height);
                }
                catch {
                    if (!rendererFailed) {
                        rendererFailed = true;
                        queueMicrotask(activateFallback);
                    }
                }
            },
        };
        try {
            game = new PhaserRuntime.Game({
                type: PhaserRuntime.AUTO,
                parent: host,
                width: Math.max(320, host.clientWidth),
                height: Math.max(300, host.clientHeight),
                backgroundColor: '#05070b',
                transparent: false,
                render: { antialias: true, pixelArt: false },
                scale: { mode: PhaserRuntime.Scale.RESIZE, autoCenter: PhaserRuntime.Scale.CENTER_BOTH },
                scene: sceneConfig,
            });
        }
        catch {
            activateFallback();
        }
    };
    const onPhaserReady = () => {
        if (fallback && globalThis.Phaser) {
            fallback.destroy();
            fallback = null;
            rendererFailed = false;
            resetRenderState();
            host.replaceChildren();
            ensure();
        }
    };
    window.addEventListener('phaser-ready', onPhaserReady);
    const unsubscribe = engine.onChange(ensure);
    ensure();
    const resize = new ResizeObserver(() => {
        if (game && scene) {
            lastStructuralKey = '';
            game.scale.resize(Math.max(320, host.clientWidth), Math.max(300, host.clientHeight));
        }
    });
    resize.observe(host);
    return {
        nudge(direction) {
            if (fallback)
                return fallback.nudge(direction);
            if (scene) {
                const camera = scene.cameras.main;
                const max = Math.max(0, camera.getBounds().width - scene.scale.width);
                camera.scrollX = Math.max(0, Math.min(max, camera.scrollX + direction * scene.scale.width * .65));
            }
        },
        destroy() {
            unsubscribe();
            resize.disconnect();
            window.removeEventListener('phaser-ready', onPhaserReady);
            if (game)
                game.destroy(true);
            fallback?.destroy();
            resetRenderState();
            host.replaceChildren();
        },
    };
}
//# sourceMappingURL=world.js.map