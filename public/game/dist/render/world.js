import { CivilizationPaths } from '../game/paths.js';
import { worldSnapshot } from './world-model.js';
import { decisionImpulseKind, entropyThresholdColor, structuralWorldKey, worldPresentation } from './world-presentation.js';
import { hash01, mixColor } from './primitives.js';
import { canvasSurface } from './draw-surface.js';
import { settlementLayout } from './settlements.js';
import { bannerGeometry, drawBanner, drawStructure } from './structures.js';
import { casteFor, drawCreature, speciesProfile } from './species.js';
import { agentPlan } from './agents.js';
import { CONSTRUCTION_MS, CONSTRUCTION_REDUCED_MS, ConstructionTracker } from './construction.js';
import { factionRoster, UNALIGNED_COLOR } from './factions.js';
const DYNAMIC_FRAME_MS = 33;
const devicePixelRatio = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const CONSTRUCTION_DURATION = reducedMotion ? CONSTRUCTION_REDUCED_MS : CONSTRUCTION_MS;
// Ground sits low enough that the strip below it stays a framed foreground band rather than
// a quarter of the viewport filled with nothing.
const GROUND_RATIO = .78;
function buildScene(civ, width, height) {
    const snapshot = worldSnapshot(civ, width);
    const presentation = worldPresentation(civ);
    const settlements = settlementLayout(civ, snapshot.worldWidth, height, snapshot);
    const structures = settlements.flatMap(settlement => settlement.structures);
    return { civ, snapshot, presentation, settlements, structures, plan: agentPlan(civ, snapshot, settlements), species: speciesProfile(civ), roster: factionRoster(civ) };
}
function factionColor(scene, settlement) {
    return settlement.factionIndex >= 0 ? (scene.roster[settlement.factionIndex]?.color ?? UNALIGNED_COLOR) : UNALIGNED_COLOR;
}
function drawSkyContent(surface, scene, height) {
    const { civ, snapshot, presentation } = scene;
    const worldWidth = snapshot.worldWidth;
    surface.fillStyle(presentation.colors.skyTop, 1).fillRect(0, 0, worldWidth, height * .48);
    surface.fillStyle(presentation.colors.skyBottom, 1).fillRect(0, height * .48, worldWidth, height * .52);
    for (let band = 0; band < 5; band++) {
        surface.fillStyle(presentation.colors.haze, .025 + presentation.attention * .018).fillRect(0, height * (.24 + band * .085), worldWidth, height * .08);
    }
    for (let i = 0; i < snapshot.particleCount; i++) {
        surface.fillStyle(i % 9 === 0 ? presentation.accent : 0xc9e1ff, .18 + hash01(i * 41) * (.38 + presentation.awareness * .22))
            .fillCircle(hash01(civ.seed + i * 17) * worldWidth, hash01(civ.seed + i * 31) * height * .58, .55 + hash01(i * 7) * 1.7);
    }
    if (civ.stats.attention >= 60) {
        const observerX = worldWidth * (.72 + hash01(civ.seed) * .12);
        surface.fillStyle(presentation.accent, .035 + presentation.attention * .05).fillCircle(observerX, height * .18, 78);
        surface.lineStyle(1.5, presentation.accent, .12 + presentation.attention * .16).strokeCircle(observerX, height * .18, 42);
    }
}
function drawTerrainContent(surface, scene, height) {
    const { civ, snapshot, presentation } = scene;
    const worldWidth = snapshot.worldWidth;
    const horizon = height * .69;
    for (let i = 0; i < Math.ceil(worldWidth / 160) + 1; i++) {
        const x = i * 160 - 80;
        surface.fillStyle(presentation.colors.farTerrain, .82).fillTriangle(x, horizon, x + 110, horizon - 60 - hash01(civ.seed * 3 + i * 29) * 100, x + 230, horizon);
    }
    surface.fillStyle(presentation.colors.nearTerrain, .82).fillRect(0, horizon, worldWidth, height - horizon);
}
function drawSettlementContent(surface, scene, height) {
    const { civ, snapshot, presentation, settlements } = scene;
    const worldWidth = snapshot.worldWidth;
    const stage = snapshot.stage;
    const ground = height * GROUND_RATIO;
    surface.fillStyle(presentation.colors.nearTerrain, 1).fillRect(0, ground, worldWidth, height - ground);
    // Roads connect settlement centers rather than banding the whole world.
    if (stage > 0) {
        for (let i = 0; i < settlements.length; i++) {
            const from = settlements[i];
            const to = settlements[i + 1] ?? null;
            const left = to ? from.centerX : from.centerX - from.radius;
            const right = to ? to.centerX : from.centerX + from.radius;
            const start = Math.min(left, right);
            const span = Math.abs(right - left);
            surface.fillStyle(0x11191f, .98).fillRect(start, ground + 4, span, 12 + stage * 3);
            for (let dash = 0; dash * 42 < span; dash++) {
                surface.fillStyle(presentation.colors.window, .18).fillRect(start + dash * 42 + 10, ground + 10 + stage, 18, 2);
            }
        }
        if (stage >= 2)
            surface.lineStyle(2, presentation.accent, .24).line(0, ground - 9, worldWidth, ground - 9);
        if (stage >= 4)
            surface.lineStyle(2, presentation.accent, .4).line(0, ground - 18, worldWidth, ground - 18);
    }
    else {
        surface.fillStyle(0x493821, .98).fillRect(0, ground + 4, worldWidth, 11);
    }
    for (const settlement of settlements) {
        for (const structure of settlement.structures) {
            drawStructure(surface, structure, ground, presentation.colors.settlement, presentation.accent, presentation.colors.window, civ.seed);
        }
        // A faction-colored plinth marks who holds the settlement even in the cached layer.
        if (stage > 0) {
            surface.fillStyle(factionColor(scene, settlement), .5).fillRect(settlement.centerX - settlement.radius * .22, ground - 3, settlement.radius * .44, 3);
        }
    }
    // Foreground bank: without it the strip below the road was flat, empty fill.
    const bankTop = height - Math.max(14, (height - ground) * .34);
    const bankColor = mixColor(presentation.colors.nearTerrain, 0x000000, .5);
    surface.fillStyle(bankColor, 1).fillRect(0, bankTop, worldWidth, height - bankTop);
    for (let i = 0; i * 96 < worldWidth; i++) {
        const x = i * 96;
        surface.fillStyle(bankColor, 1).fillTriangle(x, bankTop + 2, x + 48, bankTop - 5 - hash01(civ.seed + i * 7) * 12, x + 96, bankTop + 2);
    }
    surface.lineStyle(1, presentation.accent, .12).line(0, bankTop, worldWidth, bankTop);
}
function drawPathMotif(surface, civ, worldWidth, height, ground, time, accent) {
    const path = CivilizationPaths.ensure(civ).dominantPath;
    if (!path)
        return;
    switch (path) {
        case 'machine_faith':
            for (let i = 0; i < 8; i++) {
                const x = worldWidth * (.08 + i * .12);
                surface.lineStyle(2, accent, .32).line(x, ground - 35, x, ground - 90 - (i % 3) * 18);
                surface.fillStyle(accent, .42).fillCircle(x, ground - 95 - (i % 3) * 18, 4);
            }
            break;
        case 'collective_mind': {
            const points = Array.from({ length: 12 }, (_, i) => ({ x: worldWidth * (.05 + hash01(civ.seed + i) * .9), y: ground - 40 - hash01(i * 17) * 100 }));
            surface.lineStyle(1, accent, .22);
            for (let i = 1; i < points.length; i++)
                surface.line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
            for (const point of points)
                surface.fillStyle(accent, .5).fillCircle(point.x, point.y, 3);
            break;
        }
        case 'temporal_dominion':
            for (let i = 0; i < 7; i++) {
                const x = worldWidth * (.1 + i * .13);
                const y = height * .22 + (i % 2) * 30;
                surface.lineStyle(2, accent, .3).strokeCircle(x, y, 12 + i * 2);
                surface.lineStyle(1, accent, .45).line(x, y, x + Math.cos(time * .001 + i) * 10, y + Math.sin(time * .001 + i) * 10);
            }
            break;
        case 'reality_engineering':
            for (let i = 0; i < 9; i++) {
                const x = worldWidth * (.08 + i * .105);
                const y = ground - 50 - (i % 3) * 35;
                surface.lineStyle(2, accent, .3).line(x - 12, y + 12, x, y - 12).line(x, y - 12, x + 12, y + 12).line(x + 12, y + 12, x - 12, y + 12);
            }
            break;
        case 'biological_transcendence':
            for (let i = 0; i < 18; i++)
                surface.fillStyle(accent, .14).fillCircle(worldWidth * hash01(civ.seed + i * 13), ground - 10 - hash01(i * 29) * 80, 8 + hash01(i) * 14);
            break;
        case 'cosmic_resistance':
            for (let i = 0; i < 12; i++) {
                const x = worldWidth * (.03 + i * .085);
                surface.fillStyle(accent, .38).fillTriangle(x, ground - 48, x + 16, ground - 43, x, ground - 36);
                surface.lineStyle(1, 0xe5e5e5, .35).line(x, ground - 48, x, ground - 26);
            }
            break;
        case 'bureaucratic_singularity':
            for (let i = 0; i < 10; i++) {
                const x = worldWidth * (.06 + i * .095);
                const y = ground - 70 - (i % 2) * 28;
                surface.lineStyle(1, accent, .25).strokeRect(x, y, 28, 20);
                surface.lineStyle(1, accent, .18).line(x + 4, y + 6, x + 23, y + 6);
            }
            break;
        case 'post_mortal_civilization':
            for (let i = 0; i < 9; i++) {
                const x = worldWidth * (.07 + i * .11);
                const y = ground - 55 - (i % 3) * 20;
                surface.fillStyle(accent, .11).fillCircle(x, y, 11);
                surface.lineStyle(1, accent, .34).strokeCircle(x, y, 7);
            }
            break;
        case 'void_communion':
            for (let i = 0; i < 7; i++) {
                const x = worldWidth * (.1 + i * .13);
                const y = height * .18 + (i % 3) * 24;
                surface.fillStyle(accent, .12).fillCircle(x, y, 26 + Math.sin(time * .001 + i) * 3);
                surface.lineStyle(2, accent, .28).strokeCircle(x, y, 9);
            }
            break;
        case 'recursive_simulation':
            for (let i = 0; i < 8; i++) {
                const x = worldWidth * (.07 + i * .115);
                const y = ground - 75 - (i % 2) * 35;
                for (let ring = 0; ring < 3; ring++)
                    surface.lineStyle(1, accent, .18 + .06 * ring).strokeRect(x - ring * 5, y - ring * 5, 22 + ring * 10, 14 + ring * 10);
            }
            break;
    }
}
/**
 * Reads `snapshot` and `presentation` live, so continuously changing state (entropy, danger,
 * awareness) keeps showing while the cached structural layers stay untouched. Geometry comes
 * from the cached `scene`.
 */
