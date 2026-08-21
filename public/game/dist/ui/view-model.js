import { CivilizationPaths } from '../game/paths.js';
import { milestoneProgress } from '../game/milestones.js';
import { factionProfile, speciesProfile } from '../game/lore.js';
import { objectiveForDirective } from '../game/run-directives.js';
import { entropyRate, pressureMultiplier, pressureYears, secondsToCascade } from '../game/pressure.js';
import { DEPTH_BANDS, DEPTH_YIELD_BASE, DEPTH_YIELD_RATE, HARVEST_GRADE_LABELS, cultivationDepth, depthBand, harvestUrgency } from '../game/harvest-quality.js';
import { TACTICAL_ACTIONS, VENT_ENTROPY_RELIEF, VENT_STABILITY_COST, tacticalRisk } from '../game/tactical-actions.js';
import { civilizationSituation, machineSituation } from '../game/guidance.js';
import { ERA_NAMES } from '../game/engine.js';
// The prestige threshold, in one place: the meta bar prints it, the situation line quotes it, and a
// player comparing the two must not be shown two different numbers.
const UNIVERSE_CREDIT_REQUIREMENT = 18;
const RESOURCE_NAMES = {
    causal_mass: 'Causal Mass', cognition: 'Cognition', paradox: 'Paradox', existence: 'Existence', universal_residue: 'Universal Residue', axioms: 'Axioms'
};
const EFFECT_LABELS = {
    stability: 'Stability', awareness: 'Awareness', sanity: 'Sanity', attention: 'Attention',
    development: 'Development', entropy: 'Entropy', stability_max: 'Maximum Stability',
};
function amountLabel(value) {
    const rounded = Math.round(value * 10) / 10;
    return `${rounded > 0 ? '+' : ''}${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}`;
}
function riskVector(effects, precisionLevel) {
    const vectors = Object.entries(effects).filter(([key, value]) => key in EFFECT_LABELS && Number(value) !== 0).map(([key, value]) => {
        const amount = Number(value);
        if (precisionLevel >= 5)
            return `${EFFECT_LABELS[key]} ${amountLabel(amount)}`;
        if (precisionLevel >= 2) {
            const spread = precisionLevel === 2 ? 3 : precisionLevel === 3 ? 2 : 1;
            const lower = amount > 0 ? Math.max(.1, amount - spread) : amount - spread;
            const upper = amount < 0 ? Math.min(-.1, amount + spread) : amount + spread;
            return `${EFFECT_LABELS[key]} range ${amountLabel(lower)} to ${amountLabel(upper)}`;
        }
        return `${EFFECT_LABELS[key]} ${amount > 0 ? '↑' : '↓'}`;
    });
    return vectors.length ? vectors.join(' · ') : 'No direct metric vector detected';
}
function entropyBand(value) {
    if (value >= 100)
        return { index: 4, id: 'cascade', label: 'CASCADE' };
    if (value >= 75)
        return { index: 3, id: 'critical', label: 'CRITICAL' };
    if (value >= 50)
        return { index: 2, id: 'fractured', label: 'FRACTURED' };
    if (value >= 25)
        return { index: 1, id: 'strained', label: 'STRAINED' };
    return { index: 0, id: 'contained', label: 'CONTAINED' };
}
// How far the run has travelled inside its current depth band, as a percentage. The tactical rail
// draws it as a meter next to the Entropy meter, so the two competing clocks -- how much time is
// left and how much yield is still coming -- are read side by side.
function depthBandProgress(depth) {
    const current = [...DEPTH_BANDS].reverse().find(band => depth >= band.minDepth) ?? DEPTH_BANDS[0];
    const upcoming = DEPTH_BANDS.find(band => band.minDepth > depth);
    if (!upcoming)
        return 100;
    const span = upcoming.minDepth - current.minDepth;
    return span <= 0 ? 100 : Math.max(0, Math.min(100, (depth - current.minDepth) / span * 100));
}
// The stay-or-harvest decision is a blind guess without a forecast, so the view model carries the
// next band the run can reach and what it is worth.
function nextDepthBand(depth) {
    const upcoming = DEPTH_BANDS.find(band => band.minDepth > depth);
    if (!upcoming)
        return null;
    return {
        grade: upcoming.grade,
        label: HARVEST_GRADE_LABELS[upcoming.grade],
        depthNeeded: upcoming.minDepth,
        yieldMultiplier: DEPTH_YIELD_BASE + DEPTH_YIELD_RATE * upcoming.minDepth,
    };
}
function buildResourcesViewModel(engine) {
    const state = engine.state;
    return engine.visibleResources().map(id => ({
        id,
        name: RESOURCE_NAMES[id] ?? id,
        amount: id === 'universal_residue' ? state.meta.universalResidue : id === 'axioms' ? state.meta.axioms : state.machine.currencies[id] ?? 0,
    }));
}
function buildConvergenceViewModel(engine) {
    const state = engine.state;
    const convergenceIsUnlocked = engine.convergenceUnlocked();
    const convergenceEntries = engine.convergenceRequirements();
    const convergenceTargetDepth = engine.convergenceTargetDepth();
    const openRequirement = convergenceEntries.find(entry => !entry.met);
    return {
        visible: state.meta.multiversesConsumed >= 1,
        unlocked: convergenceIsUnlocked,
        requirements: convergenceEntries,
        targetDepth: convergenceTargetDepth,
        convergences: state.meta.convergences,
        reason: openRequirement ? `${openRequirement.label}: ${openRequirement.current}/${openRequirement.target}` : 'All requirements met.',
    };
}
function buildEventViewModel(engine, civ, event, probed, predictionsUnlocked) {
    if (!event)
        return null;
    return {
        id: event.id,
        title: event.title,
        body: event.body,
        predictionLocked: !predictionsUnlocked && !probed,
        probed,
        choices: (event.choices ?? []).map((choice, index) => {
            const vector = probed ? riskVector(engine.previewEventChoiceEffects(choice), civ?.predictionLevel ?? 0) : '';
            return {
                index,
                label: choice.label,
                prediction: predictionsUnlocked
                    ? `${choice.prediction}${probed ? ` Probe vector: ${vector}.` : ''}`
                    : probed ? `Probe vector: ${vector}.` : '',
            };
        }),
    };
}
function buildTacticalViewModel(engine, civ, bonuses) {
    if (!civ)
        return null;
    return {
        entropy: civ.tactical.entropy,
        entropyBand: entropyBand(civ.tactical.entropy),
        entropyRate: entropyRate(pressureYears(civ), bonuses.containmentRating, civ.terminal),
        pressureMultiplier: pressureMultiplier(pressureYears(civ)),
        secondsToCascade: secondsToCascade(pressureYears(civ), civ.tactical.entropy, bonuses.containmentRating, civ.terminal),
        controlCapacity: civ.tactical.controlCapacity,
        controlMax: 3,
        containmentRating: bonuses.containmentRating,
        actions: Object.keys(TACTICAL_ACTIONS).map(id => ({
            ...TACTICAL_ACTIONS[id],
            risk: tacticalRisk(civ, id),
            ...engine.tacticalAvailability(id),
        })),
    };
}
function buildHarvestViewModel(engine, civ, controlledHarvest, chaoticHarvest, bonuses, convergenceTargetDepth) {
    if (!civ)
        return null;
    return {
        controlled: controlledHarvest,
        chaotic: chaoticHarvest,
        depth: cultivationDepth(civ),
        depthBand: depthBand(cultivationDepth(civ)),
        bandProgress: depthBandProgress(cultivationDepth(civ)),
        nextBand: nextDepthBand(cultivationDepth(civ)),
        urgency: harvestUrgency({
            depth: cultivationDepth(civ),
            credits: controlledHarvest?.credits ?? 0,
            developmentRate: engine.developmentRate(),
            secondsToCascade: secondsToCascade(pressureYears(civ), civ.tactical.entropy, bonuses.containmentRating, civ.terminal),
            entropyRate: entropyRate(pressureYears(civ), bonuses.containmentRating, civ.terminal),
            stability: civ.stats.stability,
            controlCapacity: civ.tactical.controlCapacity,
            ventEntropyRelief: VENT_ENTROPY_RELIEF,
            ventStabilityCost: VENT_STABILITY_COST,
            entropy: civ.tactical.entropy,
            premature: controlledHarvest?.grade === 'premature',
        }),
        convergenceReady: Boolean(civ.terminal) && cultivationDepth(civ) >= convergenceTargetDepth,
    };
}
// The live "what is happening and why" line. Everything it needs was already computed for the rails
// above, so building it costs a function call rather than a second pass over the run.
function buildSituation(engine, civ, tactical, harvest, event, objective, convergenceTargetDepth, machine) {
    if (!civ || !tactical || !harvest)
        return machineSituation(machine);
    return civilizationSituation({
        pendingEventTitle: event?.title ?? '',
        entropy: tactical.entropy,
        secondsToCascade: tactical.secondsToCascade,
        entropyRate: tactical.entropyRate,
        stability: civ.stats.stability,
        stabilityMax: civ.stats.stabilityMax,
        sanity: civ.stats.sanity,
        awareness: civ.stats.awareness,
        attention: civ.stats.attention,
        grade: harvest.controlled?.grade ?? 'premature',
        depth: harvest.depth,
        credits: harvest.controlled?.credits ?? 0,
        urgency: harvest.urgency.state,
        secondsToNextCredit: harvest.urgency.secondsToNextCredit,
        secondsOfRunLeft: harvest.urgency.secondsOfRunLeft,
        controlCapacity: tactical.controlCapacity,
        eventChoices: civ.eventChoices,
        era: civ.era,
        eraName: ERA_NAMES[civ.era] ?? `Era ${civ.era}`,
        development: civ.development,
        terminal: Boolean(civ.terminal),
        convergenceReady: Boolean(harvest.convergenceReady),
        convergenceTargetDepth,
        objectiveTitle: objective?.title ?? '',
        objectiveCompleted: Boolean(objective?.completed),
    });
}
function buildCivilizationViewModel(engine, civ) {
    if (!civ)
        return null;
    return {
        seed: civ.seed,
        terminal: civ.terminal,
        years: civ.years,
        era: civ.era,
        development: civ.development,
        traits: civ.traits.map((id) => ({ id, name: engine.traitById(id)?.name ?? id })),
        institutions: [...civ.institutions],
        flags: [...civ.flags],
        stats: { ...civ.stats },
        path: CivilizationPaths.summary(civ),
        species: speciesProfile(civ),
        faction: factionProfile(civ),
        history: civ.history.slice(0, 30),
        eventTimer: civ.eventTimer,
        directiveId: civ.directiveId,
    };
}
export function buildViewModel(engine) {
    const state = engine.state;
    const civ = state.civilization;
    const event = engine.currentEvent();
    const predictionsUnlocked = Boolean(civ && civ.predictionLevel > 0);
    const probed = Boolean(civ && event && civ.tactical.probedEventId === event.id);
    const bonuses = engine.runtimeBonuses();
    const controlledHarvest = civ ? engine.previewHarvestDetails(false) : null;
    const chaoticHarvest = civ ? engine.previewHarvestDetails(true) : null;
    const activeObjective = civ ? objectiveForDirective(civ.directiveId) : null;
    const directiveRequired = engine.systemUnlocked('directives') && state.machine.runBuild.directiveOfferIds.length > 0;
    const convergenceIsUnlocked = engine.convergenceUnlocked();
    const convergenceTargetDepth = engine.convergenceTargetDepth();
    const milestoneEntries = milestoneProgress(state, convergenceIsUnlocked);
    const machineUpgradeEntries = engine.visibleUpgradeEntries('machine');
    const directiveRequiredNow = directiveRequired && !state.machine.runBuild.selectedDirective;
    const openMilestone = milestoneEntries.find(entry => !entry.completed);
    // Built once and shared with the return below: the situation line reads the same two view models
    // the rails render, so neither can drift from the other and neither is computed twice.
    const tactical = buildTacticalViewModel(engine, civ, bonuses);
    const harvest = buildHarvestViewModel(engine, civ, controlledHarvest, chaoticHarvest, bonuses, convergenceTargetDepth);
    const situation = buildSituation(engine, civ, tactical, harvest, event, activeObjective ? { title: activeObjective.title, completed: Boolean(controlledHarvest?.objectiveCompleted) } : null, convergenceTargetDepth, {
        hasReport: Boolean(state.machine.lastRunReport),
        needsDirective: directiveRequiredNow,
        canStart: !directiveRequiredNow,
        affordableUpgrades: machineUpgradeEntries.filter((entry) => entry.status !== 'locked' && engine.canPurchaseUpgrade('machine', entry.definition.id)).length,
        credits: state.machine.cultivationCreditsThisUniverse,
        creditsRequired: UNIVERSE_CREDIT_REQUIREMENT,
        canConsumeUniverse: engine.canConsumeUniverse(),
        canConsumeMultiverse: engine.canConsumeMultiverse(),
        convergenceUnlocked: convergenceIsUnlocked,
        openMilestone: openMilestone?.title ?? '',
        runsTotal: state.machine.civilizationsTotal,
    });
    return {
        phase: state.phase,
        machineInsight: engine.machineInsight(),
        resources: buildResourcesViewModel(engine),
        simulationSpeed: state.simulationSpeed,
        maxSimulationSpeed: engine.maxSimulationSpeed(),
        civilizationsThisUniverse: state.machine.civilizationsThisUniverse,
        cultivationCreditsThisUniverse: state.machine.cultivationCreditsThisUniverse,
        universeRequirement: UNIVERSE_CREDIT_REQUIREMENT,
        universesThisMultiverse: state.meta.universesThisMultiverse,
        multiverseRequirement: 4,
        previews: engine.nextPreviews(),
        milestones: {
            entries: milestoneEntries,
            completed: milestoneEntries.filter(entry => entry.completed).length,
            total: milestoneEntries.length,
        },
        convergence: buildConvergenceViewModel(engine),
        victory: state.phase === 'victory' ? { record: engine.lastVictory(), convergences: state.meta.convergences } : null,
        runBuild: { ...state.machine.runBuild },
        directives: engine.availableDirectives().map((directive) => ({ ...directive, objective: objectiveForDirective(directive.id) })),
        matrices: engine.availableMatrices(),
        previewTraits: state.machine.runBuild.previewTraitIds.map((id) => ({ id, name: engine.traitById(id)?.name ?? id })),
        canStartCivilization: !directiveRequired || Boolean(state.machine.runBuild.selectedDirective),
        startReason: directiveRequired && !state.machine.runBuild.selectedDirective ? 'Select one offered Directive for this Civilization.' : '',
        machineUpgrades: machineUpgradeEntries,
        universeUpgrades: engine.visibleUpgradeEntries('universe'),
        axiomUpgrades: engine.visibleUpgradeEntries('axiom'),
        canConsumeUniverse: engine.canConsumeUniverse(),
        canConsumeMultiverse: engine.canConsumeMultiverse(),
        systems: {
            directives: engine.systemUnlocked('directives'),
            breedingMatrices: engine.systemUnlocked('breeding_matrices'),
            universePrestige: engine.systemUnlocked('universe_prestige'),
            universeUpgrades: engine.systemUnlocked('universe_upgrades'),
            multiversePrestige: engine.systemUnlocked('multiverse_prestige'),
            axioms: engine.systemUnlocked('axioms'),
        },
        event: buildEventViewModel(engine, civ, event, probed, predictionsUnlocked),
        feedback: engine.decisionFeedback ? structuredClone(engine.decisionFeedback) : null,
        lastActionFailure: engine.lastActionFailure,
        tactical,
        harvest,
        machineReserve: civ ? engine.runInterventions() : [],
        directiveObjective: activeObjective ? {
            id: activeObjective.id,
            title: activeObjective.title,
            description: activeObjective.description,
            completed: Boolean(controlledHarvest?.objectiveCompleted),
        } : null,
        lastHarvest: { ...state.machine.lastHarvest },
        // The post-run account, the guided run and the explain layer. All three are presentation state,
        // and all three are read straight from the engine so a reload resumes exactly where it stopped.
        runReport: state.machine.lastRunReport,
        tutorial: engine.tutorialView(),
        explain: engine.explainMode(),
        situation,
        civilization: buildCivilizationViewModel(engine, civ),
        messages: engine.messages.slice(0, 30),
    };
}
export function civilizationRenderKey(vm) {
    const civilization = vm.civilization;
    if (vm.phase !== 'civilization' || !civilization)
        return vm.phase;
    const cosmicCondition = civilization.stats.attention > 65
        ? 'attention'
        : civilization.stats.awareness > 65
            ? 'awareness'
            : 'stable';
    return [
        vm.phase,
        civilization.seed,
        civilization.terminal ? 'terminal' : 'normal',
        vm.harvest?.convergenceReady ? 'convergence-ready' : 'convergence-open',
        civilization.era,
        vm.event?.id ?? 'monitoring',
        civilization.path.dominantId ?? '',
        civilization.path.endgameState ?? '',
        civilization.stats.stability < 25 ? 'danger' : 'normal',
        cosmicCondition,
        vm.simulationSpeed,
        vm.maxSimulationSpeed,
        civilization.traits.map((trait) => trait.id).join(','),
        civilization.institutions.join(','),
        vm.feedback?.sequence ?? 0,
        vm.tactical?.entropyBand.index ?? 0,
        vm.tactical?.controlCapacity ?? 0,
        vm.directiveObjective?.completed ? 'objective-complete' : 'objective-open',
        vm.harvest?.controlled?.grade ?? '',
        vm.harvest?.depthBand ?? '',
        // Bands and interventions only: the tutorial step and the explain toggle are discrete states, so
        // neither can rebuild the panel on a ticking number. The situation id deliberately stays out --
        // it is selected in part by the harvest call, whose two sides both move continuously, so banding
        // on it would rebuild the column while a run sat on that boundary. It rides the live refresh.
        vm.tutorial.step?.id ?? '',
        vm.tutorial.collapsed ? 'coach-collapsed' : 'coach-open',
        vm.explain ? 'explain' : 'plain',
        vm.machineReserve.map(entry => (entry.enabled ? '1' : '0')).join(''),
        vm.lastActionFailure,
    ].join('|');
}
//# sourceMappingURL=view-model.js.map