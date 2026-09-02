import { currencyName, eraLabel } from '../game/engine.js';
import { endgameStateLabel, fill, harvestGradeLabel, institutionName, milestoneGroupLabel, text } from '../data/i18n.js';
import { buildViewModel, civilizationRenderKey } from './view-model.js';
import { CivilizationPaths } from '../game/paths.js';
import { esc, fmt, pct } from './format.js';
import { abbreviationLegend, abbreviationTitle, explainNote, fieldManual } from './guide-view.js';
import { tutorialOverlay, tutorialReplay } from './tutorial-view.js';
import { runReportPanel } from './report-view.js';
// The short resource names the harvest grid uses. `ui.viewModel.resources` is the long form the
// resource bar prints, so these are their own catalog entries rather than a truncation of those.
const resourceShort = () => { const t = text().ui.app; return { causal_mass: t.resourceCausal, cognition: t.resourceCognition, paradox: t.resourceParadox, existence: t.resourceExistence }; };
// Which resources a harvest breakdown may name -- filtered by what the Machine has identified, the
// same rule the resource bar and the run report follow. Listing all four named Existence in the live
// panel from the first run, hours before anything had revealed it.
const CONTROLLED_KEYS = ['causal_mass', 'cognition', 'paradox', 'existence'];
const CHAOTIC_KEYS = ['causal_mass', 'paradox'];
const visibleKeys = (vm, keys) => keys.filter(key => vm.visibleResourceKeys.includes(key));
// Reserve cost and harvest yield both move with Cultivation Depth on every tick. They must not enter
// the structural render key -- that would rebuild the DOM continuously -- so they are written through
// the live refresh instead, from the same builders the structural render uses.
const reserveCostText = (entry) => fill(text().ui.app.reserveCost, { cost: fmt(entry.cost), currency: currencyName(entry.currency), usesLeft: entry.usesLeft, maxUses: entry.maxUses });
const harvestSummaryText = (details) => { const t = text().ui.app; return fill(details.credits === 1 ? t.harvestSummaryOne : t.harvestSummaryMany, { multiplier: details.rewardMultiplier.toFixed(2), credits: details.credits, objectiveBonus: details.objectiveCompleted ? t.objectiveBonusActive : '' }); };
function statBar(name, value, max = 100, kind = '') { return `<div class="stat-row" data-stat="${esc(kind)}"><div><span>${esc(name)}</span><b>${value.toFixed(1)}${max !== 100 ? ` / ${max.toFixed(0)}` : ''}</b></div><div class="meter ${kind}"><i style="width:${pct(value, max)}"></i></div></div>`; }
function card(title, body, cls = '') { return `<section class="panel ${cls}"><h3>${title}</h3>${body}</section>`; }
function sanitizeHTML(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    const toRemove = [];
    const tagNameGetter = Object.getOwnPropertyDescriptor(Element.prototype, 'tagName').get;
    const attributesGetter = Object.getOwnPropertyDescriptor(Element.prototype, 'attributes').get;
    const removeAttribute = Element.prototype.removeAttribute;
    while (node) {
        const tagName = tagNameGetter.call(node);
        if (tagName === 'SCRIPT' || tagName === 'IFRAME' || tagName === 'OBJECT' || tagName === 'EMBED') {
            toRemove.push(node);
        }
        else {
            const attributes = attributesGetter.call(node);
            for (const attr of Array.from(attributes)) {
                if (attr.name.toLowerCase().startsWith('on')) {
                    removeAttribute.call(node, attr.name);
                    continue;
                }
                // Check for javascript: using anchor parsing to resolve protocols
                if (attr.value) {
                    const tempAnchor = document.createElement('a');
                    tempAnchor.href = attr.value;
                    if (tempAnchor.protocol === 'javascript:') {
                        removeAttribute.call(node, attr.name);
                    }
                }
            }
        }
        node = walker.nextNode();
    }
    for (const el of toRemove)
        el.remove();
    return doc.body.innerHTML;
}
function replaceIfChanged(element, html) {
    const sanitized = sanitizeHTML(html);
    if (element.innerHTML === sanitized)
        return false;
    element.innerHTML = sanitized;
    return true;
}
const signed = (value) => `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
// Grades are stored as ids and shouted on screen, so every surface that prints one goes through here.
const gradeText = (grade) => (harvestGradeLabel(String(grade)) ?? String(grade)).toUpperCase();
// "PATH: UNRESOLVED" is one catalog string with no placeholder, and the chip bolds only its value.
const boldAfterColon = (label) => { const at = label.indexOf(':'); return at < 0 ? `<b>${esc(label)}</b>` : `${esc(label.slice(0, at + 1))} <b>${esc(label.slice(at + 1).trim())}</b>`; };
const metricTone = (item) => ((item.key === 'awareness' || item.key === 'attention' || item.key === 'entropy' || item.key === 'eventTimer') ? item.delta < 0 : item.delta > 0) ? 'gain' : 'loss';
// The guided run highlights exactly one surface at a time, and the highlight is *rendered* rather
// than added to the DOM afterwards: `replaceIfChanged` compares against the built HTML, so a class
// bolted on after the fact would look like a diff and rebuild the panel on every pass.
const focusClass = (vm, anchor) => vm.tutorial.step?.anchor === anchor ? ' tutorial-focus' : '';
// One line, always on screen during a run: what is happening, why, and the single move it suggests.
// Neither the id nor the severity is a band in the render key -- both follow the harvest call, which
// moves continuously -- so the sentences and the severity class ride the live refresh instead.
const situationBanner = (vm) => {
    if (vm.event)
        return '';
    const t = text().ui.app;
    return `<section class="situation-banner severity-${esc(vm.situation.severity)}${focusClass(vm, '.situation-banner')}" role="status" aria-live="polite"><div class="panel-kicker">${esc(t.situationHeading)}</div><b data-live="situation-headline">${esc(vm.situation.headline)}</b><p class="situation-cause"><span>${esc(t.why)}</span><em data-live="situation-cause">${esc(vm.situation.cause)}</em></p><p class="situation-advice"><span>${esc(t.do)}</span><em data-live="situation-advice">${esc(vm.situation.advice)}</em></p>${explainNote('situation', vm.explain)}</section>`;
};
function decisionFeedback(feedback, focus = '', explain = false) {
    if (!feedback)
        return '';
    const t = text().ui.app;
    const metrics = feedback.metrics.map((item) => `<article class="decision-delta"><span>${esc(item.label)}</span><b>${item.before.toFixed(1)} → ${item.after.toFixed(1)}</b><em class="${metricTone(item)}">${signed(item.delta)}</em></article>`).join('');
    const affinities = feedback.affinities.map((item) => `<article class="decision-delta affinity"><span>${esc(fill(t.pathAffinity, { label: item.label }))}</span><b>${esc(t.pathInfluence)}</b><em class="${item.delta > 0 ? 'gain' : 'loss'}">${signed(item.delta)}</em></article>`).join('');
    const additions = feedback.additions.map((item) => `<span class="decision-addition">+ ${esc(item.label)} <small>${esc(item.kindLabel)}</small></span>`).join('');
    const changes = metrics || affinities ? `<div class="decision-deltas">${metrics}${affinities}</div>` : `<p class="no-delta">${esc(t.noMeasurableStateChange)}</p>`;
    return `<section class="panel decision-feedback tone-${esc(feedback.tone)}${focus}" aria-live="polite" aria-atomic="true"><div class="panel-kicker">${esc(t.decisionResolved)}</div>${explainNote('decision_feedback', explain)}<div class="decision-heading"><div><h2>${esc(feedback.choiceLabel)}</h2><p>${esc(feedback.eventTitle)}</p></div><span>${esc(fill(feedback.metrics.length === 1 ? t.metricChangedOne : t.metricChangedMany, { count: feedback.metrics.length }))}</span></div>${changes}${additions ? `<div class="decision-additions">${additions}</div>` : ''}</section>`;
}
const openDisclosures = new Set();
function isDisclosureOpen(id) { return openDisclosures.has(id); }
function disclosureAttr(id) { return isDisclosureOpen(id) ? ' open' : ''; }
if (typeof document !== 'undefined' && !document.__disclosureListenerBound) {
    document.__disclosureListenerBound = true;
    document.addEventListener('toggle', (e) => {
        const target = e.target;
        if (target && target.dataset && target.dataset.disclosure) {
            if (target.open)
                openDisclosures.add(target.dataset.disclosure);
            else
                openDisclosures.delete(target.dataset.disclosure);
        }
    }, true);
}
export function createGameUI(engine, world) {
    const resourceBar = document.querySelector('#resource-bar');
    const metaBar = document.querySelector('#meta-bar');
    const machine = document.querySelector('#machine-view');
    const civView = document.querySelector('#civilization-view');
    const worldShell = document.querySelector('#world-shell');
    const worldHud = document.querySelector('#world-hud');
    const worldStatusDock = document.querySelector('#world-status-dock');
    const civPanels = document.querySelector('#civilization-panels');
    const victoryView = document.querySelector('#victory-view');
    const log = document.querySelector('#machine-log');
    const tutorialLayer = document.querySelector('#tutorial-layer');
    const explainToggle = document.querySelector('#explain-toggle');
    let currentCivilizationKey = '';
    let lastFeedbackSequence = 0;
    let impactTimer = 0;
    let lastTutorialStepId = '';
    // Above 1000px the coach card docks to its own rail and overlaps nothing, so this never fires
    // there. Below it the card is pinned to the bottom edge, and the scroll position a step arrives at
    // is not something the step controls: on the first render of a run it sat directly on the
    // situation banner, truncating the WHY and DO lines mid-sentence -- the one sentence the guided
    // run exists to teach the player to read. Bring the anchored panel out from under it, once, when
    // the step changes; doing it on every render would take the scrollbar away from the player for
    // the whole run.
    function revealTutorialAnchor(view) {
        if (!view.visible || view.collapsed)
            return;
        requestAnimationFrame(() => {
            const card = tutorialLayer.querySelector('.tutorial-card');
            if (!card)
                return;
            // An off-phase step still names its anchor, and that anchor sits in the hidden phase view: it
            // has no box at all, so scrolling to it would move the page for a panel nobody can see.
            const onScreen = (selector) => {
                if (!selector)
                    return null;
                const el = document.querySelector(selector);
                return el && el.offsetParent !== null && el.getBoundingClientRect().height > 0 ? el : null;
            };
            // The step's own anchor when it is actually rendered, and otherwise the situation line -- the
            // one surface that is always saying what to do next, and so the one that must never be the
            // thing the coach card is sitting on.
            const target = onScreen(view.step?.anchor ?? '') ?? onScreen('#civilization-panels .situation-banner');
            if (!target)
                return;
            const t = target.getBoundingClientRect(), c = card.getBoundingClientRect();
            if (t.bottom <= c.top || t.top >= c.bottom || t.right <= c.left || t.left >= c.right)
                return;
            const bar = document.querySelector('.topbar');
            const safeTop = bar ? bar.getBoundingClientRect().bottom : 0;
            const delta = t.top - safeTop - 12;
            if (Math.abs(delta) < 2)
                return;
            const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
            window.scrollBy({ top: delta, behavior: reduce ? 'auto' : 'smooth' });
        });
    }
    const render = () => {
        const vm = buildViewModel(engine);
        const t = text().ui.app;
        replaceIfChanged(resourceBar, vm.resources.map(r => `<div class="resource"><span>${esc(r.name)}</span><strong>${fmt(r.amount)}</strong></div>`).join(''));
        replaceIfChanged(metaBar, `<span>${esc(t.metaMachineInsight)} <b>${vm.machineInsight}</b></span><span>${esc(t.metaCultivationCredits)} <b>${vm.cultivationCreditsThisUniverse}/${vm.universeRequirement}</b></span><span>${esc(t.metaMilestones)} <b>${vm.milestones.completed}/${vm.milestones.total}</b></span>${vm.systems.multiversePrestige ? `<span>${esc(t.metaMultiverse)} <b>${vm.universesThisMultiverse}/${vm.multiverseRequirement}</b></span>` : ''}${vm.convergence.convergences ? `<span>${esc(t.metaConvergences)} <b>${vm.convergence.convergences}</b></span>` : ''}`);
        machine.classList.toggle('is-hidden', vm.phase !== 'machine');
        civView.classList.toggle('is-hidden', vm.phase !== 'civilization');
        victoryView.classList.toggle('is-hidden', vm.phase !== 'victory');
        if (vm.phase === 'victory')
            renderVictory(vm);
        if (vm.phase === 'machine') {
            currentCivilizationKey = '';
            renderMachine(vm);
        }
        else {
            const nextKey = civilizationRenderKey(vm);
            if (nextKey !== currentCivilizationKey) {
                renderCivilization(vm);
                currentCivilizationKey = nextKey;
            }
            else {
                refreshCivilizationLive(vm);
            }
        }
        const logItems = vm.messages.length ? vm.messages.map(x => `<li>${esc(x)}</li>`).join('') : `<li>${esc(t.machineRecordAwaitingActivity)}</li>`;
        replaceIfChanged(log, logItems);
        if (log && log.parentElement)
            log.parentElement.classList.toggle('is-hidden', vm.phase !== 'machine');
        const civLog = civPanels.querySelector('#machine-log-civ');
        if (civLog)
            replaceIfChanged(civLog, logItems);
        // The coach card lives outside the phase views so a step can point at either of them without the
        // card itself being torn down when the phase changes.
        replaceIfChanged(tutorialLayer, tutorialOverlay(vm.tutorial));
        tutorialLayer.classList.toggle('is-hidden', !vm.tutorial.visible);
        // Phase and collapsed state belong in this key beside the step id. Step 1 is already on screen
        // in the Machine view when the player starts a run: the step does not change, the entire layout
        // under the card does -- which is exactly the moment the card ended up sitting on the situation
        // banner. Expanding the card back out is the same situation in miniature.
        const stepKey = `${vm.phase}|${vm.tutorial.step?.id ?? ''}|${vm.tutorial.collapsed ? 'c' : 'o'}`;
        if (stepKey !== lastTutorialStepId) {
            lastTutorialStepId = stepKey;
            revealTutorialAnchor(vm.tutorial);
        }
        if (explainToggle) {
            explainToggle.setAttribute('aria-pressed', vm.explain ? 'true' : 'false');
            explainToggle.classList.toggle('is-active', vm.explain);
            explainToggle.title = vm.explain ? t.explainOnTitle : t.explainOffTitle;
        }
        bindActions();
    };
    const upgrades = (entries, layer) => entries.map(entry => { const t = text().ui.app; const d = entry.definition; const level = engine.upgradeLevel(layer, d.id), cost = engine.upgradeCost(layer, d.id), max = Number(d.max_level); const locked = entry.status === 'locked'; return `<article class="upgrade ${locked ? 'locked' : ''}"><div><h4>${esc(d.name)}</h4><p>${esc(d.description)}</p>${locked ? `<small>🔒 ${esc(entry.reason)}</small>` : `<small>${esc(currencyName(d.currency))} ${fmt(cost)} · ${esc(fill(t.level, { level, max }))}</small>`}</div><button data-action="upgrade" data-layer="${layer}" data-id="${esc(d.id)}" ${locked || level >= max || !engine.canPurchaseUpgrade(layer, d.id) ? 'disabled' : ''}>${esc(level >= max ? t.max : locked ? t.locked : t.install)}</button></article>`; }).join('');
    const optionCards = (items, kind, selected, locked) => items.map(x => { const t = text().ui.app; return `<article class="build-option ${selected === x.id ? 'selected' : ''}"><h4>${esc(x.name)}</h4><p>${esc(x.description)}</p>${x.objective ? `<div class="objective-brief"><span>${esc(t.directiveObjective)}</span><b>${esc(x.objective.title)}</b><small>${esc(x.objective.description)}</small></div>` : ''}<button data-action="${kind}" data-id="${esc(x.id)}" ${locked || selected === x.id ? 'disabled' : ''}>${esc(selected === x.id ? t.active : locked ? t.lockedForRun : t.select)}</button></article>`; }).join('');
    const milestoneRegister = (vm) => {
        const t = text().ui.app;
        const groups = ['CULTIVATION', 'HARVEST', 'PATHS', 'PRESTIGE', 'CONVERGENCE'];
        const sections = groups.map(group => {
            const entries = vm.milestones.entries.filter((entry) => entry.group === group);
            if (!entries.length)
                return '';
            const insight = (value) => esc(fill(t.insightAward, { amount: value }));
            const progressText = (entry) => entry.display === 'count'
                ? `${fmt(entry.current)} / ${fmt(entry.target)}`
                // An ordinal is a state, not a tally: "2 / 3" read as two of three tasks done when what it
                // meant was "you are in Transcendence, this wants Apotheosis". The meter still tracks the
                // ordinal, because the distance is real -- only the counter was a lie.
                : `${esc(entry.currentTerm)}: ${esc(entry.currentLabel)} → ${esc(entry.targetTerm)}: ${esc(entry.targetLabel)}`;
            const open = entries.filter((entry) => !entry.completed).map((entry) => `<article class="milestone milestone-${esc(entry.display)}"><div><b>${esc(entry.title)}</b><p>${esc(entry.description)}</p></div><div class="milestone-progress"><div class="meter"><i style="width:${pct(entry.current, entry.target)}"></i></div><small>${progressText(entry)} · ${insight(entry.insight)}</small></div></article>`).join('');
            const done = entries.filter((entry) => entry.completed).map((entry) => `<article class="milestone complete"><b>\u2713 ${esc(entry.title)}</b><small>${insight(entry.insight)}</small></article>`).join('');
            return `<div class="milestone-group"><span class="panel-kicker">${esc(milestoneGroupLabel(group) ?? group)}</span>${open}${done}</div>`;
        }).join('');
        return card(esc(t.milestoneRegister), `<div class="milestone-register">${explainNote('milestones', vm.explain)}<p class="register-summary">${esc(fill(t.milestoneSummary, { completed: vm.milestones.completed, total: vm.milestones.total }))}</p>${sections}</div>`, 'milestone-card');
    };
    const convergenceCard = (vm) => { if (!vm.convergence.visible)
        return ''; const t = text().ui.app; const rows = vm.convergence.requirements.map((entry) => `<li class="${entry.met ? 'met' : 'open'}"><span>${entry.met ? '\u2713' : '\u25CB'} ${esc(entry.label)}</span><b>${fmt(entry.current)} / ${fmt(entry.target)}</b></li>`).join(''); return card(esc(t.greatConvergence), `<div class="convergence-card"><p>${esc(fill(t.convergenceDescription, { targetDepth: vm.convergence.targetDepth.toFixed(1) }))}</p><ul class="convergence-requirements">${rows}</ul><button class="primary big" data-action="convergence" ${vm.convergence.unlocked ? '' : 'disabled'}>${esc(t.initiateGreatConvergence)}</button>${vm.convergence.unlocked ? '' : `<p class="start-reason" role="status">${esc(vm.convergence.reason)}</p>`}${vm.convergence.convergences ? `<small>${esc(fill(t.convergencesAchieved, { count: vm.convergence.convergences }))}</small>` : ''}</div>`, 'convergence-panel'); };
    function renderMachine(vm) {
        const t = text().ui.app;
        const previews = vm.previews.map((p) => `<article class="unlock-preview"><b>🔒 ${esc(p.name)}</b><span>${esc(p.condition)}</span></article>`).join('');
        const previewTraits = vm.previewTraits.map((trait) => `<span>${esc(trait.name)}</span>`).join('');
        const directiveDraft = vm.systems.directives ? (vm.directives.length ? `<div class="option-grid directive-draft">${optionCards(vm.directives, 'directive', vm.runBuild.selectedDirective, vm.runBuild.directiveLocked)}</div>` : `<p>${esc(t.noDirectiveOffers)}</p>`) : '';
        const lastCredits = fmt(Number(vm.lastHarvest.credits ?? 0));
        const lastHarvest = vm.lastHarvest.grade ? `<div class="last-harvest"><span>${esc(t.lastHarvest)}</span><b>${esc(gradeText(vm.lastHarvest.grade))}</b><small>${esc(fill(Number(vm.lastHarvest.credits ?? 0) === 1 ? t.lastHarvestDetailOne : t.lastHarvestDetailMany, { credits: lastCredits, multiplier: Number(vm.lastHarvest.reward_multiplier ?? 1).toFixed(2) }))}</small></div>` : '';
        replaceIfChanged(machine, `
      ${runReportPanel(vm.runReport, vm.explain, focusClass(vm, '.run-report'))}
      <section class="machine-hero${focusClass(vm, '.machine-hero')}"><div><p class="eyebrow">${esc(t.browserNode)}</p><h2>${esc(t.machineControl)}</h2><p>${esc(t.machineDescription)}</p>${explainNote('machine_hero', vm.explain)}</div>${lastHarvest}</section>
      ${situationBanner(vm)}
      ${card(esc(t.nextCivilization), `<div class="run-preview">${explainNote('run_preparation', vm.explain)}<div><span class="panel-kicker">${esc(t.startingTraitsPreview)}</span><div class="tag-row preview-traits">${previewTraits || `<span>${esc(t.traitArchiveUnavailable)}</span>`}</div></div>${directiveDraft}<button class="primary big start-run" data-action="start" ${vm.canStartCivilization ? '' : 'disabled'}>${esc(t.startCivilization)}</button>${vm.startReason ? `<p class="start-reason" role="status">${esc(vm.startReason)}</p>` : ''}${tutorialReplay(vm.tutorial)}</div>`, `run-preparation${focusClass(vm, '.run-preparation')}`)}
      ${card(esc(t.machineUpgrades), `${explainNote('machine_upgrades', vm.explain)}<div class="upgrade-list">${upgrades(vm.machineUpgrades, 'machine')}</div>`)}
      ${vm.systems.breedingMatrices ? card(esc(t.breedingMatrix), vm.matrices.length ? `<div class="option-grid">${optionCards(vm.matrices, 'matrix', vm.runBuild.selectedBreedingMatrix, vm.runBuild.matrixLocked)}</div>` : `<p>${esc(t.noBreedingMatrices)}</p>`) : ''}
      ${vm.systems.universeUpgrades ? card(esc(t.universeUpgrades), `<div class="upgrade-list">${upgrades(vm.universeUpgrades, 'universe')}</div>`) : ''}
      ${vm.systems.axioms ? card(esc(t.axiomUpgrades), `<div class="upgrade-list">${upgrades(vm.axiomUpgrades, 'axiom')}</div>`) : ''}
      ${convergenceCard(vm)}
      ${milestoneRegister(vm)}
      ${fieldManual(vm.explain, focusClass(vm, '.field-manual'))}
      ${previews ? card(esc(t.nextDiscoveries), `<div class="preview-grid">${previews}</div>`) : ''}
      <section class="prestige-row">${vm.systems.universePrestige ? `<button data-action="universe" ${vm.canConsumeUniverse ? '' : 'disabled'}>${esc(t.consumeUniverse)} <span>${vm.cultivationCreditsThisUniverse}/${vm.universeRequirement} ${esc(t.metaCultivationCredits)}</span></button>` : ''}${vm.systems.multiversePrestige ? `<button class="danger" data-action="multiverse" ${vm.canConsumeMultiverse ? '' : 'disabled'}>${esc(t.collapseMultiverse)} <span>${vm.universesThisMultiverse}/${vm.multiverseRequirement}</span></button>` : ''}</section>`);
    }
    const rewardText = (key, details) => `${resourceShort()[key]} ${key === 'causal_mass' || engine.resourceDiscovered(key) ? fmt(details.rewards[key]) : '???'}`;
    const rewardSpan = (kind, key, details) => `<span data-live="harvest-${kind}-${key}">${esc(rewardText(key, details))}</span>`;
    // Turns the computed urgency into the one sentence the player actually needs. The numbers behind it
    // -- development rate against seconds to cascade -- are exact, so the call is a calculation, not a
    // vibe: the next Cultivation Credit either fits inside the remaining window or it does not.
    const urgencyText = (h) => {
        const t = text().ui.app;
        const u = h.urgency;
        if (u.state === 'cascading')
            return t.cascadeUnderWay;
        if (u.state === 'capped')
            return t.deepestBandReachedCreditCap;
        const runLeft = Number.isFinite(u.secondsOfRunLeft) ? `${Math.floor(u.secondsOfRunLeft)}s` : t.noLimit;
        if (u.state === 'harvest')
            return fill(t.harvestNowForecast, { nextCredit: u.nextCredit, secondsToNextCredit: Math.ceil(u.secondsToNextCredit), runLeft });
        if (u.state === 'closing')
            return fill(t.closingForecast, { nextCredit: u.nextCredit, secondsToNextCredit: Math.ceil(u.secondsToNextCredit), runLeft });
        if (h.controlled.grade === 'premature')
            return t.buildingPremature;
        return fill(t.buildingForecast, { nextCredit: u.nextCredit, secondsToNextCredit: Math.ceil(u.secondsToNextCredit) });
    };
    // The world strip is as narrow as a phone, so it gets the short form. Same states, same numbers,
    // no room for the sentence -- and Entropy is already in the state strip directly above it.
    const urgencyShort = (h) => {
        const t = text().ui.app;
        const u = h.urgency;
        if (u.state === 'cascading')
            return t.cascadeHarvestNow;
        if (u.state === 'capped')
            return t.deepestBandReachedShort;
        if (u.state === 'harvest')
            return fill(t.harvestNowShort, { nextCredit: u.nextCredit });
        if (h.controlled.grade === 'premature')
            return t.buildingPrematureShort;
        const seconds = Number.isFinite(u.secondsToNextCredit) ? `${Math.ceil(u.secondsToNextCredit)}s` : '—';
        return fill(t.shortCreditForecast, { state: u.state === 'closing' ? t.closing : t.building, nextCredit: u.nextCredit, seconds });
    };
    // The harvest readout sits inside the rail rather than in a collapsed panel: it answers the same
    // question as CASCADE IN Xs -- stay or harvest -- and the two are only useful side by side.
    const harvestReadout = (vm) => { const h = vm.harvest; if (!h)
        return ''; const t = text().ui.app; const next = h.nextBand ? fill(t.nextBand, { grade: `<b>${esc(h.nextBand.label.toUpperCase())}</b>`, depth: h.nextBand.depthNeeded.toFixed(1), credits: h.nextBand.credits, multiplier: h.nextBand.yieldMultiplier.toFixed(2) }) : esc(t.deepestBandReached); return `<div class="harvest-readout urgency-${esc(h.urgency.state)}${focusClass(vm, '.harvest-readout')}"><span>${esc(t.harvestGrade)} // <b>${esc(gradeText(h.controlled.grade))}</b></span><strong data-live="depth">${h.depth.toFixed(1)}</strong><div class="harvest-meter" aria-hidden="true"><i data-live="harvest-meter" style="width:${pct(h.bandProgress)}"></i></div><small data-live="harvest-summary">${esc(harvestSummaryText(h.controlled))}</small><small class="next-band">${next}</small><p class="harvest-call" role="status" data-live="harvest-call">${esc(urgencyText(h))}</p>${explainNote('harvest_readout', vm.explain)}</div>`; };
    // The rail used to be one block that answered three different questions at once: what can I spend
    // Control on, how much pressure is building, and when do I stop. It is two now, one per decision:
    // the command rail is what the player spends, the pressure rail is when the run should end -- and
    // the harvest buttons sit under the readout that says whether to press them.
    // Every speed is on screen from the first run, the locked ones carrying the Machine Insight they
    // cost. Hiding them made 2x and 4x appear out of nowhere the moment a gate cleared, which reads as
    // a glitch rather than as the permanent progression they are -- and gave the player nothing to aim
    // at in the meantime. `Progression` announces each step once when it actually unlocks.
    const speedRow = (vm) => `<div class="speed-row"><span>${esc(text().ui.app.simulationSpeed)}</span>${vm.simulationSpeedOptions.map((option) => option.unlocked
        ? `<button data-action="speed" data-speed="${option.speed}" class="${vm.simulationSpeed === option.speed ? 'active' : ''}">${option.speed}×</button>`
        : `<button class="speed-locked" disabled title="${esc(fill(text().ui.app.simulationSpeedLocked, { insight: option.insight }))}">${option.speed}× 🔒 ${esc(fill(text().ui.app.simulationSpeedLocked, { insight: option.insight }))}</button>`).join('')}</div>`;
    const harvestActionSurface = (vm) => {
        const c = text().ui.app;
        const h = vm.harvest;
        if (!h)
            return '';
        const collapse = vm.civilization && (vm.civilization.stats.stability < 25 || vm.tactical.entropy >= 100) ? `<div class="collapse-warning">${esc(c.collapseWarning)}</div>` : '';
        return `<section class="panel harvest-surface${focusClass(vm, '.harvest-surface')}"><div class="panel-kicker">${esc(c.harvestGrade)} // <b data-live="harvest-grade-inline">${esc(gradeText(h.controlled.grade))}</b> · DEPTH <b data-live="depth-inline">${h.depth.toFixed(1)}</b> · <span data-live="harvest-call">${esc(urgencyText(h))}</span></div>${collapse}<section class="harvest-actions${focusClass(vm, '.harvest-actions')}"><button class="primary big" data-action="harvest">${esc(c.controlledHarvest)}</button><div class="harvest-actions-secondary"><button class="danger" data-action="chaos">${esc(c.forceChaoticHarvest)}</button><button class="ghost" data-action="abandon">${esc(c.abandonWithoutReward)}</button></div></section></section>`;
    };
    const commandRail = (vm) => { const t = vm.tactical; if (!t)
        return ''; const pips = Array.from({ length: t.controlMax }, (_, index) => `<i class="${index < t.controlCapacity ? 'active' : ''}" aria-hidden="true"></i>`).join(''); const keys = t.actions.map((action) => `<b>${esc(action.shortcut)}</b>`).join(' '); const copy = text().ui.app; const actions = t.actions.map((action) => `<div class="tactical-action-wrap"><button data-action="tactical" data-id="${esc(action.id)}" aria-describedby="tactical-reason-${esc(action.id)}" ${action.enabled ? '' : 'disabled'}><span><kbd>${esc(action.shortcut)}</kbd>${esc(action.label)}</span><b>${esc(action.summary)}</b><small>${esc(action.risk)} · ${esc(fill(copy.cost, { cost: action.cost }))}</small></button><span id="tactical-reason-${esc(action.id)}" class="tactical-reason" data-tactical-reason="${esc(action.id)}">${esc(action.reason)}</span></div>`).join(''); return `<section class="tactical-rail command-rail entropy-${esc(t.entropyBand.id)}${focusClass(vm, '.command-rail')}" aria-label="${esc(copy.tacticalActionsAria)}"><div class="rail-head"><span class="panel-kicker">${esc(copy.tacticalActions)}</span><span class="rail-keys">${esc(copy.keys)} ${keys}</span></div>${explainNote('command_rail', vm.explain)}<div class="control-line"><strong>${esc(copy.controlCapacity)}</strong><div class="control-pips" aria-label="${esc(fill(copy.controlAvailable, { available: t.controlCapacity, max: t.controlMax }))}">${pips}<b data-live="control-value">${t.controlCapacity}/${t.controlMax}</b></div></div><div class="tactical-actions">${actions}</div>${speedRow(vm)}<p class="tactical-failure" aria-live="polite" data-live="tactical-failure">${esc(vm.lastActionFailure)}</p></section>`; };
    const pressureRail = (vm) => {
        const t = vm.tactical;
        if (!t)
            return '';
        const c = vm.civilization;
        const copy = text().ui.app;
        const readout = fill(copy.containmentPressureRate, {
            containment: `<b>${t.containmentRating}</b>`,
            pressure: `<b data-live="pressure-multiplier">×${t.pressureMultiplier.toFixed(2)}</b>`,
            rate: `<b data-live="entropy-rate">${t.entropyRate.toFixed(2)}</b>`,
        });
        return `<details class="panel tactical-rail pressure-rail entropy-${esc(t.entropyBand.id)}${focusClass(vm, '.pressure-rail')}" data-disclosure="pressure-details"${disclosureAttr('pressure-details')}><summary>${esc(copy.pressureHarvestDetails ?? copy.pressureHarvest)} <small data-live="pressure-summary">ENT ${t.entropy.toFixed(1)} · ${esc(t.entropyBand.label)} · CASCADE ${t.secondsToCascade.toFixed(0)}s</small></summary>${explainNote('pressure_rail', vm.explain)}<div class="entropy-readout"><span>${esc(text().ui.viewModel.metrics.entropy.toUpperCase())} // <b data-live="entropy-band">${esc(t.entropyBand.label)}</b></span><strong data-live="entropy-value">${t.entropy.toFixed(1)}</strong><div class="entropy-meter"><i data-live="entropy-meter" style="width:${pct(t.entropy)}"></i></div><small>${readout}</small><small class="cascade-eta">${fill(copy.cascadeCurrentCourse, { seconds: `<b data-live="cascade-eta">${t.secondsToCascade.toFixed(0)}s</b>` })}</small></div>${harvestReadout(vm)}</details>`;
    };
    function renderCivilization(vm) {
        const c = vm.civilization;
        if (!c)
            return;
        const t = text().ui.app;
        const event = vm.event;
        const path = c.path;
        const harvest = vm.harvest.controlled;
        const chaotic = vm.harvest.chaotic;
        // The depth is a live value, so the sentence around it is filled with the marked-up span.
        const depthSpan = `<b data-live="convergence-depth">${vm.harvest.depth.toFixed(1)}</b>`;
        const terminalBanner = c.terminal ? `<section class="panel terminal-banner ${vm.harvest.convergenceReady ? 'ready' : ''}"><div class="panel-kicker">${esc(t.terminalCultivation)}</div><b>${esc(fill(t.convergenceTargetDepth, { depth: vm.convergence.targetDepth.toFixed(1) }))}</b><span>${fill(vm.harvest.convergenceReady ? t.currentDepthReady : t.currentDepthInsufficient, { depth: depthSpan })}</span></section>` : '';
        replaceIfChanged(worldHud, `<div class="world-chip"><span>${esc(c.faction.name)}</span><b>${esc(c.species.name)}</b></div><div class="world-chip path-chip">${path.dominantName ? fill(t.dominantPath, { path: `<b>${esc(path.dominantName)}</b>` }) : boldAfterColon(t.unresolvedPath)}</div><button class="world-arrow left" data-action="pan" data-dir="-1" aria-label="${esc(t.panLeft)}">‹</button><button class="world-arrow right" data-action="pan" data-dir="1" aria-label="${esc(t.panRight)}">›</button>`);
        if (worldStatusDock) {
            replaceIfChanged(worldStatusDock, `<div class="world-status-strip${focusClass(vm, '.world-status-strip')}"><div class="status-group"><span title="${esc(abbreviationTitle('ERA'))}">ERA <b data-live="world-era">${esc(eraLabel(c.era))}</b></span><span title="${esc(abbreviationTitle('DEV'))}">DEV <b data-live="world-development">${c.development.toFixed(0)}</b></span><span title="${esc(abbreviationTitle('STB'))}">STB <b data-live="world-stability">${c.stats.stability.toFixed(0)}</b></span><span title="${esc(abbreviationTitle('SAN'))}">SAN <b data-live="world-sanity">${c.stats.sanity.toFixed(0)}</b></span></div><div class="status-group"><span title="${esc(abbreviationTitle('AWR'))}">AWR <b data-live="world-awareness">${c.stats.awareness.toFixed(0)}</b></span><span title="${esc(abbreviationTitle('ATT'))}">ATT <b data-live="world-attention">${c.stats.attention.toFixed(0)}</b></span><span title="${esc(abbreviationTitle('ENT'))}">ENT <b data-live="world-entropy">${vm.tactical.entropy.toFixed(0)}</b></span></div><div class="status-group cascade-group urgency-${esc(vm.harvest.urgency.state)}"><span>CASCADE <b data-live="strip-cascade">${vm.tactical.secondsToCascade.toFixed(0)}s</b></span><span class="strip-call" data-live="strip-call">${esc(urgencyShort(vm.harvest))}</span></div></div>`);
        }
        const eventCard = event ? `<section class="panel intervention situation-card situation-banner severity-${esc(vm.situation.severity)}${focusClass(vm, '.intervention')}" role="status" aria-live="polite"><div class="panel-kicker">${esc(t.situationHeading)} // ${esc(event.probed ? t.currentInterventionProbed : t.currentIntervention)}</div><h2>${esc(event.title)}</h2><details data-disclosure="situation-details"${disclosureAttr('situation-details')}><summary>${esc(t.situationDetailsSummary)}</summary><p class="event-body">${esc(event.body)}</p><div class="situation-cause-advice"><p class="situation-cause"><span>${esc(t.why)}</span><em data-live="situation-cause">${esc(vm.situation.cause)}</em></p><p class="situation-advice"><span>${esc(t.do)}</span><em data-live="situation-advice">${esc(vm.situation.advice)}</em></p></div>${explainNote('intervention', vm.explain)}</details>${event.predictionLocked ? `<div class="prediction-lock">${esc(t.predictionCoreOffline)}</div>` : ''}<div class="choice-list">${event.choices.map((ch) => `<button data-action="choice" data-index="${ch.index}"><b>${esc(ch.label)}</b>${ch.prediction ? `<span>${esc(ch.prediction)}</span>` : ''}</button>`).join('')}</div>${engine.upgradeLevel('axiom', 'axiom_multiple_choice') > 0 ? `<button class="ghost" data-action="reroll">${esc(t.rerollWithParadox)}</button>` : ''}</section>` : `<section class="panel intervention quiet${focusClass(vm, '.intervention')}"><div class="panel-kicker">${esc(t.currentIntervention)}</div><h2>${esc(t.monitoringCivilization)}</h2>${explainNote('intervention', vm.explain)}<p data-live="event-timer">${esc(fill(t.nextInterventionWindow, { seconds: Math.max(0, c.eventTimer).toFixed(1) }))}</p></section>`;
        const tendencies = path.tendencies.length ? path.tendencies.map((entry) => `<li><b>${esc(entry.name)}</b><span>${esc(entry.label)}</span></li>`).join('') : `<li><span>${esc(t.noCoherentTendency)}</span></li>`;
        const objectiveCard = vm.directiveObjective ? `<details class="panel directive-objective" data-disclosure="directive-objective"${disclosureAttr('directive-objective')}><summary>${esc(t.directiveObjectiveTitle)} <small>${esc(vm.directiveObjective.completed ? t.directiveObjectiveComplete : t.directiveObjectiveActive)}</small></summary>${explainNote('objective', vm.explain)}<div class="objective-progress ${vm.directiveObjective.completed ? 'complete' : ''}"><span>${esc(vm.directiveObjective.completed ? t.directiveObjectiveComplete : t.directiveObjectiveActive)}</span><b>${esc(vm.directiveObjective.title)}</b><p>${esc(vm.directiveObjective.description)}</p><small>${esc(t.objectiveBonus)}</small></div></details>` : '';
        const reserveCard = vm.machineReserve.length ? `<details class="panel machine-reserve" data-disclosure="machine-reserve"${disclosureAttr('machine-reserve')}><summary>${esc(t.machineReserve)} <small>${vm.machineReserve.length} ${esc(t.optionsCount ?? 'options')}</small></summary>${explainNote('reserve', vm.explain)}<p class="panel-note">${esc(t.machineReserveDescription)}</p><div class="reserve-actions">${vm.machineReserve.map((entry) => `<div class="tactical-action-wrap"><button data-action="reserve" data-id="${esc(entry.id)}" aria-describedby="reserve-reason-${esc(entry.id)}" ${entry.enabled ? '' : 'disabled'}><span>${esc(entry.title)}</span><b>${esc(entry.summary)}</b><small data-reserve-cost="${esc(entry.id)}">${esc(reserveCostText(entry))}</small></button><span id="reserve-reason-${esc(entry.id)}" class="tactical-reason" data-reserve-reason="${esc(entry.id)}">${esc(entry.reason)}</span></div>`).join('')}</div></details>` : '';
        replaceIfChanged(civPanels, `${explainNote('world', vm.explain)}${abbreviationLegend(vm.explain)}${situationBanner(vm)}${terminalBanner}${eventCard}${decisionFeedback(vm.feedback, focusClass(vm, '.decision-feedback'), vm.explain)}
      ${harvestActionSurface(vm)}
      <div class="run-controls">${commandRail(vm)}</div>
      ${pressureRail(vm)}
      ${objectiveCard}${reserveCard}
      <details class="panel strategic-overview-panel" data-disclosure="strategic-overview"${disclosureAttr('strategic-overview')}><summary>${esc(t.strategicOverview)} <small data-live="overview-summary">STB ${c.stats.stability.toFixed(0)} · SAN ${c.stats.sanity.toFixed(0)}</small></summary>${explainNote('strategic_overview', vm.explain)}<div class="stats-grid">${statBar(t.realityStability, c.stats.stability, c.stats.stabilityMax, 'stability')}${statBar(t.machineAwareness, c.stats.awareness, 100, 'awareness')}${statBar(t.collectiveSanity, c.stats.sanity, 100, 'sanity')}${statBar(t.cosmicAttention, c.stats.attention, 100, 'attention')}</div><div class="overview-line"><span>${esc(t.era)} <b data-live="era">${esc(eraLabel(c.era))}</b></span><span>${esc(t.year)} <b data-live="year">${fmt(c.years)}</b></span><span>${esc(t.development)} <b data-live="development">${c.development.toFixed(1)}</b></span></div><p class="cosmic-line">${esc(c.stats.attention > 65 ? t.externalObserversConverging : c.stats.awareness > 65 ? t.civilizationDangerouslyAware : t.cosmicObservationTolerable)}</p></details>
      <details class="records-intel-panel" data-disclosure="records-intel"${disclosureAttr('records-intel')}><summary>${esc(t.recordsAndIntelligence)}</summary>
        <details data-disclosure="dossier"${disclosureAttr('dossier')}><summary>${esc(t.speciesFactionDossier)}</summary>${card('', `<div class="tag-row">${c.traits.map((trait) => `<span>${esc(trait.name)}</span>`).join('')}</div><h4>${esc(t.emergingTendencies)}</h4><ul class="tendency-list">${tendencies}</ul>${c.institutions.length ? `<h4>${esc(t.institutions)}</h4><p>${c.institutions.map((id) => esc(institutionName(id) ?? id.replaceAll('_', ' '))).join(' · ')}</p>` : ''}`)}</details>
        <details data-disclosure="harvest-yield"${disclosureAttr('harvest-yield')}><summary>${esc(t.harvestYieldDetail)}</summary>${card('', `${explainNote('harvest_detail', vm.explain)}<p class="panel-note">${esc(t.harvestDetailDescription)}</p><div class="harvest-grid"><div><b>${esc(t.controlled)}</b>${visibleKeys(vm, CONTROLLED_KEYS).map(key => rewardSpan('controlled', key, harvest)).join('')}</div><div><b>${esc(t.chaotic)}</b>${visibleKeys(vm, CHAOTIC_KEYS).map(key => rewardSpan('chaotic', key, chaotic)).join('')}<small>${esc(t.chaoticAutomatic)}</small></div></div>`)}</details>
        <details data-disclosure="civ-record"${disclosureAttr('civ-record')}><summary>${esc(t.civilizationRecord)}</summary>${card('', `<ol class="history">${c.history.length ? c.history.map((h) => `<li>${esc(h)}</li>`).join('') : `<li>${esc(t.noRecordedHistoryYet)}</li>`}</ol>`)}</details>
        <details data-disclosure="civ-identity"${disclosureAttr('civ-identity')}><summary>${esc(t.civilizationIdentity)}</summary>${card('', `<p><b>${esc(c.species.name)}</b> · ${esc(c.species.bodyType)} · ${esc(c.species.culture)}</p><p>${esc(fill(t.visualMotif, { motif: c.species.motif }))}</p><p><b>${esc(c.faction.name)}</b><br>${esc(fill(t.doctrine, { doctrine: c.faction.doctrine }))}<br>${esc(fill(t.focus, { focus: c.faction.focus }))}</p>`)}</details>
        <details data-disclosure="era-progression"${disclosureAttr('era-progression')}><summary>${esc(t.eraProgression)}</summary>${card('', `<p>${esc(t.eraRanges)}</p><div class="era-track"><i style="width:${Math.min(100, c.years / 14000 * 100)}%"></i></div>`)}</details>
        <details data-disclosure="machine-record"${disclosureAttr('machine-record')}><summary>${esc(t.machineRecord)}</summary>${card('', `<ul id="machine-log-civ" role="log" aria-live="off">${vm.messages.length ? vm.messages.map((x) => `<li>${esc(x)}</li>`).join('') : `<li>${esc(t.machineRecordAwaitingActivity)}</li>`}</ul>`)}</details>
      </details>`);
        if (vm.feedback && vm.feedback.sequence !== lastFeedbackSequence) {
            lastFeedbackSequence = vm.feedback.sequence;
            worldShell.classList.remove('decision-impact', 'tone-positive', 'tone-negative', 'tone-mixed');
            void worldShell.offsetWidth;
            worldShell.classList.add('decision-impact', `tone-${vm.feedback.tone}`);
            window.clearTimeout(impactTimer);
            impactTimer = window.setTimeout(() => worldShell.classList.remove('decision-impact', 'tone-positive', 'tone-negative', 'tone-mixed'), 1800);
        }
    }
    function refreshCivilizationLive(vm) {
        const c = vm.civilization;
        if (!c)
            return;
        const setText = (selector, value) => { const element = civPanels.querySelector(selector); if (element)
            element.textContent = value; };
        const setWorldText = (selector, value) => { const element = (worldStatusDock ? worldStatusDock.querySelector(selector) : null) ?? worldHud.querySelector(selector); if (element)
            element.textContent = value; };
        setText('[data-live="event-timer"]', fill(text().ui.app.nextInterventionWindow, { seconds: Math.max(0, c.eventTimer).toFixed(1) }));
        setText('[data-live="era"]', eraLabel(c.era));
        setText('[data-live="year"]', fmt(c.years));
        setText('[data-live="development"]', c.development.toFixed(1));
        setText('[data-live="cascade-eta"]', `${vm.tactical.secondsToCascade.toFixed(0)}s`);
        setText('[data-live="entropy-rate"]', vm.tactical.entropyRate.toFixed(2));
        setText('[data-live="pressure-multiplier"]', `×${vm.tactical.pressureMultiplier.toFixed(2)}`);
        setText('[data-live="depth"]', vm.harvest.depth.toFixed(1));
        setText('[data-live="convergence-depth"]', vm.harvest.depth.toFixed(1));
        setText('[data-live="harvest-summary"]', harvestSummaryText(vm.harvest.controlled));
        for (const key of visibleKeys(vm, CONTROLLED_KEYS))
            setText(`[data-live="harvest-controlled-${key}"]`, rewardText(key, vm.harvest.controlled));
        for (const key of visibleKeys(vm, CHAOTIC_KEYS))
            setText(`[data-live="harvest-chaotic-${key}"]`, rewardText(key, vm.harvest.chaotic));
        for (const entry of vm.machineReserve) {
            setText(`[data-reserve-cost="${entry.id}"]`, reserveCostText(entry));
            setText(`[data-reserve-reason="${entry.id}"]`, entry.reason);
            const button = civPanels.querySelector(`[data-action="reserve"][data-id="${entry.id}"]`);
            if (button)
                button.disabled = !entry.enabled;
        }
        setWorldText('[data-live="world-era"]', eraLabel(c.era));
        setWorldText('[data-live="world-development"]', c.development.toFixed(0));
        setWorldText('[data-live="world-stability"]', c.stats.stability.toFixed(0));
        setWorldText('[data-live="world-sanity"]', c.stats.sanity.toFixed(0));
        setWorldText('[data-live="world-awareness"]', c.stats.awareness.toFixed(0));
        setWorldText('[data-live="world-attention"]', c.stats.attention.toFixed(0));
        setWorldText('[data-live="world-entropy"]', vm.tactical.entropy.toFixed(0));
        setWorldText('[data-live="strip-cascade"]', `${vm.tactical.secondsToCascade.toFixed(0)}s`);
        setWorldText('[data-live="strip-call"]', urgencyShort(vm.harvest));
        const group = (worldStatusDock ? worldStatusDock.querySelector('.cascade-group') : null) ?? worldHud.querySelector('.world-mobile-strip');
        if (group)
            for (const state of ['building', 'closing', 'harvest', 'cascading'])
                group.classList.toggle(`urgency-${state}`, vm.harvest.urgency.state === state);
        setText('[data-live="entropy-value"]', vm.tactical.entropy.toFixed(1));
        setText('[data-live="entropy-band"]', vm.tactical.entropyBand.label);
        setText('[data-live="control-value"]', `${vm.tactical.controlCapacity}/${vm.tactical.controlMax}`);
        setText('[data-live="tactical-failure"]', vm.lastActionFailure);
        setText('[data-live="pressure-summary"]', `ENT ${vm.tactical.entropy.toFixed(1)} · ${vm.tactical.entropyBand.label} · CASCADE ${vm.tactical.secondsToCascade.toFixed(0)}s`);
        setText('[data-live="overview-summary"]', `STB ${c.stats.stability.toFixed(0)} · SAN ${c.stats.sanity.toFixed(0)}`);
        setText('[data-live="harvest-grade-inline"]', gradeText(vm.harvest.controlled.grade));
        setText('[data-live="depth-inline"]', vm.harvest.depth.toFixed(1));
        const entropyMeter = civPanels.querySelector('[data-live="entropy-meter"]');
        if (entropyMeter)
            entropyMeter.style.width = pct(vm.tactical.entropy);
        const harvestMeter = civPanels.querySelector('[data-live="harvest-meter"]');
        if (harvestMeter)
            harvestMeter.style.width = pct(vm.harvest.bandProgress);
        civPanels.querySelectorAll('[data-live="harvest-call"]').forEach(el => { el.textContent = urgencyText(vm.harvest); });
        // The situation is selected in part by the harvest call, whose two sides move continuously, so
        // neither its id nor its severity may enter the structural key. Sentences and severity band are
        // both rewritten here instead, exactly like the readout below.
        setText('[data-live="situation-headline"]', vm.situation.headline);
        setText('[data-live="situation-cause"]', vm.situation.cause);
        setText('[data-live="situation-advice"]', vm.situation.advice);
        const banner = civPanels.querySelector('.situation-banner');
        if (banner)
            for (const severity of ['calm', 'watch', 'urgent', 'critical'])
                banner.classList.toggle(`severity-${severity}`, vm.situation.severity === severity);
        // Both sides of the urgency threshold -- development rate and seconds to cascade -- move
        // continuously, so the state must never enter civilizationRenderKey or a run near a boundary
        // would rebuild the panel frame after frame. It rides the live refresh instead.
        const readout = civPanels.querySelector('.harvest-readout');
        if (readout)
            for (const state of ['building', 'closing', 'harvest', 'cascading'])
                readout.classList.toggle(`urgency-${state}`, vm.harvest.urgency.state === state);
        civPanels.querySelectorAll('.control-pips i').forEach((pip, index) => pip.classList.toggle('active', index < vm.tactical.controlCapacity));
        for (const action of vm.tactical.actions) {
            const button = civPanels.querySelector(`[data-action="tactical"][data-id="${action.id}"]`);
            if (button)
                button.disabled = !action.enabled;
            const reason = civPanels.querySelector(`[data-tactical-reason="${action.id}"]`);
            if (reason)
                reason.textContent = action.reason;
        }
        const liveStats = [
            ['stability', c.stats.stability, c.stats.stabilityMax],
            ['awareness', c.stats.awareness, 100],
            ['sanity', c.stats.sanity, 100],
            ['attention', c.stats.attention, 100],
        ];
        liveStats.forEach(([kind, value, max]) => {
            const row = civPanels.querySelector(`[data-stat="${kind}"]`);
            const label = row?.querySelector('b');
            const meter = row?.querySelector('i');
            if (label)
                label.textContent = `${value.toFixed(1)}${max !== 100 ? ` / ${max.toFixed(0)}` : ''}`;
            if (meter)
                meter.style.width = pct(value, max);
        });
    }
    function renderVictory(vm) { const record = vm.victory?.record; if (!record) {
        replaceIfChanged(victoryView, '');
        return;
    } const t = text().ui.app; const endgames = record.endgameStates.length ? record.endgameStates.map((state) => `<span>${esc(endgameStateLabel(state) ?? state.replace('endgame_', '').replaceAll('_', ' '))}</span>`).join('') : `<span>${esc(t.victoryNoneRecorded)}</span>`; replaceIfChanged(victoryView, `<section class="panel victory-screen"><div class="panel-kicker">${esc(t.greatConvergence)} ${record.convergence}</div><h2>${esc(t.victoryTitle)}</h2><p>${esc(t.victoryDescription)}</p><div class="victory-stats"><article><span>${esc(t.seed)}</span><b>${fmt(record.seed)}</b></article><article><span>${esc(t.years)}</span><b>${fmt(record.years)}</b></article><article><span>${esc(t.era.toUpperCase())}</span><b>${esc(eraLabel(record.era))}</b></article><article><span>${esc(t.depth)}</span><b>${record.depth.toFixed(1)}</b></article><article><span>${esc(t.development.toUpperCase())}</span><b>${fmt(record.development)}</b></article><article><span>${esc(t.dominantPathLabel)}</span><b>${esc(record.dominantPath ? CivilizationPaths.displayName(record.dominantPath) : t.unresolved)}</b></article></div><div class="victory-endgames">${endgames}</div><p class="victory-bonus">${esc(fill(t.permanentReward, { yield: (1 + .25 * vm.victory.convergences).toFixed(2), containment: 2 * vm.victory.convergences }))}</p><button class="primary big" data-action="acknowledge-victory">${esc(t.continue)}</button></section>`); }
    function bindActions() { document.querySelectorAll('[data-action]').forEach(el => { if (el.dataset.bound)
        return; el.dataset.bound = '1'; el.addEventListener('click', () => { const a = el.dataset.action; switch (a) {
        case 'start':
            engine.startCivilization();
            break;
        case 'upgrade':
            engine.purchaseUpgrade(el.dataset.layer, el.dataset.id);
            break;
        case 'directive':
            engine.selectDirective(el.dataset.id);
            break;
        case 'matrix':
            engine.selectBreedingMatrix(el.dataset.id);
            break;
        case 'universe':
            engine.consumeUniverse();
            break;
        case 'multiverse':
            engine.consumeMultiverse();
            break;
        case 'choice':
            engine.chooseEvent(Number(el.dataset.index));
            break;
        case 'tactical':
            engine.useTacticalAction(el.dataset.id);
            break;
        case 'reserve':
            engine.useRunIntervention(el.dataset.id);
            break;
        case 'reroll':
            engine.rerollEvent();
            break;
        case 'speed':
            engine.setSimulationSpeed(Number(el.dataset.speed));
            break;
        case 'harvest':
            engine.harvest(false);
            break;
        case 'chaos':
            engine.harvest(true);
            break;
        case 'abandon':
            engine.returnToMachineWithoutReward();
            break;
        case 'convergence':
            engine.startConvergenceRun();
            break;
        case 'acknowledge-victory':
            engine.acknowledgeVictory();
            break;
        case 'pan':
            world.nudge(Number(el.dataset.dir));
            break;
        case 'tutorial-next':
            engine.acknowledgeTutorialStep();
            break;
        case 'tutorial-skip':
            engine.skipTutorial();
            break;
        case 'tutorial-restart':
            engine.restartTutorial();
            break;
        case 'tutorial-collapse':
            engine.setTutorialCollapsed(el.dataset.collapsed === '1');
            break;
        case 'explain':
            engine.toggleExplainMode();
            break;
        case 'dismiss-report':
            engine.dismissRunReport();
            break;
    } }); }); }
    engine.onChange(render);
    render();
    return { render };
}
//# sourceMappingURL=app.js.map