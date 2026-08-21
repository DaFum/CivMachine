const round = (value) => `${Math.round(Number.isFinite(value) ? value : 0)}`;
const one = (value) => (Number.isFinite(value) ? value : 0).toFixed(1);
const seconds = (value) => (Number.isFinite(value) ? `${Math.max(0, Math.round(value))}s` : 'no limit');
export function civilizationSituation(input) {
    if (input.entropy >= 100) {
        return {
            id: 'cascade',
            severity: 'critical',
            headline: 'Entropy has cascaded. The run is being taken from you.',
            cause: `Entropy reached 100, so Stability is now decaying at a fixed fraction of its maximum on top of everything else.`,
            advice: 'Harvest now. A cascade harvest still pays, at roughly 40% fewer Cultivation Credits than a controlled one.',
        };
    }
    if (input.stability < 25) {
        return {
            id: 'collapse_imminent',
            severity: 'critical',
            headline: `Stability is at ${one(input.stability)}. At zero the run ends by itself.`,
            cause: 'Stability decays continuously, and both Entropy Vent and several interventions charge more of it.',
            advice: input.controlCapacity >= 2
                ? 'Stabilize (1) buys +14 Stability for 2 Control. Otherwise harvest before the collapse chooses for you.'
                : 'There is not enough Control left to stabilize. Harvest before the collapse chooses for you.',
        };
    }
    // Below the two branches that end the run and above everything else: an open decision freezes the
    // clock, so it can wait, but a cascade or a collapse that is already underway may not be hidden
    // behind it -- the highest severity that holds has to win.
    if (input.pendingEventTitle) {
        return {
            id: 'decision_pending',
            severity: 'watch',
            headline: `A decision is open: ${input.pendingEventTitle}.`,
            cause: 'The simulation is paused while an intervention is unresolved — years, Development and Entropy are all frozen.',
            advice: 'Read the predictions and choose. Probe (3) reveals the risk directions first, for 1 Control.',
        };
    }
    if (input.terminal) {
        return input.convergenceReady
            ? {
                id: 'convergence_ready',
                severity: 'watch',
                headline: `Convergence target reached at Depth ${one(input.depth)}.`,
                cause: `The terminal run needs a controlled harvest at Depth ${one(input.convergenceTargetDepth)} or deeper, and it is there.`,
                advice: 'Take the controlled harvest. Depth beyond the target adds nothing to the win.',
            }
            : {
                id: 'convergence_short',
                severity: 'urgent',
                headline: `Terminal run at Depth ${one(input.depth)} of the ${one(input.convergenceTargetDepth)} it needs.`,
                cause: 'A terminal run pays no yield and runs at 1.6× Entropy, so its only measure is whether it reaches the target Depth in time.',
                advice: `${seconds(input.secondsToCascade)} of cascade clock left. Accelerate (2) is the fastest Depth per Control here.`,
            };
    }
    if (input.entropy >= 75) {
        return {
            id: 'entropy_critical',
            severity: 'urgent',
            headline: `Entropy at ${one(input.entropy)} — the cascade is ${seconds(input.secondsToCascade)} away.`,
            cause: `Entropy rises at ${input.entropyRate.toFixed(2)}/s, and the rate grows with every year the civilization lives.`,
            advice: 'Entropy Vent (4) removes 18 for 1 Control and 10 Stability. Otherwise this is the run’s last window.',
        };
    }
    if (input.urgency === 'harvest') {
        return {
            id: 'harvest_window',
            severity: 'urgent',
            headline: `Harvest now — Cultivation Credit ${input.credits + 1} no longer fits in the run.`,
            cause: `The next credit needs ${seconds(input.secondsToNextCredit)} of Development and the run can only reach ${seconds(input.secondsOfRunLeft)}.`,
            advice: `A controlled harvest banks ${input.credits} credit${input.credits === 1 ? '' : 's'} at ${input.grade}. Staying trades that for nothing.`,
        };
    }
    if (input.attention > 65) {
        return {
            id: 'cosmic_attention',
            severity: 'urgent',
            headline: `Cosmic Attention at ${one(input.attention)} — external observers are converging.`,
            cause: 'Attention rises on its own and every Stabilize and Vent adds more of it.',
            advice: 'It also raises the Paradox a harvest pays, so this is a reason to stop soon rather than to panic.',
        };
    }
    if (input.awareness > 65) {
        return {
            id: 'civilization_awareness',
            severity: 'urgent',
            headline: `Machine Awareness at ${one(input.awareness)} — the civilization is working out that it is farmed.`,
            cause: 'Awareness rises with Development and with choices that expose the cultivation.',
            advice: 'It raises the Cognition yield but pulls hostile interventions into the pool. Bank the run before they land.',
        };
    }
    if (input.sanity < 35) {
        return {
            id: 'sanity_failing',
            severity: 'watch',
            headline: `Collective Sanity at ${one(input.sanity)}.`,
            cause: 'Sanity falls continuously and faster after choices that spend the population.',
            advice: 'Low Sanity raises the Paradox yield and darkens the intervention pool. It costs nothing directly — decide whether that trade is one you want.',
        };
    }
    if (input.grade === 'premature') {
        const missing = input.eventChoices < 3
            ? `it has resolved ${input.eventChoices} of the 3 interventions a payout needs`
            : input.era <= 0
                ? `it is still in ${input.eraName}, and a payout needs Expansion or later`
                : `Depth is ${one(input.depth)} and Established starts at 1.5`;
        return {
            id: 'premature',
            severity: 'watch',
            headline: 'This run cannot pay yet.',
            cause: `Premature grade: ${missing}.`,
            advice: 'Keep it alive. Accelerate (2) is the fastest route out of Premature, at +200 years for 2 Control.',
        };
    }
    if (input.urgency === 'capped') {
        return {
            id: 'credit_cap',
            severity: 'watch',
            headline: `Cultivation Credits are capped at ${input.credits}.`,
            cause: 'The credit formula stops at 20 regardless of Depth.',
            advice: 'Only raw resource yield still grows. Harvest unless a Directive objective is still within reach.',
        };
    }
    if (input.urgency === 'closing') {
        return {
            id: 'closing',
            severity: 'watch',
            headline: `Closing — credit ${input.credits + 1} in ${seconds(input.secondsToNextCredit)}, run reaches ${seconds(input.secondsOfRunLeft)}.`,
            cause: 'The next credit still fits, but only inside the last 30% of the run the current course allows.',
            advice: 'One Entropy Vent (4) buys the margin back. Without it, plan to harvest at the credit.',
        };
    }
    if (input.objectiveTitle && !input.objectiveCompleted) {
        return {
            id: 'objective_open',
            severity: 'calm',
            headline: `Building — the Directive objective "${input.objectiveTitle}" is still open.`,
            cause: `Depth ${one(input.depth)} at ${input.grade}, ${seconds(input.secondsToCascade)} of cascade clock, and the objective unmet.`,
            advice: 'Meeting it multiplies the whole harvest by 1.15 and adds a Cultivation Credit — often worth a band on its own.',
        };
    }
    return {
        id: 'building',
        severity: 'calm',
        headline: `Building — Depth ${one(input.depth)} at ${input.grade}, ${round(input.credits)} credit${input.credits === 1 ? '' : 's'} banked.`,
        cause: `Development is compounding and Entropy is at ${one(input.entropy)}, ${seconds(input.secondsToCascade)} from the cascade.`,
        advice: `Credit ${input.credits + 1} lands in ${seconds(input.secondsToNextCredit)}. Nothing needs spending yet.`,
    };
}
export function machineSituation(input) {
    if (input.needsDirective) {
        return {
            id: 'pick_directive',
            severity: 'watch',
            headline: 'The next run needs a Directive.',
            cause: 'Three offers were drafted deterministically from the next civilization’s seed, and one must be locked in before it starts.',
            advice: 'Pick the one whose objective matches how you intend to play the run.',
        };
    }
    if (input.canConsumeMultiverse) {
        return {
            id: 'collapse_multiverse',
            severity: 'watch',
            headline: 'The Multiverse can be collapsed.',
            cause: 'Enough Universes have been consumed to pay out Axioms.',
            advice: 'Collapsing resets Universes and Machine upgrades but pays a currency nothing below can touch.',
        };
    }
    if (input.canConsumeUniverse) {
        return {
            id: 'consume_universe',
            severity: 'watch',
            headline: `The Universe can be consumed at ${input.credits} Cultivation Credits.`,
            cause: `${input.creditsRequired} credits is the prestige threshold, and it has been met.`,
            advice: 'It resets resources and Machine upgrades and pays Universal Residue. Spend anything you were saving first.',
        };
    }
    if (input.hasReport) {
        return {
            id: 'read_report',
            severity: 'calm',
            headline: 'The last run is reported above.',
            cause: 'It states how the run developed, why it stopped, and what its own numbers suggest changing.',
            advice: 'Spend the harvest on what the report’s lessons name, then start the next civilization.',
        };
    }
    if (input.affordableUpgrades > 0) {
        return {
            id: 'spend_bank',
            severity: 'calm',
            headline: `${input.affordableUpgrades} upgrade${input.affordableUpgrades === 1 ? '' : 's'} affordable right now.`,
            cause: 'Resources do nothing while banked, and a prestige will take them.',
            advice: 'Containment buys longer runs; the harvest modules buy more out of the same run.',
        };
    }
    if (input.runsTotal === 0) {
        return {
            id: 'first_run',
            severity: 'calm',
            headline: 'Nothing has been cultivated yet.',
            cause: 'Every resource in the game comes out of a run, and there has not been one.',
            advice: 'Start a civilization. The first run is meant to be lost — it still pays.',
        };
    }
    return {
        id: 'start_run',
        severity: 'calm',
        headline: input.openMilestone ? `Next milestone: ${input.openMilestone}.` : 'The Machine is idle.',
        cause: input.canStart ? 'Nothing accumulates between runs.' : 'The next run is not ready to start yet.',
        advice: input.canStart ? 'Start the next civilization.' : 'Resolve what the panel above is asking for.',
    };
}
//# sourceMappingURL=guidance.js.map