function drawDynamicContent(surface, scene, snapshot, presentation, width, height, time, tracker) {
    const { civ, settlements, plan, species } = scene;
    const animationTime = reducedMotion ? 0 : time;
    const worldWidth = snapshot.worldWidth;
    const ground = height * GROUND_RATIO;
    for (let i = 0; i < snapshot.hazeBands; i++) {
        const drift = (animationTime * (.002 + i * .00035)) % (width * .6);
        const y = height * (.28 + i * .07) + Math.sin(animationTime * .0005 + i) * (reducedMotion ? 0 : 4);
        surface.fillStyle(presentation.colors.haze, .02 + presentation.sanityDistortion * .025).fillRect(drift - width * .3, y, worldWidth * .34, 22 + i * 4);
    }
    // Lit windows keep flickering across the settlement skyline.
    for (let i = 0; i < Math.min(scene.structures.length, 46); i++) {
        const structure = scene.structures[i];
        if (snapshot.stage === 0 || hash01(civ.seed + i * 73 + Math.trunc(animationTime / 850)) < .42)
            continue;
        const rows = Math.max(2, Math.min(10, Math.trunc(structure.height / 18)));
        surface.fillStyle(presentation.colors.window, .45 + hash01(i * 9) * .32)
            .fillRect(structure.x - structure.width * .28 + (i % 3) * 5, ground - structure.height + 8 + (i % rows) * 13, 2.5 + snapshot.stage * .28, 3);
    }
    // Inhabitants.
    for (const pedestrian of plan.pedestrians) {
        const settlement = settlements[pedestrian.settlementIndex];
        if (!settlement)
            continue;
        const travel = reducedMotion ? pedestrian.offset : (pedestrian.offset + animationTime * .000045 * pedestrian.speed) % 1;
        const x = settlement.centerX - settlement.radius + travel * settlement.radius * 2;
        const phase = reducedMotion ? 0 : (animationTime % species.gaitPeriod) / species.gaitPeriod;
        drawCreature(surface, species, casteFor(settlement.settlementClass), x, ground + 2 + pedestrian.lane * 3, .8 + snapshot.stage * .12, phase, presentation.accent);
    }
    // Road traffic.
    for (const vehicle of plan.vehicles) {
        const travel = reducedMotion ? vehicle.phase : (vehicle.phase + animationTime * .00002 * vehicle.speed) % 1;
        const x = vehicle.fromX + (vehicle.toX - vehicle.fromX) * travel;
        const length = 5 + snapshot.stage * 1.5;
        const y = ground + 10 + vehicle.lane * 7;
        surface.fillStyle(vehicle.seed % 2 ? presentation.accent : presentation.colors.window, .72).fillRect(x, y, length, 2.5);
        if (civ.era >= 2)
            surface.fillStyle(presentation.accent, .22).fillRect(x - length * .5, y + .8, length * .5, 1);
    }
    // Air corridors.
    for (const aircraft of plan.aircraft) {
        const travel = reducedMotion ? aircraft.phase : (aircraft.phase + animationTime * .00032 * aircraft.speed) % 1;
        const x = aircraft.fromX + (aircraft.toX - aircraft.fromX) * travel;
        const y = height * aircraft.altitude;
        surface.lineStyle(1.5, presentation.accent, .62).line(x - 10, y, x + 10, y);
        surface.fillStyle(0xffffff, .82).fillCircle(x, y, 1.5);
    }
    for (const orbital of plan.orbital) {
        const x = ((orbital.phase + animationTime * .000003 * (1 + orbital.speed)) % 1) * worldWidth;
        surface.lineStyle(1, presentation.accent, .44).strokeRect(x - 3, height * orbital.altitude - 2, 6, 4);
    }
    // Launches rise from an actual pad.
    for (const launch of plan.launches) {
        const cycle = ((animationTime + launch.offset) % launch.period) / launch.period;
        if (cycle > .42)
            continue;
        const rise = cycle / .42;
        const y = ground - rise * height * .78;
        surface.fillStyle(presentation.accent, .9).fillRect(launch.x - 1.6, y, 3.2, 9);
        surface.fillStyle(0xffd9a0, .5 * (1 - rise)).fillTriangle(launch.x - 3, y + 9, launch.x, y + 9 + 16 * (1 - rise), launch.x + 3, y + 9);
    }
    // Banners and construction.
    for (const settlement of settlements) {
        if (snapshot.stage === 0)
            continue;
        const banner = bannerGeometry(settlement, ground, height);
        const owner = settlement.factionIndex >= 0 ? scene.roster[settlement.factionIndex] : null;
        drawBanner(surface, banner.x, banner.topY, banner.poleHeight, owner?.color ?? UNALIGNED_COLOR, owner?.sigil ?? 'node', reducedMotion ? 0 : (animationTime % 2600) / 2600);
        for (const structure of settlement.structures) {
            if (!tracker.isBuilding(structure.id, time))
                continue;
            const progress = tracker.progress(structure.id, time);
            const top = ground - structure.height;
            const buildY = ground - structure.height * progress;
            surface.fillStyle(presentation.colors.skyBottom, .88).fillRect(structure.x - structure.width / 2 - 1, top, structure.width + 2, Math.max(0, buildY - top));
            surface.lineStyle(1.4, 0xf2cd7b, .7).line(structure.x - structure.width * .7, buildY, structure.x + structure.width * .7, buildY);
            surface.lineStyle(1, 0xf2cd7b, .34).line(structure.x - structure.width * .6, ground, structure.x - structure.width * .6, top);
            surface.lineStyle(1, 0xf2cd7b, .34).line(structure.x + structure.width * .6, ground, structure.x + structure.width * .6, top);
            for (let spark = 0; spark < 3; spark++) {
                surface.fillStyle(0xffd9a0, .6).fillCircle(structure.x + (hash01(spark * 31 + Math.trunc(time / 90)) - .5) * structure.width, buildY + hash01(spark * 17 + Math.trunc(time / 90)) * 6, 1.1);
            }
        }
    }
    for (let i = 0; i < snapshot.fractureCount; i++) {
        const x = worldWidth * hash01(civ.seed + i * 61);
        surface.lineStyle(1.4, 0xee6973, .24 + presentation.danger * .42).line(x, ground + 2, x + (hash01(i * 11) - .5) * 46, ground + 24 + hash01(i * 17) * 34);
    }
    for (let i = 0; i < snapshot.beaconCount; i++) {
        const x = worldWidth * (.08 + hash01(civ.seed + i * 97) * .84);
        const pulse = reducedMotion ? 1 : .7 + Math.sin(animationTime * .003 + i) * .3;
        surface.lineStyle(1, presentation.accent, .16 + presentation.awareness * .25 * pulse).strokeCircle(x, ground - 55 - (i % 3) * 28, 10 + pulse * 8);
    }
    if (presentation.sanityDistortion > .18) {
        for (let i = 0; i < 3; i++) {
            const wobble = reducedMotion ? 0 : Math.sin(animationTime * .0014 + i) * 9 * presentation.sanityDistortion;
            surface.lineStyle(1, 0xb68cff, .08 + presentation.sanityDistortion * .13).strokeCircle(worldWidth * (.22 + i * .29) + wobble, height * (.28 + i * .04), 35 + i * 17);
        }
    }
    drawPathMotif(surface, civ, worldWidth, height, ground, animationTime, presentation.accent);
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
/** Drawn identically on both backends; the caller owns clearing its layer. */
function drawDecisionImpulse(surface, feedback, startTime, time, width, height) {
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
                surface.lineStyle(2, color, .42).line(width * .18, height * (.38 + i * .1), width * .82, height * (.38 + i * .1));
        else if (kind === 'scan') {
            surface.lineStyle(2, color, .48).line(width * .16, height * .5, width * .84, height * .5);
            surface.lineStyle(1, color, .4).strokeCircle(width * .5, height * .5, radius);
        }
        else if (kind === 'fracture')
            for (let i = 0; i < 6; i++)
                surface.lineStyle(2, color, .44).line(width * (.3 + i * .07), height * .3, width * (.34 + i * .06), height * .72);
        else {
            surface.lineStyle(kind === 'containment' ? 4 : 2, color, .48).strokeCircle(width * .5, height * .54, radius);
            surface.fillStyle(color, .06).fillCircle(width * .5, height * .54, radius * .72);
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
            surface.lineStyle(4 - ring, color, alpha * (1 - ring * .18)).strokeCircle(width * .5, height * .54, radius * (.58 + ring * .2));
        surface.fillStyle(color, alpha * .08).fillCircle(width * .5, height * .54, radius * .5);
    }
    else if (kind === 'time-streak') {
        for (let i = 0; i < 9; i++) {
            const y = height * (.2 + i * .075);
            const inset = ((i % 3) * 36 + progress * width * .18) % Math.max(1, width * .28);
            surface.lineStyle(1.2 + (i % 2), color, alpha * (.45 + (i % 3) * .15)).line(-width * .08 + inset, y, width * (.7 + progress * .35) + inset, y);
        }
    }
    else if (kind === 'scan') {
        const y = height * (.16 + progress * .68);
        surface.lineStyle(2, color, alpha).line(width * .12, y, width * .88, y);
        surface.lineStyle(1, color, alpha * .75).strokeCircle(width * .5, height * .52, radius * .48);
        surface.line(width * .5 - radius * .62, height * .52, width * .5 + radius * .62, height * .52);
        surface.line(width * .5, height * .52 - radius * .62, width * .5, height * .52 + radius * .62);
    }
    else if (kind === 'fracture') {
        for (let i = 0; i < 10; i++) {
            const x = width * (.16 + i * .075);
            const bend = (hash01(i * 31 + feedback.sequence) - .5) * width * .08;
            surface.lineStyle(1.2 + (i % 3), color, alpha).line(x, height * .18, x + bend, height * (.42 + progress * .2));
            surface.line(x + bend, height * (.42 + progress * .2), x - bend * .35, height * .84);
        }
    }
    else {
        surface.lineStyle(3 - progress * 2, color, alpha).strokeCircle(width * .5, height * .54, radius);
        surface.lineStyle(1, 0xffffff, alpha * .5).strokeCircle(width * .5, height * .54, radius * .72);
        surface.fillStyle(color, alpha * .07).fillCircle(width * .5, height * .54, radius * .45);
    }
}
class CanvasWorld {
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
        this.scene = null;
        this.tracker = new ConstructionTracker(CONSTRUCTION_DURATION);
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
            const key = `${structuralWorldKey(civ, this.width)}|${Math.round(this.height / 40)}|${civ.traits.join(',')}`;
            if (key !== this.lastStructuralKey || this.scroll !== this.lastStaticScroll) {
                this.lastStructuralKey = key;
                this.lastStaticScroll = this.scroll;
                this.scene = buildScene(civ, rect.width, this.height);
                this.tracker.sync(this.scene.structures, time);
                this.drawStatic(this.scene);
            }
            if (!this.scene)
                return;
            this.tracker.prune(time);
            this.scroll = Math.max(0, Math.min(this.scene.snapshot.worldWidth - rect.width, this.scroll));
            this.drawDynamic(time, this.scene, civ);
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
    surface(context) {
        return canvasSurface(context, (value, alpha = 1) => this.color(value, alpha));
    }
    drawStatic(scene) {
        const context = this.staticContext;
        const surface = this.surface(context);
        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        context.clearRect(0, 0, this.width, this.height);
        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, -this.scroll * .1 * devicePixelRatio, 0);
        drawSkyContent(surface, scene, this.height);
        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, -this.scroll * .52 * devicePixelRatio, 0);
        drawTerrainContent(surface, scene, this.height);
        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, -this.scroll * devicePixelRatio, 0);
        drawSettlementContent(surface, scene, this.height);
        context.setTransform(1, 0, 0, 1, 0, 0);
    }
    drawDynamic(time, scene, civ) {
        const context = this.dynamicContext;
        const surface = this.surface(context);
        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        context.clearRect(0, 0, this.width, this.height);
        const dynamicSnapshot = worldSnapshot(civ, this.width);
        const dynamicPresentation = worldPresentation(civ);
        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, -this.scroll * devicePixelRatio, 0);
        drawDynamicContent(surface, scene, dynamicSnapshot, dynamicPresentation, this.width, this.height, time, this.tracker);
        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        const feedback = this.engine.worldImpulse;
        if (feedback && feedback.sequence !== this.feedbackSequence) {
            this.feedbackSequence = feedback.sequence;
            this.feedbackStartTime = time;
        }
        if (feedback && this.feedbackStartTime > 0)
            drawDecisionImpulse(surface, feedback, this.feedbackStartTime, time, this.width, this.height);
        context.setTransform(1, 0, 0, 1, 0, 0);
    }
    destroy() { cancelAnimationFrame(this.raf); this.tracker.reset(); this.staticCanvas.remove(); this.dynamicCanvas.remove(); }
}
export function startWorldRenderer(engine, host) {
    let world = null;
    const ensure = () => {
        const active = engine.state.phase === 'civilization' && !!engine.state.civilization;
        if (active && !world)
            world = new CanvasWorld(engine, host);
        else if (!active && world) {
            world.destroy();
            world = null;
            host.replaceChildren();
        }
    };
    const unsubscribe = engine.onChange(ensure);
    ensure();
    return {
        nudge(direction) { world?.nudge(direction); },
        destroy() { unsubscribe(); world?.destroy(); world = null; host.replaceChildren(); },
    };
}
//# sourceMappingURL=world.js.map