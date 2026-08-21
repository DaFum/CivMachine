import { applyEffects, clampStats } from "./effects.js";
import { CONTENT } from "../data/content.generated.js";
import { applyEraCeiling, applyInterventionCopy, } from "../data/intervention-copy.js";
import { APOTHEOSIS_EVENTS } from "../data/apotheosis-events.js";
import { ENTROPY_CRISES } from "../data/entropy-crises.js";
import { EVENT_CHAINS } from "../data/event-chains.js";
import { EXPANDED_INTERVENTIONS } from "../data/expanded-interventions.js";
import { EXPANDED_DOMINANT_INTERVENTIONS, EXPANDED_PATH_INTERVENTIONS, } from "../data/expanded-path-interventions.js";
import { CivilizationPaths } from "./paths.js";
import { applyWorldMemory } from "./world-memory.js";
import { parseSaveText } from "./save-migration.js";
import { Progression, nextSystemPreviews, visibleUpgradeEntries, } from "./progression.js";
import { ERA_YEAR_THRESHOLDS, RESOURCE_KEYS, SAVE_VERSION, calculateHarvest, createCivilizationTemplate, createNewState, eraForYears, multiverseAxiomAward, universeResidueAward, upgradeCost, } from "./rules.js";
import { buildInterventionPool, chooseWeightedIntervention, eventDelayWindow, interventionExhausted, recentEventIds, recordRecentIntervention, } from "./intervention-scheduler.js";
import { buildDecisionFeedback, captureDecisionSnapshot, } from "./decision-feedback.js";
import { advancePressure, pressureYears } from "./pressure.js";
import { statDrift } from "./stat-drift.js";
import { developmentGrowthPerSecond } from "./development.js";
import { TACTICAL_ACTIONS, applyTacticalAction, tacticalAvailability, } from "./tactical-actions.js";
import { applyHarvestQuality, calculateCultivationCredits, cultivationDepth, evaluateHarvestQuality, gradeIndex, } from "./harvest-quality.js";
import { RUN_INTERVENTIONS, applyRunIntervention, runInterventionById, runInterventionCost, runInterventionUses, } from "./run-interventions.js";
import { buildDirectiveOffers, evaluateDirectiveObjective, objectiveForDirective, } from "./run-directives.js";
import { convergenceBonuses, convergenceRequirements, convergenceTargets, convergenceUnlocked, evaluateConvergence, terminalCivilizationSetup, } from "./convergence.js";
import { MILESTONE_CATALOG, completedMilestoneCount } from "./milestones.js";
import { balancedAxiomUpgrades, balancedMachineUpgrades, balancedUniverseUpgrades, } from "./upgrade-balance.js";
export const ERA_NAMES = [
    "EMERGENCE",
    "EXPANSION",
    "TRANSCENDENCE",
    "APOTHEOSIS",
];
const SAVE_KEY = "reality_consumption_engine_browser_save_v2";
// A save that had to be migrated, repaired or refused is copied here verbatim before anything
// overwrites the live slot, so a loader bug costs a player nothing they cannot get back.
export const SAVE_BACKUP_KEY = `${SAVE_KEY}_backup`;
const C = CONTENT;
function mixSeed(value) {
    let mixed = value >>> 0 || 0x52434531;
    mixed = Math.imul(mixed ^ (mixed >>> 16), 0x7feb352d);
    mixed = Math.imul(mixed ^ (mixed >>> 15), 0x846ca68b);
    return (mixed ^ (mixed >>> 16)) >>> 0 || 0x6d2b79f5;
}
class SeededRng {
    constructor(seed) {
        this.state = seed >>> 0 || 0x6d2b79f5;
    }
    next() {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    range(min, max) {
        return min + (max - min) * this.next();
    }
    int(min, max) {
        return Math.floor(this.range(min, max + 1));
    }
}
export class GameEngine {
    constructor(options = {}) {
        this.messages = [];
        this.decisionFeedback = null;
        this.worldImpulse = null;
        this.lastActionFailure = "";
        // What the loader made of the stored save, for the message log and for tests.
        this.saveMigration = null;
        this.saveFailed = false;
        this.listeners = new Set();
        this.tickEmitAccumulator = 0;
        this.feedbackSequence = 0;
        this.traits = C.traits;
        this.events = [
            ...applyEraCeiling(applyInterventionCopy(C.events)),
            ...ENTROPY_CRISES,
            ...APOTHEOSIS_EVENTS,
            ...EXPANDED_INTERVENTIONS,
            ...EXPANDED_PATH_INTERVENTIONS,
            ...EXPANDED_DOMINANT_INTERVENTIONS,
            ...EVENT_CHAINS,
        ];
        this.machineUpgrades = balancedMachineUpgrades(C.machine_upgrades);
        this.universeUpgrades = balancedUniverseUpgrades(C.universe_upgrades);
        this.axiomUpgrades = balancedAxiomUpgrades(C.axiom_upgrades);
        this.directives = C.directives;
        this.matrices = C.breeding_matrices;
        this.mutations = C.mutations;
        this.storage = options.storage ?? globalThis.localStorage;
        this.autosave = options.autosave ?? true;
        this.state = this.load() ?? createNewState();
        if (this.state.civilization)
            recentEventIds(this.state.civilization);
        Progression.refresh(this.state, this.messages);
        if (this.state.phase === "machine" &&
            this.state.machine.runBuild.nextCivilizationSeed === 0)
            this.prepareNextRun(0, false);
        // Write the brought-forward shape back at once. Until it lands, every reload repeats the
        // migration -- and the backup taken above is what the old bytes are preserved in anyway.
        const migration = this.saveMigration;
        if (migration && migration.status !== "current" && migration.status !== "empty")
            this.save();
    }
    onChange(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }
    emit() {
        for (const fn of this.listeners)
            fn();
    }
    post(msg) {
        this.messages.unshift(msg);
        this.messages = this.messages.slice(0, 80);
    }
    // The one place a completed player decision becomes presentation memory. Pressure notifications go
    // straight to `worldImpulse` instead: they are queued warnings, not decisions, and the Entropy
    // crisis event they lead to owns the persistent scar.
    publishCompletedDecision(civ, feedback, repair = false) {
        this.decisionFeedback = feedback;
        this.worldImpulse = feedback;
        civ.visualMemory = applyWorldMemory(civ.seed, civ.visualMemory, feedback, {
            repair,
        });
    }
    save() {
        if (!this.autosave)
            return;
        // Never *lower* the marker: a save loaded from a newer build keeps its version so that build
        // does not later re-migrate data it had already written in the newer shape.
        this.state.saveVersion = Math.max(SAVE_VERSION, Number(this.state.saveVersion) || 0);
        // A rejected write (quota, private-mode storage) must not take the running game down with it,
        // and must be said out loud once rather than every five seconds for the rest of the session.
        try {
            this.storage.setItem(SAVE_KEY, JSON.stringify(this.state));
            this.saveFailed = false;
        }
        catch {
            if (!this.saveFailed)
                this.post("Save failed: browser storage rejected the write. Progress is only in memory.");
            this.saveFailed = true;
        }
    }
    // Reads the stored save through the migrator, so an older, newer or damaged payload becomes a
    // playable state instead of a silent wipe. The original bytes are copied to SAVE_BACKUP_KEY
    // whenever the loader had to change anything, before the next save() overwrites the live slot.
    load() {
        let raw = null;
        try {
            raw = this.storage?.getItem(SAVE_KEY) ?? null;
        }
        catch {
            return null;
        }
        const { state, report } = parseSaveText(raw);
        this.saveMigration = report;
        if (report.keepBackup && raw)
            this.writeBackup(raw);
        if (report.notice)
            this.post(report.notice);
        return state;
    }
    writeBackup(raw) {
        // `autosave: false` means this engine does not write to storage -- the backup is a write too.
        if (!this.autosave)
            return;
        try {
            this.storage.setItem(SAVE_BACKUP_KEY, raw);
        }
        catch {
            // A backup that does not fit is not worth failing the load over.
        }
    }
    // The manual way back from a migration the player does not want: the preserved payload is put
    // back into the live slot and loaded again. Returns false when there is nothing to restore.
    restoreBackup() {
        let raw = null;
        try {
            raw = this.storage?.getItem(SAVE_BACKUP_KEY) ?? null;
        }
        catch {
            return false;
        }
        const { state, report } = parseSaveText(raw);
        if (!state)
            return false;
        this.saveMigration = report;
        this.state = state;
        this.messages = [];
        this.decisionFeedback = null;
        this.worldImpulse = null;
        if (this.state.civilization)
            recentEventIds(this.state.civilization);
        Progression.refresh(this.state, this.messages);
        if (this.state.phase === "machine" && this.state.machine.runBuild.nextCivilizationSeed === 0)
            this.prepareNextRun(0, false);
        this.post("Backup save restored.");
        // The backup gets the same account of what the loader had to do as the live slot does: it can
        // itself be an older or damaged payload, and `messages` was just cleared.
        if (report.notice)
            this.post(report.notice);
        this.save();
        this.emit();
        return true;
    }
    deleteSave() {
        // An explicit erase erases: leaving the backup behind would keep the progress the player just
        // asked to be rid of one restore away. Both removals sit inside the guard, because a storage that
        // refuses to erase must not take the running game down with it -- or abort before the reset.
        let eraseFailed = false;
        try {
            this.storage.removeItem(SAVE_KEY);
            this.storage.removeItem(SAVE_BACKUP_KEY);
        }
        catch {
            eraseFailed = true;
        }
        this.state = createNewState();
        this.messages = [];
        this.decisionFeedback = null;
        this.worldImpulse = null;
        this.prepareNextRun(0, false);
        // After the reset, not inside the catch: the reset clears `messages`, so a notice posted earlier
        // would be erased along with the log it was meant to appear in.
        if (eraseFailed)
            this.post("Erase failed: browser storage rejected the removal. The old save may return on reload.");
        this.save();
        this.emit();
    }
    reset() {
        this.state = createNewState();
        this.messages = [];
        this.decisionFeedback = null;
        this.worldImpulse = null;
        this.prepareNextRun(0, false);
        this.save();
        this.emit();
    }
    static baseBonuses() {
        return {
            stabilityMax: 100,
            predictionLevel: 0,
            developmentMult: 1,
            causal_massMult: 1,
            cognitionMult: 1,
            paradoxMult: 1,
            existenceMult: 1,
            awarenessGainMult: 1,
            sanityLossMult: 1,
            attentionGainMult: 1,
            stabilityLossMult: 1,
            stabilityDecayMult: 1,
            eventDelay: 0,
            startingEra: 0,
            extraTraits: 0,
            allHarvestMult: 1,
            chaoticRetention: 0.4,
            containmentRating: 0,
            controlRecharge: 1,
            accelerateYears: 200,
            accelerateTimer: 8,
            gradeRewardMult: 1,
        };
    }
    static createCivilizationForTest(seed) {
        return createCivilizationTemplate(seed);
    }
    currentCivilization() {
        return this.state.civilization;
    }
    recordDominantPath(pathId) {
        const seen = this.state.meta.progression.seenDominantPaths;
        if (pathId && !seen.includes(pathId))
            seen.push(pathId);
    }
    tacticalAvailability(id) {
        const civ = this.state.civilization;
        return civ
            ? tacticalAvailability(civ, id)
            : {
                enabled: false,
                reason: "Start a civilization first.",
                cost: TACTICAL_ACTIONS[id].cost,
            };
    }
    eventById(id) {
        return this.events.find((e) => e.id === id) ?? null;
    }
    traitById(id) {
        return this.traits.find((t) => t.id === id) ?? null;
    }
    upgradeById(layer, id) {
        return this.catalog(layer).find((u) => u.id === id) ?? null;
    }
    catalog(layer) {
        return layer === "machine"
            ? this.machineUpgrades
            : layer === "universe"
                ? this.universeUpgrades
                : this.axiomUpgrades;
    }
    levels(layer) {
        return layer === "machine"
            ? this.state.machine.upgradeLevels
            : layer === "universe"
                ? this.state.meta.universeUpgradeLevels
                : this.state.meta.axiomLevels;
    }
    upgradeLevel(layer, id) {
        return Math.max(0, Number(this.levels(layer)[id] ?? 0));
    }
    upgradeCost(layer, id) {
        const d = this.upgradeById(layer, id);
        return d
            ? upgradeCost(Number(d.base_cost), Number(d.growth), this.upgradeLevel(layer, id))
            : 0;
    }
    currencyAmount(currency) {
        if (RESOURCE_KEYS.includes(currency))
            return this.state.machine.currencies[currency];
        if (currency === "universal_residue")
            return this.state.meta.universalResidue;
        if (currency === "axioms")
            return this.state.meta.axioms;
        return 0;
    }
    spendCurrency(currency, amount) {
        if (RESOURCE_KEYS.includes(currency))
            this.state.machine.currencies[currency] -= amount;
        else if (currency === "universal_residue")
            this.state.meta.universalResidue -= amount;
        else if (currency === "axioms")
            this.state.meta.axioms -= amount;
    }
    canPurchaseUpgrade(layer, id) {
        const d = this.upgradeById(layer, id);
        if (!d || !Progression.canUseUpgrade(this.state, layer, id))
            return false;
        return (this.upgradeLevel(layer, id) < Number(d.max_level) &&
            this.currencyAmount(String(d.currency)) >= this.upgradeCost(layer, id));
    }
    purchaseUpgrade(layer, id) {
        if (!this.canPurchaseUpgrade(layer, id))
            return false;
        const d = this.upgradeById(layer, id);
        const cost = this.upgradeCost(layer, id);
        this.spendCurrency(String(d.currency), cost);
        this.levels(layer)[id] = this.upgradeLevel(layer, id) + 1;
        this.post(`Modification authorized: ${d.name} level ${this.levels(layer)[id]}.`);
        if (layer === "axiom")
            this.refreshConvergenceMilestones();
        this.save();
        this.emit();
        return true;
    }
    visibleUpgradeEntries(layer) {
        return visibleUpgradeEntries(this.state, layer, this.catalog(layer));
    }
    visibleResources() {
        return Progression.visibleResourceKeys(this.state);
    }
    nextPreviews() {
        return nextSystemPreviews(this.state);
    }
    systemUnlocked(id) {
        return Progression.systemUnlocked(this.state, id);
    }
    resourceDiscovered(id) {
        return Progression.resourceDiscovered(this.state, id);
    }
    machineInsight() {
        return Progression.machineInsight(this.state);
    }
    availableDirectives() {
        return this.directives.filter((d) => this.state.machine.runBuild.directiveOfferIds.includes(d.id));
    }
    availableMatrices() {
        return this.matrices.filter((d) => this.state.meta.progression.knownBreedingMatrices.includes(d.id));
    }
    selectDirective(id) {
        const r = this.state.machine.runBuild;
        if (!this.systemUnlocked("directives") ||
            r.directiveLocked ||
            !r.directiveOfferIds.includes(id))
            return false;
        const d = this.directives.find((x) => x.id === id);
        if (!d)
            return false;
        r.selectedDirective = id;
        r.directiveLocked = true;
        this.post(`DIRECTIVE LOCKED FOR THE NEXT CIVILIZATION: ${d.name}`);
        this.save();
        this.emit();
        return true;
    }
    selectBreedingMatrix(id) {
        const r = this.state.machine.runBuild;
        if (!this.systemUnlocked("breeding_matrices") ||
            r.matrixLocked ||
            !this.state.meta.progression.knownBreedingMatrices.includes(id))
            return false;
        const d = this.matrices.find((x) => x.id === id);
        if (!d)
            return false;
        r.selectedBreedingMatrix = id;
        r.matrixLocked = true;
        r.previewTraitIds = this.buildTraitSelection(r.nextCivilizationSeed).ids;
        this.post(`BREEDING MATRIX LOCKED FOR THIS UNIVERSE: ${d.name}`);
        this.save();
        this.emit();
        return true;
    }
    prepareNextRun(seed = 0, notify = true) {
        const r = this.state.machine.runBuild;
        if (!seed && r.nextCivilizationSeed && r.previewTraitIds.length)
            return true;
        const basis = seed ||
            mixSeed(0x52434531 +
                this.state.machine.civilizationsTotal * 0x9e3779b9 +
                this.state.meta.universesTotal * 97);
        r.nextCivilizationSeed = basis >>> 0 || 0x52434531;
        r.directiveOfferIds = buildDirectiveOffers(this.state.meta.progression.knownDirectives, r.nextCivilizationSeed, 3);
        r.selectedDirective = "";
        r.directiveLocked = false;
        r.previewTraitIds = this.buildTraitSelection(r.nextCivilizationSeed).ids;
        if (notify) {
            this.save();
            this.emit();
        }
        return true;
    }
    runtimeBonuses() {
        const l = (layer, id) => this.upgradeLevel(layer, id);
        const containmentRating = [
            "reality_lattice",
            "awareness_scrubber",
            "sanity_protocol",
            "cosmic_muffling",
        ].reduce((sum, id) => sum + l("machine", id), 0) +
            l("universe", "stable_constants");
        const temporalLevel = Math.max(0, Math.min(3, l("machine", "temporal_injector")));
        const bureaucracyLevel = l("universe", "bureaucracy_of_gods");
        const gradeModules = [
            "historical_compressor",
            "cognitive_extractor",
            "paradox_sieve",
            "existence_furnace",
        ].filter((id) => l("machine", id) >= 3).length;
        const b = {
            stabilityMax: 100 +
                10 * l("machine", "reality_lattice") +
                20 * l("universe", "wide_lattice") +
                25 * l("axiom", "axiom_stability"),
            predictionLevel: l("machine", "prediction_core"),
            developmentMult: 1 + 0.12 * l("machine", "cultivation_accelerator"),
            causal_massMult: 1 + 0.12 * l("machine", "historical_compressor"),
            cognitionMult: 1 + 0.12 * l("machine", "cognitive_extractor"),
            paradoxMult: (1 + 0.15 * l("machine", "paradox_sieve")) *
                (1 + 0.25 * l("universe", "paradox_rights")),
            existenceMult: 1 + 0.12 * l("machine", "existence_furnace"),
            awarenessGainMult: Math.max(0.45, 1 - 0.08 * l("machine", "awareness_scrubber")),
            sanityLossMult: Math.max(0.45, 1 - 0.08 * l("machine", "sanity_protocol")),
            attentionGainMult: Math.max(0.45, 1 - 0.08 * l("machine", "cosmic_muffling")),
            stabilityLossMult: 1,
            stabilityDecayMult: 1,
            eventDelay: 0,
            startingEra: l("universe", "inherited_time"),
            extraTraits: l("universe", "archive_of_screams"),
            allHarvestMult: (1 + 0.1 * l("universe", "twin_harvest")) *
                (1 + 0.15 * l("axiom", "axiom_recursive_memory")),
            chaoticRetention: Math.min(0.95, 0.4 +
                0.08 * l("machine", "contingency_vat") +
                0.1 * l("axiom", "axiom_compassionate_accounting")),
            containmentRating,
            controlRecharge: 1 + (bureaucracyLevel >= 1 ? 1 : 0) + (bureaucracyLevel >= 3 ? 1 : 0),
            accelerateYears: [200, 260, 340, 450][temporalLevel],
            accelerateTimer: [8, 10, 13, 16][temporalLevel],
            gradeRewardMult: 1 + gradeModules * 0.025,
        };
        const selected = [
            this.state.machine.runBuild.selectedDirective,
            this.state.machine.runBuild.selectedBreedingMatrix,
        ];
        for (const id of selected) {
            if (!id)
                continue;
            const def = this.directives.find((x) => x.id === id) ??
                this.matrices.find((x) => x.id === id);
            for (const [key, val] of Object.entries(def?.effects ?? {})) {
                if (key === "trait_bias")
                    continue;
                const map = {
                    development_mult: "developmentMult",
                    causal_mass_mult: "causal_massMult",
                    cognition_mult: "cognitionMult",
                    paradox_mult: "paradoxMult",
                    existence_mult: "existenceMult",
                    awareness_gain_mult: "awarenessGainMult",
                    sanity_loss_mult: "sanityLossMult",
                    attention_gain_mult: "attentionGainMult",
                    stability_decay_mult: "stabilityDecayMult",
                    all_harvest_mult: "allHarvestMult",
                };
                const target = map[key];
                if (target)
                    b[target] = b[target] * Number(val);
            }
        }
        const convergence = convergenceBonuses(this.state.meta.convergences);
        b.allHarvestMult *= convergence.allHarvestMult;
        b.containmentRating += convergence.containment;
        return b;
    }
    traitWeight(id, precomputedBiasSet) {
        if (precomputedBiasSet) {
            return precomputedBiasSet.has(id) ? 3 : 1;
        }
        const matrixId = this.state.machine.runBuild.selectedBreedingMatrix;
        if (!matrixId)
            return 1;
        const matrix = this.matrices.find((x) => x.id === matrixId);
        return (matrix?.effects?.trait_bias ?? []).includes(id) ? 3 : 1;
    }
    startCivilization(requestedSeed = 0, terminal = false) {
        if (this.state.phase !== "machine")
            return false;
        const run = this.state.machine.runBuild;
        if (!terminal &&
            this.systemUnlocked("directives") &&
            run.directiveOfferIds.length &&
            !run.selectedDirective) {
            this.lastActionFailure =
                "Select one Directive before starting the Civilization.";
            this.emit();
            return false;
        }
        this.decisionFeedback = null;
        this.worldImpulse = null;
        this.lastActionFailure = "";
        const seed = requestedSeed || run.nextCivilizationSeed || mixSeed(Date.now());
        const selection = this.buildTraitSelection(seed);
        const usePreview = seed === run.nextCivilizationSeed && run.previewTraitIds.length > 0;
        const traitIds = usePreview ? [...run.previewTraitIds] : selection.ids;
        const bonuses = this.runtimeBonuses();
        const setup = terminal ? terminalCivilizationSetup() : null;
        const era = setup
            ? setup.era
            : Math.max(0, Math.min(2, Math.trunc(bonuses.startingEra)));
        const civ = GameEngine.createCivilizationForTest(seed);
        civ.terminal = terminal;
        civ.rngState = selection.rngState;
        civ.years = setup ? setup.years : ERA_YEAR_THRESHOLDS[era];
        civ.era = era;
        civ.development = setup ? setup.development : 1 + era * 80;
        civ.developmentMultiplier = bonuses.developmentMult;
        civ.eventTimer = 4;
        civ.stats.stability = bonuses.stabilityMax;
        civ.stats.stabilityMax = bonuses.stabilityMax;
        civ.harvestMult = {
            causal_mass: bonuses.causal_massMult,
            cognition: bonuses.cognitionMult,
            paradox: bonuses.paradoxMult,
            existence: bonuses.existenceMult,
        };
        civ.stabilityDecayMult = bonuses.stabilityDecayMult;
        civ.eventDelayBonus = bonuses.eventDelay;
        civ.predictionLevel = bonuses.predictionLevel;
        civ.directiveId = run.selectedDirective;
        const objective = objectiveForDirective(civ.directiveId);
        civ.directiveObjective = { id: objective?.id ?? "", completed: false };
        for (const id of traitIds) {
            const trait = this.traitById(id);
            if (!trait)
                continue;
            civ.traits.push(id);
            applyEffects(civ, trait.effects, false, bonuses);
        }
        for (const id of this.state.machine.activeMutations) {
            const m = this.mutations.find((x) => x.id === id);
            if (m)
                applyEffects(civ, m.effects, false, bonuses);
        }
        this.state.machine.activeMutations = [];
        this.appendHistory(civ, `YEAR ${Math.trunc(civ.years)}: Cultivation begins. Traits: ${civ.traits.map((id) => this.traitById(id)?.name ?? id).join(", ")}`);
        this.state.civilization = civ;
        this.state.phase = "civilization";
        this.state.simulationSpeed = 1;
        this.post(`Cultivation link established for civilization seed ${seed}.`);
        this.save();
        this.emit();
        return true;
    }
    tick(delta) {
        const civ = this.state.civilization;
        if (!civ || civ.pendingEvent)
            return;
        const dt = Math.min(delta, 0.25) *
            Math.max(1, Math.min(this.maxSimulationSpeed(), this.state.simulationSpeed));
        const b = this.runtimeBonuses();
        this.tickEmitAccumulator += dt;
        civ.elapsedSeconds += dt;
        civ.years += 25 * dt;
        const pressureBefore = captureDecisionSnapshot(civ);
        const pressure = advancePressure(civ, b, dt);
        if (pressure.queuedCrises.length) {
            for (const id of pressure.queuedCrises)
                if (!civ.scheduledEvents.includes(id))
                    civ.scheduledEvents.push(id);
            const thresholdId = pressure.queuedCrises.at(-1);
            this.worldImpulse = buildDecisionFeedback(++this.feedbackSequence, { id: thresholdId, title: "Entropy Threshold Breach" }, { label: "Containment fracture detected" }, pressureBefore, captureDecisionSnapshot(civ));
            this.post(`ENTROPY THRESHOLD: ${Math.trunc(civ.tactical.entropy)} // containment crisis queued.`);
            this.save();
        }
        const newEra = eraForYears(civ.years);
        if (newEra !== civ.era)
            this.enterEra(civ, newEra);
        const s = civ.stats;
        civ.development +=
            developmentGrowthPerSecond(civ, this.upgradeLevel("axiom", "axiom_paradox_food")) * dt;
        // Every stat moves at the rate stat-drift.ts states; the tick only integrates it over the frame.
        const drift = statDrift(civ, b);
        s.stability -= drift.stabilityDecay * dt;
        s.awareness += drift.awarenessGain * dt;
        s.attention += drift.attentionGain * dt;
        s.sanity -= drift.sanityLoss * dt;
        clampStats(civ);
        for (const m of Progression.recordCivilizationProgress(this.state, civ))
            this.post(m);
        if (civ.terminal)
            this.refreshConvergenceMilestones();
        if (s.stability <= 0) {
            this.harvest(true);
            return;
        }
        civ.eventTimer -= dt;
        if (civ.eventTimer <= 0) {
            this.tickEmitAccumulator = 0;
            this.presentNextEvent(civ);
            return;
        }
        if (this.tickEmitAccumulator + 1e-9 >= 0.5) {
            this.tickEmitAccumulator %= 0.5;
            this.emit();
        }
    }
    previewEventChoiceEffects(choice) {
        const civ = this.state.civilization;
        if (!civ)
            return {};
        const effects = structuredClone(CivilizationPaths.mergedChoiceEffects(civ, choice));
        const b = this.runtimeBonuses();
        for (const key of ["stability", "awareness", "sanity", "attention"]) {
            if (effects[key] == null)
                continue;
            let amount = Number(effects[key]);
            if (key === "stability" && amount < 0)
                amount *= b.stabilityLossMult;
            else if (key === "awareness" && amount > 0)
                amount *= b.awarenessGainMult;
            else if (key === "sanity" && amount < 0)
                amount *= b.sanityLossMult;
            else if (key === "attention" && amount > 0)
                amount *= b.attentionGainMult;
            effects[key] = amount;
        }
        return effects;
    }
    developmentRate() {
        const civ = this.state.civilization;
        if (!civ)
            return 0;
        return developmentGrowthPerSecond(civ, this.upgradeLevel("axiom", "axiom_paradox_food"));
    }
    pressureYears() {
        const civ = this.state.civilization;
        return civ ? pressureYears(civ) : 0;
    }
    previewHarvestDetails(chaotic = false) {
        const civ = this.state.civilization;
        if (!civ)
            return {
                grade: "premature",
                multiplier: 0.2,
                credits: 0,
                depth: 0,
                rewardMultiplier: 0.2,
                objectiveCompleted: false,
                rewards: { causal_mass: 0, cognition: 0, paradox: 0, existence: 0 },
            };
        const bonuses = this.runtimeBonuses();
        const quality = evaluateHarvestQuality(civ, chaotic);
        const objectiveCompleted = quality.grade !== "premature" && evaluateDirectiveObjective(civ);
        const applied = applyHarvestQuality(calculateHarvest(civ, chaotic, bonuses), quality, {
            collapsed: chaotic,
            gradeRewardMult: bonuses.gradeRewardMult,
            objectiveMultiplier: objectiveCompleted ? 1.15 : 1,
        });
        return {
            ...quality,
            credits: calculateCultivationCredits(quality, chaotic, objectiveCompleted),
            objectiveCompleted,
            ...applied,
        };
    }
    previewHarvest(chaotic = false) {
        return this.previewHarvestDetails(chaotic).rewards;
    }
    returnToMachineWithoutReward() {
        const priorSeed = this.state.civilization?.seed ??
            this.state.machine.runBuild.nextCivilizationSeed;
        this.state.civilization = null;
        this.state.phase = "machine";
        this.state.simulationSpeed = 1;
        this.decisionFeedback = null;
        this.worldImpulse = null;
        this.prepareNextRun(mixSeed(priorSeed + 1), false);
        this.save();
        this.emit();
    }
    currentEvent() {
        const civ = this.state.civilization;
        return civ?.pendingEvent ? this.eventById(civ.pendingEvent) : null;
    }
    forceEvent(id) {
        const civ = this.state.civilization;
        const e = this.eventById(id);
        if (!civ || !e)
            return false;
        this.decisionFeedback = null;
        this.lastActionFailure = "";
        civ.tactical.probedEventId = "";
        civ.pendingEvent = id;
        civ.eventTimer = 0;
        recordRecentIntervention(civ, id);
        CivilizationPaths.recordSelectedEvent(civ, e);
        this.save();
        this.emit();
        return true;
    }
    runInterventions() {
        const civ = this.state.civilization;
        const depth = civ ? cultivationDepth(civ) : 0;
        return RUN_INTERVENTIONS.map((definition) => {
            const uses = civ ? runInterventionUses(civ, definition.id) : 0;
            const cost = runInterventionCost(definition, uses, depth);
            const usesLeft = Math.max(0, definition.maxUses - uses);
            let enabled = true, reason = "";
            if (!civ) {
                enabled = false;
                reason = "Start a civilization first.";
            }
            else if (this.machineInsight() < definition.insight) {
                enabled = false;
                reason = `Requires Machine Insight ${definition.insight}.`;
            }
            else if (usesLeft <= 0) {
                enabled = false;
                reason = `${definition.title} is exhausted for this civilization.`;
            }
            else if (this.currencyAmount(definition.currency) < cost) {
                enabled = false;
                reason = `Requires ${cost} ${definition.currency.replaceAll("_", " ")}.`;
            }
            return { ...definition, cost, uses, usesLeft, enabled, reason };
        });
    }
    useRunIntervention(id) {
        const civ = this.state.civilization;
        const view = this.runInterventions().find((entry) => entry.id === id);
        if (!civ || !view) {
            this.lastActionFailure = "Unknown machine intervention.";
            this.emit();
            return false;
        }
        if (!view.enabled) {
            this.lastActionFailure = view.reason;
            this.emit();
            return false;
        }
        const definition = runInterventionById(id);
        const before = captureDecisionSnapshot(civ);
        this.spendCurrency(definition.currency, view.cost);
        const label = applyRunIntervention(civ, definition);
        const newEra = eraForYears(civ.years);
        if (newEra !== civ.era)
            this.enterEra(civ, newEra);
        clampStats(civ);
        this.lastActionFailure = "";
        const feedback = buildDecisionFeedback(++this.feedbackSequence, { id: `reserve:${id}`, title: definition.title }, { label }, before, captureDecisionSnapshot(civ));
        this.publishCompletedDecision(civ, feedback);
        this.appendHistory(civ, `YEAR ${Math.trunc(civ.years)}: Machine reserve -> ${label}`);
        this.post(`MACHINE RESERVE COMMITTED: ${definition.title} for ${view.cost} ${definition.currency.replaceAll("_", " ")}.`);
        this.save();
        this.emit();
        return true;
    }
    useTacticalAction(id) {
        const civ = this.state.civilization;
        if (!civ) {
            this.lastActionFailure = "Start a civilization first.";
            this.emit();
            return false;
        }
        const availability = tacticalAvailability(civ, id);
        if (!availability.enabled) {
            this.lastActionFailure = availability.reason;
            this.emit();
            return false;
        }
        const before = captureDecisionSnapshot(civ);
        const outcome = applyTacticalAction(civ, id, this.runtimeBonuses());
        if (!outcome) {
            this.lastActionFailure = "The tactical action could not be resolved.";
            this.emit();
            return false;
        }
        const newEra = eraForYears(civ.years);
        if (newEra !== civ.era)
            this.enterEra(civ, newEra);
        const dominant = CivilizationPaths.resolveDominance(civ);
        if (dominant) {
            this.recordDominantPath(dominant);
            this.post(`DOMINANT CIVILIZATION PATH: ${CivilizationPaths.displayName(dominant).toUpperCase()}`);
        }
        this.lastActionFailure = "";
        const feedback = buildDecisionFeedback(++this.feedbackSequence, { id: `tactical:${id}`, title: outcome.title }, { label: outcome.label }, before, captureDecisionSnapshot(civ));
        this.publishCompletedDecision(civ, feedback, id === "stabilize");
        this.appendHistory(civ, `YEAR ${Math.trunc(civ.years)}: Tactical action -> ${outcome.label}`);
        if (civ.stats.stability <= 0) {
            this.harvest(true);
            return true;
        }
        this.save();
        this.emit();
        return true;
    }
    chooseEvent(index) {
        const civ = this.state.civilization, event = this.currentEvent();
        if (!civ || !event)
            return false;
        const choice = event.choices?.[index];
        if (!choice)
            return false;
        const before = captureDecisionSnapshot(civ);
        applyEffects(civ, this.previewEventChoiceEffects(choice), false, this.runtimeBonuses());
        const pr = CivilizationPaths.applyChoice(civ, event, choice);
        if (pr.newDominantPath) {
            this.recordDominantPath(pr.newDominantPath);
            applyEffects(civ, CivilizationPaths.dominanceEffects(pr.newDominantPath), false, this.runtimeBonuses());
            const succeeded = CivilizationPaths.ensure(civ).successions > 0;
            const pathName = CivilizationPaths.displayName(pr.newDominantPath);
            this.appendHistory(civ, `YEAR ${Math.trunc(civ.years)}: ${pathName} ${succeeded ? "succeeded the previous dominant civilization path" : "became the dominant civilization path"}.`);
            this.post(`${succeeded ? "PATH SUCCESSION" : "DOMINANT CIVILIZATION PATH"}: ${pathName.toUpperCase()}`);
        }
        if (pr.history)
            this.appendHistory(civ, `YEAR ${Math.trunc(civ.years)}: ${pr.history}`);
        if (pr.endgameState)
            this.appendHistory(civ, `YEAR ${Math.trunc(civ.years)}: Civilization reached path end-state ${pr.endgameState.replace("endgame_", "").replaceAll("_", " ")}.`);
        civ.eventCounts[event.id] = (civ.eventCounts[event.id] ?? 0) + 1;
        civ.eventChoices++;
        civ.lastEvent = event.id;
        if (choice.follow_up)
            civ.scheduledEvents.push(choice.follow_up);
        this.appendHistory(civ, `YEAR ${Math.trunc(civ.years)}: ${event.title} -> ${choice.label}`);
        civ.pendingEvent = "";
        civ.tactical.probedEventId = "";
        civ.tactical.controlCapacity = Math.min(3, civ.tactical.controlCapacity +
            Math.max(1, Math.trunc(this.runtimeBonuses().controlRecharge)));
        civ.eventTimer = this.rollEventDelay(civ);
        clampStats(civ);
        const feedback = buildDecisionFeedback(++this.feedbackSequence, event, choice, before, captureDecisionSnapshot(civ));
        this.publishCompletedDecision(civ, feedback);
        if (civ.stats.stability <= 0) {
            this.harvest(true);
            return true;
        }
        this.save();
        this.emit();
        return true;
    }
    rerollEvent() {
        const level = this.upgradeLevel("axiom", "axiom_multiple_choice"), civ = this.state.civilization;
        if (level <= 0 || !civ?.pendingEvent)
            return false;
        const cost = Math.max(2, 10 - level * 2);
        if (this.state.machine.currencies.paradox < cost)
            return false;
        this.state.machine.currencies.paradox -= cost;
        civ.lastEvent = civ.pendingEvent;
        civ.pendingEvent = "";
        civ.tactical.probedEventId = "";
        this.presentNextEvent(civ);
        this.post(`Reality rewound at a cost of ${cost} Paradox.`);
        this.save();
        this.emit();
        return true;
    }
    recordRunStatistics(civ, details) {
        const p = this.state.meta.progression;
        p.maxDevelopment = Math.max(p.maxDevelopment, civ.development);
        p.maxEra = Math.max(p.maxEra, civ.era);
        p.longestRunSeconds = Math.max(p.longestRunSeconds, civ.elapsedSeconds);
        p.maxEndgamesInRun = Math.max(p.maxEndgamesInRun, civ.pathState.endgameStates.length);
        p.bestDepth = Math.max(p.bestDepth, details.depth);
        if (gradeIndex(details.grade) > gradeIndex(p.bestGrade))
            p.bestGrade = details.grade;
        if (details.objectiveCompleted)
            p.objectivesCompleted++;
    }
    harvest(chaotic = false) {
        const civ = this.state.civilization;
        if (!civ)
            return { causal_mass: 0, cognition: 0, paradox: 0, existence: 0 };
        const details = this.previewHarvestDetails(chaotic);
        if (civ.terminal)
            return this.finishTerminalRun(civ, chaotic, details);
        civ.directiveObjective.completed = details.objectiveCompleted;
        this.recordRunStatistics(civ, details);
        const rewards = details.rewards;
        for (const k of RESOURCE_KEYS)
            this.state.machine.currencies[k] += rewards[k];
        let mutationId = "";
        if (chaotic && this.mutations.length) {
            const rng = new SeededRng(civ.rngState);
            mutationId = this.mutations[rng.int(0, this.mutations.length - 1)].id;
            civ.rngState = rng.state;
            if (!this.state.machine.activeMutations.includes(mutationId))
                this.state.machine.activeMutations.push(mutationId);
        }
        this.state.machine.civilizationsTotal++;
        this.state.machine.civilizationsThisUniverse++;
        this.state.machine.cultivationCreditsThisUniverse += details.credits;
        const record = {
            chaotic,
            rewards: { ...rewards },
            mutation_id: mutationId,
            seed: civ.seed,
            years: Math.trunc(civ.years),
            era: civ.era,
            development: civ.development,
            traits: [...civ.traits],
            directive_id: civ.directiveId,
            grade: details.grade,
            depth: details.depth,
            credits: details.credits,
            objective_completed: details.objectiveCompleted,
            reward_multiplier: details.rewardMultiplier,
        };
        this.state.machine.lastHarvest = record;
        for (const m of Progression.recordHarvest(this.state, record))
            this.post(m);
        this.refreshConvergenceMilestones();
        this.state.civilization = null;
        this.state.phase = "machine";
        this.state.simulationSpeed = 1;
        this.decisionFeedback = null;
        this.worldImpulse = null;
        this.prepareNextRun(mixSeed(civ.seed + this.state.machine.civilizationsTotal), false);
        this.post(`${chaotic ? "CHAOTIC" : "CONTROLLED"} ${details.grade.toUpperCase()} HARVEST complete. +${details.credits} Cultivation Credits.`);
        if (details.objectiveCompleted)
            this.post("DIRECTIVE OBJECTIVE COMPLETE: rewards ×1.15 and +1 Cultivation Credit.");
        this.post(`Yield: Causal ${rewards.causal_mass}, Cognition ${rewards.cognition}, Paradox ${rewards.paradox}, Existence ${rewards.existence}.`);
        if (mutationId)
            this.post(`Machine mutation acquired: ${this.mutations.find((x) => x.id === mutationId)?.name ?? mutationId}.`);
        this.save();
        this.emit();
        return rewards;
    }
    finishTerminalRun(civ, chaotic, details) {
        const zero = { causal_mass: 0, cognition: 0, paradox: 0, existence: 0 };
        this.recordRunStatistics(civ, details);
        this.state.machine.civilizationsTotal++;
        const outcome = evaluateConvergence(details.depth, chaotic, this.state.meta.convergences);
        this.state.machine.lastHarvest = {
            chaotic,
            rewards: { ...zero },
            terminal: true,
            seed: civ.seed,
            years: Math.trunc(civ.years),
            era: civ.era,
            development: civ.development,
            grade: details.grade,
            depth: details.depth,
            credits: 0,
            reward_multiplier: 0,
            outcome,
        };
        if (outcome === "won") {
            const record = {
                convergence: this.state.meta.convergences + 1,
                seed: civ.seed,
                years: Math.trunc(civ.years),
                era: civ.era,
                depth: details.depth,
                development: civ.development,
                dominantPath: civ.pathState.dominantPath,
                endgameStates: [...civ.pathState.endgameStates],
            };
            this.state.meta.convergences++;
            this.state.meta.victories.unshift(record);
            this.state.meta.victories = this.state.meta.victories.slice(0, 5);
            this.post(`GREAT CONVERGENCE ${record.convergence} ACHIEVED at Cultivation Depth ${details.depth.toFixed(1)}.`);
        }
        else
            this.post(`CONVERGENCE FAILED at Cultivation Depth ${details.depth.toFixed(1)}. Authorization retained.`);
        this.state.civilization = null;
        this.state.simulationSpeed = 1;
        this.decisionFeedback = null;
        this.worldImpulse = null;
        this.state.phase = outcome === "won" ? "victory" : "machine";
        if (outcome !== "won")
            this.prepareNextRun(mixSeed(civ.seed + this.state.machine.civilizationsTotal), false);
        this.refreshConvergenceMilestones();
        this.save();
        this.emit();
        return zero;
    }
    canConsumeUniverse() {
        return (this.state.phase === "machine" &&
            this.state.machine.cultivationCreditsThisUniverse >= 18 &&
            this.systemUnlocked("universe_prestige"));
    }
    consumeUniverse() {
        if (!this.canConsumeUniverse())
            return false;
        const bank = RESOURCE_KEYS.reduce((s, k) => s + this.state.machine.currencies[k], 0);
        const award = universeResidueAward(this.state.machine.cultivationCreditsThisUniverse, bank, 1 + 0.2 * this.upgradeLevel("universe", "residue_refinery"));
        this.state.meta.universalResidue += award;
        this.state.meta.universesTotal++;
        this.state.meta.universesThisMultiverse++;
        for (const m of Progression.recordUniverse(this.state))
            this.post(m);
        this.resetMachineLayer();
        this.post(`UNIVERSE CONSUMED. ${award} Universal Residue recovered.`);
        this.refreshConvergenceMilestones();
        this.save();
        this.emit();
        return true;
    }
    canConsumeMultiverse() {
        return (this.state.phase === "machine" &&
            this.state.meta.universesThisMultiverse >= 4 &&
            this.systemUnlocked("multiverse_prestige"));
    }
    consumeMultiverse() {
        if (!this.canConsumeMultiverse())
            return false;
        const totalLevels = Object.values(this.state.meta.universeUpgradeLevels).reduce((a, b) => a + Number(b), 0);
        const award = multiverseAxiomAward(this.state.meta.universesThisMultiverse, totalLevels);
        this.state.meta.axioms += award;
        this.state.meta.multiversesConsumed++;
        for (const m of Progression.recordMultiverse(this.state))
            this.post(m);
        this.state.meta.universalResidue = 0;
        this.state.meta.universeUpgradeLevels = {};
        this.state.meta.universesThisMultiverse = 0;
        this.resetMachineLayer();
        this.post(`MULTIVERSE COLLAPSED. ${award} Axiom units extracted.`);
        this.refreshConvergenceMilestones();
        this.save();
        this.emit();
        return true;
    }
    convergenceInput() {
        const axioms = this.catalog("axiom").map((definition) => ({
            id: String(definition.id),
            level: this.upgradeLevel("axiom", String(definition.id)),
            maxLevel: Number(definition.max_level),
        }));
        return {
            milestonesCompleted: completedMilestoneCount(this.state),
            milestonesTotal: MILESTONE_CATALOG.length,
            multiverses: this.state.meta.multiversesConsumed,
            axioms,
            bestGradeIndex: gradeIndex(this.state.meta.progression.bestGrade),
            convergences: this.state.meta.convergences,
        };
    }
    convergenceRequirements() {
        return convergenceRequirements(this.convergenceInput());
    }
    convergenceUnlocked() {
        return convergenceUnlocked(this.convergenceInput());
    }
    convergenceTargetDepth() {
        return convergenceTargets(this.state.meta.convergences).depth;
    }
    lastVictory() {
        return this.state.meta.victories[0] ?? null;
    }
    refreshConvergenceMilestones() {
        for (const m of Progression.recordMilestones(this.state, this.convergenceUnlocked()))
            this.post(m);
    }
    startConvergenceRun(requestedSeed = 0) {
        if (this.state.phase === "machine")
            this.refreshConvergenceMilestones();
        if (this.state.phase !== "machine" || !this.convergenceUnlocked()) {
            this.lastActionFailure = "The Great Convergence is not authorized.";
            this.emit();
            return false;
        }
        if (!this.startCivilization(requestedSeed, true))
            return false;
        this.post("GREAT CONVERGENCE INITIATED. Terminal cultivation begins in APOTHEOSIS.");
        this.save();
        this.emit();
        return true;
    }
    acknowledgeVictory() {
        if (this.state.phase !== "victory")
            return false;
        this.state.phase = "machine";
        this.prepareNextRun(mixSeed(this.state.meta.convergences * 7919 + 13), false);
        this.save();
        this.emit();
        return true;
    }
    maxSimulationSpeed() {
        const x = this.upgradeLevel("machine", "temporal_injector");
        return x >= 3 ? 4 : x >= 1 ? 2 : 1;
    }
    setSimulationSpeed(n) {
        this.state.simulationSpeed = Math.max(1, Math.min(this.maxSimulationSpeed(), Math.trunc(n)));
        this.save();
        this.emit();
    }
    resetMachineLayer() {
        const inheritedLattice = Math.min(this.upgradeLevel("machine", "reality_lattice"), this.upgradeLevel("universe", "wide_lattice"));
        this.state.machine.currencies = {
            causal_mass: 0,
            cognition: 0,
            paradox: 0,
            existence: 0,
        };
        this.state.machine.upgradeLevels =
            inheritedLattice > 0 ? { reality_lattice: inheritedLattice } : {};
        this.state.machine.activeMutations = [];
        this.state.machine.civilizationsThisUniverse = 0;
        this.state.machine.cultivationCreditsThisUniverse = 0;
        this.state.machine.lastHarvest = {};
        this.state.machine.runBuild = {
            selectedDirective: "",
            selectedBreedingMatrix: "",
            directiveLocked: false,
            matrixLocked: false,
            directiveOfferIds: [],
            nextCivilizationSeed: 0,
            previewTraitIds: [],
        };
        this.state.civilization = null;
        this.state.phase = "machine";
        this.state.simulationSpeed = 1;
        this.decisionFeedback = null;
        this.worldImpulse = null;
        this.prepareNextRun(0, false);
    }
    presentNextEvent(civ) {
        this.decisionFeedback = null;
        this.lastActionFailure = "";
        civ.tactical.probedEventId = "";
        const e = this.selectEvent(civ) ?? this.eventById("routine_compliance_audit");
        if (!e)
            return;
        civ.pendingEvent = e.id;
        civ.eventTimer = 0;
        this.save();
        this.emit();
    }
    selectEvent(civ) {
        if (civ.scheduledEvents.length) {
            const id = civ.scheduledEvents.shift();
            const scheduled = this.eventById(id);
            if (scheduled) {
                recordRecentIntervention(civ, scheduled.id);
                CivilizationPaths.recordSelectedEvent(civ, scheduled);
                return scheduled;
            }
        }
        const eligible = this.events.filter((event) => this.eventEligible(event, civ));
        const stateMultiplier = (event) => {
            const s = civ.stats, id = event.id;
            let weight = 1;
            if (s.sanity < 50 &&
                [
                    "first_machine_cult",
                    "probability_strike",
                    "ministry_of_sanity",
                    "reality_unionizes",
                ].includes(id))
                weight *= 1.8;
            if (s.attention > 50 &&
                ["entity_audit", "cosmic_predator", "sky_inventory"].includes(id))
                weight *= 2;
            if (s.awareness > 50 &&
                ["machine_signal", "civilization_resists", "final_question"].includes(id))
                weight *= 2;
            if (s.stability < 45 &&
                [
                    "sun_goes_missing",
                    "reality_unionizes",
                    "edge_of_simulation",
                ].includes(id))
                weight *= 2;
            return weight;
        };
        const pool = buildInterventionPool(eligible, civ, {
            pathMultiplier: (event) => CivilizationPaths.eventWeightMultiplier(event, civ),
            stateMultiplier,
            exhausted: (event) => interventionExhausted(event, civ),
        });
        const rng = new SeededRng(civ.rngState);
        const selected = chooseWeightedIntervention(pool, rng.next()) ??
            this.eventById("routine_compliance_audit");
        civ.rngState = rng.state;
        if (selected) {
            recordRecentIntervention(civ, selected.id);
            CivilizationPaths.recordSelectedEvent(civ, selected);
        }
        return selected;
    }
    eventEligible(e, civ) {
        if (civ.era < Number(e.min_era ?? 0) || civ.era > Number(e.max_era ?? 2))
            return false;
        const r = e.requirements ?? {};
        if (r.scheduled_only)
            return false;
        if (!CivilizationPaths.eventIsEligible(e, civ))
            return false;
        const s = civ.stats;
        if (r.min_attention != null && s.attention < Number(r.min_attention))
            return false;
        if (r.max_attention != null && s.attention > Number(r.max_attention))
            return false;
        if (r.min_awareness != null && s.awareness < Number(r.min_awareness))
            return false;
        if (r.max_awareness != null && s.awareness > Number(r.max_awareness))
            return false;
        if (r.max_sanity != null && s.sanity > Number(r.max_sanity))
            return false;
        if (r.min_sanity != null && s.sanity < Number(r.min_sanity))
            return false;
        if (r.max_stability != null && s.stability > Number(r.max_stability))
            return false;
        if (r.requires_trait && !civ.traits.includes(String(r.requires_trait)))
            return false;
        if (r.requires_flag && !civ.flags.includes(String(r.requires_flag)))
            return false;
        if (r.required_institution &&
            !civ.institutions.includes(String(r.required_institution)))
            return false;
        if (r.excluded_flag && civ.flags.includes(String(r.excluded_flag)))
            return false;
        if (r.min_development != null &&
            civ.development < Number(r.min_development))
            return false;
        return true;
    }
    rollEventDelay(civ) {
        const rng = new SeededRng(civ.rngState);
        const window = eventDelayWindow(civ);
        const d = rng.range(window.min, window.max) + civ.eventDelayBonus;
        civ.rngState = rng.state;
        return Math.max(5, d);
    }
    buildTraitSelection(seed) {
        const rng = new SeededRng(seed);
        const bonuses = this.runtimeBonuses();
        const allowed = this.traits
            .filter((t) => !t.impossible ||
            this.upgradeLevel("axiom", "axiom_impossible_birth") > 0)
            .slice();
        const count = Math.min(allowed.length, 2 + Math.trunc(bonuses.extraTraits));
        const ids = [];
        let biasSet = undefined;
        const matrixId = this.state.machine.runBuild.selectedBreedingMatrix;
        if (matrixId) {
            const matrix = this.matrices.find((x) => x.id === matrixId);
            if (matrix?.effects?.trait_bias) {
                biasSet = new Set(matrix.effects.trait_bias);
            }
        }
        for (let i = 0; i < count; i++) {
            const total = allowed.reduce((sum, trait) => sum + this.traitWeight(trait.id, biasSet), 0);
            const roll = rng.range(0, total);
            let cursor = 0, pick = allowed.length - 1;
            for (let j = 0; j < allowed.length; j++) {
                cursor += this.traitWeight(allowed[j].id, biasSet);
                if (roll <= cursor) {
                    pick = j;
                    break;
                }
            }
            const [trait] = allowed.splice(pick, 1);
            ids.push(trait.id);
        }
        return { ids, rngState: rng.state };
    }
    enterEra(civ, newEra) {
        civ.era = newEra;
        civ.tactical.controlCapacity = Math.min(3, civ.tactical.controlCapacity + 1);
        this.appendHistory(civ, `YEAR ${Math.trunc(civ.years)}: Civilization enters ${ERA_NAMES[newEra]}.`);
        this.post(`Civilization entered ${ERA_NAMES[newEra]}. Control Capacity +1.`);
    }
    appendHistory(civ, msg) {
        civ.history.unshift(msg);
        civ.history = civ.history.slice(0, 80);
    }
}
//# sourceMappingURL=engine.js.map