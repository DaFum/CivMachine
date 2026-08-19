import { ERA_NAMES } from '../game/engine.js';
import { buildViewModel, civilizationRenderKey } from './view-model.js';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
const fmt = (n) => Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : Math.abs(n) >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : Math.round(n).toLocaleString('en-US');
const pct = (v, max = 100) => `${Math.max(0, Math.min(100, v / max * 100)).toFixed(0)}%`;
function statBar(name, value, max = 100, kind = '') { return `<div class="stat-row" data-stat="${esc(kind)}"><div><span>${esc(name)}</span><b>${value.toFixed(1)}${max !== 100 ? ` / ${max.toFixed(0)}` : ''}</b></div><div class="meter ${kind}"><i style="width:${pct(value, max)}"></i></div></div>`; }
function card(title, body, cls = '') { return `<section class="panel ${cls}"><h3>${title}</h3>${body}</section>`; }
function replaceIfChanged(element, html) { if (element.innerHTML === html)
    return false; element.innerHTML = html; return true; }
const signed = (value) => `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
const metricTone = (item) => ((item.key === 'awareness' || item.key === 'attention' || item.key === 'entropy' || item.key === 'eventTimer') ? item.delta < 0 : item.delta > 0) ? 'gain' : 'loss';
function decisionFeedback(feedback) {
    if (!feedback)
        return '';
    const metrics = feedback.metrics.map((item) => `<article class="decision-delta"><span>${esc(item.label)}</span><b>${item.before.toFixed(1)} → ${item.after.toFixed(1)}</b><em class="${metricTone(item)}">${signed(item.delta)}</em></article>`).join('');
    const affinities = feedback.affinities.map((item) => `<article class="decision-delta affinity"><span>${esc(item.label)} affinity</span><b>Path influence</b><em class="${item.delta > 0 ? 'gain' : 'loss'}">${signed(item.delta)}</em></article>`).join('');
    const additions = feedback.additions.map((item) => `<span class="decision-addition">+ ${esc(item.label)} <small>${esc(item.kind.replaceAll('_', ' '))}</small></span>`).join('');
    const changes = metrics || affinities ? `<div class="decision-deltas">${metrics}${affinities}</div>` : '<p class="no-delta">No measurable state change.</p>';
    return `<section class="panel decision-feedback tone-${esc(feedback.tone)}" aria-live="polite" aria-atomic="true"><div class="panel-kicker">DECISION RESOLVED // EXACT OUTCOME</div><div class="decision-heading"><div><h2>${esc(feedback.choiceLabel)}</h2><p>${esc(feedback.eventTitle)}</p></div><span>${feedback.metrics.length} METRIC${feedback.metrics.length === 1 ? '' : 'S'} CHANGED</span></div>${changes}${additions ? `<div class="decision-additions">${additions}</div>` : ''}</section>`;
}
export function createGameUI(engine, world) {
    const resourceBar = document.querySelector('#resource-bar');
    const metaBar = document.querySelector('#meta-bar');
    const machine = document.querySelector('#machine-view');
    const civView = document.querySelector('#civilization-view');
    const worldShell = document.querySelector('#world-shell');
    const worldHud = document.querySelector('#world-hud');
    const civPanels = document.querySelector('#civilization-panels');
    const log = document.querySelector('#machine-log');
    let currentCivilizationKey = '';
    let lastFeedbackSequence = 0;
    let impactTimer = 0;
    const render = () => {
        const vm = buildViewModel(engine);
        replaceIfChanged(resourceBar, vm.resources.map(r => `<div class="resource"><span>${esc(r.name)}</span><strong>${fmt(r.amount)}</strong></div>`).join(''));
        replaceIfChanged(metaBar, `<span>Machine Insight <b>${vm.machineInsight}</b></span><span>Cultivation Credits <b>${vm.cultivationCreditsThisUniverse}/${vm.universeRequirement}</b></span>${vm.systems.multiversePrestige ? `<span>Multiverse <b>${vm.universesThisMultiverse}/${vm.multiverseRequirement}</b></span>` : ''}`);
        machine.classList.toggle('is-hidden', vm.phase !== 'machine');
        civView.classList.toggle('is-hidden', vm.phase !== 'civilization');
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
        replaceIfChanged(log, vm.messages.length ? vm.messages.map(x => `<li>${esc(x)}</li>`).join('') : '<li>Machine record awaiting activity.</li>');
        bindActions();
    };
    const upgrades = (entries, layer) => entries.map(entry => { const d = entry.definition; const level = engine.upgradeLevel(layer, d.id), cost = engine.upgradeCost(layer, d.id), max = Number(d.max_level); const locked = entry.status === 'locked'; return `<article class="upgrade ${locked ? 'locked' : ''}"><div><h4>${esc(d.name)}</h4><p>${esc(d.description)}</p>${locked ? `<small>🔒 ${esc(entry.reason)}</small>` : `<small>${esc(d.currency.replaceAll('_', ' '))} ${fmt(cost)} · Level ${level}/${max}</small>`}</div><button data-action="upgrade" data-layer="${layer}" data-id="${esc(d.id)}" ${locked || level >= max || !engine.canPurchaseUpgrade(layer, d.id) ? 'disabled' : ''}>${level >= max ? 'MAX' : locked ? 'LOCKED' : 'INSTALL'}</button></article>`; }).join('');
    const optionCards = (items, kind, selected, locked) => items.map(x => `<article class="build-option ${selected === x.id ? 'selected' : ''}"><h4>${esc(x.name)}</h4><p>${esc(x.description)}</p>${x.objective ? `<div class="objective-brief"><span>DIRECTIVE OBJECTIVE</span><b>${esc(x.objective.title)}</b><small>${esc(x.objective.description)}</small></div>` : ''}<button data-action="${kind}" data-id="${esc(x.id)}" ${locked || selected === x.id ? 'disabled' : ''}>${selected === x.id ? 'ACTIVE' : locked ? 'LOCKED FOR RUN' : 'SELECT'}</button></article>`).join('');
    function renderMachine(vm) {
        const previews = vm.previews.map((p) => `<article class="unlock-preview"><b>🔒 ${esc(p.name)}</b><span>${esc(p.condition)}</span></article>`).join('');
        const previewTraits = vm.previewTraits.map((trait) => `<span>${esc(trait.name)}</span>`).join('');
        const directiveDraft = vm.systems.directives ? (vm.directives.length ? `<div class="option-grid directive-draft">${optionCards(vm.directives, 'directive', vm.runBuild.selectedDirective, vm.runBuild.directiveLocked)}</div>` : '<p>No Directive offers are currently stable.</p>') : '';
        const lastHarvest = vm.lastHarvest.grade ? `<div class="last-harvest"><span>LAST HARVEST</span><b>${esc(String(vm.lastHarvest.grade).toUpperCase())}</b><small>+${fmt(Number(vm.lastHarvest.credits ?? 0))} Cultivation Credits · ×${Number(vm.lastHarvest.reward_multiplier ?? 1).toFixed(2)} yield</small></div>` : '';
        replaceIfChanged(machine, `
      <section class="machine-hero"><div><p class="eyebrow">REALITY CONSUMPTION ENGINE // BROWSER NODE</p><h2>Machine Control</h2><p>Cultivate civilizations, shape their histories, and harvest reality without allowing the crop to understand the farm.</p></div>${lastHarvest}</section>
      ${card('NEXT CIVILIZATION', `<div class="run-preview"><div><span class="panel-kicker">STARTING TRAITS // DETERMINISTIC PREVIEW</span><div class="tag-row preview-traits">${previewTraits || '<span>Trait archive unavailable</span>'}</div></div>${directiveDraft}<button class="primary big start-run" data-action="start" ${vm.canStartCivilization ? '' : 'disabled'}>START CIVILIZATION</button>${vm.startReason ? `<p class="start-reason" role="status">${esc(vm.startReason)}</p>` : ''}</div>`, 'run-preparation')}
      ${card('Machine Upgrades', `<div class="upgrade-list">${upgrades(vm.machineUpgrades, 'machine')}</div>`)}
      ${vm.systems.breedingMatrices ? card('Breeding Matrix', vm.matrices.length ? `<div class="option-grid">${optionCards(vm.matrices, 'matrix', vm.runBuild.selectedBreedingMatrix, vm.runBuild.matrixLocked)}</div>` : '<p>No breeding matrices are currently understood.</p>') : ''}
      ${vm.systems.universeUpgrades ? card('Universe Upgrades', `<div class="upgrade-list">${upgrades(vm.universeUpgrades, 'universe')}</div>`) : ''}
      ${vm.systems.axioms ? card('Axiom Upgrades', `<div class="upgrade-list">${upgrades(vm.axiomUpgrades, 'axiom')}</div>`) : ''}
      ${previews ? card('Next Discoveries', `<div class="preview-grid">${previews}</div>`) : ''}
      <section class="prestige-row">${vm.systems.universePrestige ? `<button data-action="universe" ${vm.canConsumeUniverse ? '' : 'disabled'}>CONSUME UNIVERSE <span>${vm.cultivationCreditsThisUniverse}/${vm.universeRequirement} Cultivation Credits</span></button>` : ''}${vm.systems.multiversePrestige ? `<button class="danger" data-action="multiverse" ${vm.canConsumeMultiverse ? '' : 'disabled'}>COLLAPSE MULTIVERSE <span>${vm.universesThisMultiverse}/${vm.multiverseRequirement}</span></button>` : ''}</section>`);
    }
    const tacticalRail = (vm) => { const t = vm.tactical; if (!t)
        return ''; const pips = Array.from({ length: t.controlMax }, (_, index) => `<i class="${index < t.controlCapacity ? 'active' : ''}" aria-hidden="true"></i>`).join(''); const actions = t.actions.map((action) => `<div class="tactical-action-wrap"><button data-action="tactical" data-id="${esc(action.id)}" aria-describedby="tactical-reason-${esc(action.id)}" ${action.enabled ? '' : 'disabled'}><span><kbd>${esc(action.shortcut)}</kbd>${esc(action.label)}</span><b>${esc(action.summary)}</b><small>${esc(action.risk)} · COST ${action.cost}</small></button><span id="tactical-reason-${esc(action.id)}" class="tactical-reason" data-tactical-reason="${esc(action.id)}">${esc(action.reason)}</span></div>`).join(''); return `<section class="tactical-rail entropy-${esc(t.entropyBand.id)}" aria-label="Tactical actions"><div class="tactical-status"><div><span class="panel-kicker">TACTICAL ACTIONS</span><strong>CONTROL CAPACITY</strong><div class="control-pips" aria-label="${t.controlCapacity} of ${t.controlMax} Control available">${pips}<b data-live="control-value">${t.controlCapacity}/${t.controlMax}</b></div></div><div class="entropy-readout"><span>ENTROPY // <b data-live="entropy-band">${esc(t.entropyBand.label)}</b></span><strong data-live="entropy-value">${t.entropy.toFixed(1)}</strong><div class="entropy-meter"><i data-live="entropy-meter" style="width:${pct(t.entropy)}"></i></div><small>Containment <b>${t.containmentRating}</b> / Required <b>${t.requiredContainment}</b></small></div></div><div class="tactical-actions">${actions}</div><p class="tactical-failure" aria-live="polite" data-live="tactical-failure">${esc(vm.lastActionFailure)}</p></section>`; };
    function renderCivilization(vm) {
        const c = vm.civilization;
        if (!c)
            return;
        const event = vm.event;
        const path = c.path;
        const harvest = vm.harvest.controlled;
        const chaotic = vm.harvest.chaotic;
        replaceIfChanged(worldHud, `<div class="world-chip"><span>${esc(c.faction.name)}</span><b>${esc(c.species.name)}</b></div><div class="world-chip path-chip">${path.dominantName ? `DOMINANT: <b>${esc(path.dominantName)}</b>` : 'PATH: <b>UNRESOLVED</b>'}</div><div class="world-state-strip"><span>ERA <b data-live="world-era">${esc(ERA_NAMES[c.era])}</b></span><span>DEV <b data-live="world-development">${c.development.toFixed(0)}</b></span><span>STB <b data-live="world-stability">${c.stats.stability.toFixed(0)}</b></span><span>SAN <b data-live="world-sanity">${c.stats.sanity.toFixed(0)}</b></span><span>AWR <b data-live="world-awareness">${c.stats.awareness.toFixed(0)}</b></span><span>ATT <b data-live="world-attention">${c.stats.attention.toFixed(0)}</b></span><span>ENT <b data-live="world-entropy">${vm.tactical.entropy.toFixed(0)}</b></span></div><div class="swipe-hint">↔ DRAG / SWIPE TO EXPLORE</div><button class="world-arrow left" data-action="pan" data-dir="-1" aria-label="Pan left">‹</button><button class="world-arrow right" data-action="pan" data-dir="1" aria-label="Pan right">›</button>`);
        const eventCard = event ? `<section class="panel intervention"><div class="panel-kicker">CURRENT INTERVENTION${event.probed ? ' // PROBED' : ''}</div><h2>${esc(event.title)}</h2><p class="event-body">${esc(event.body)}</p>${event.predictionLocked ? '<div class="prediction-lock">PREDICTION CORE OFFLINE // Spend 1 Control on Probe to reveal risk directions.</div>' : ''}<div class="choice-list">${event.choices.map((ch) => `<button data-action="choice" data-index="${ch.index}"><b>${esc(ch.label)}</b>${ch.prediction ? `<span>${esc(ch.prediction)}</span>` : ''}</button>`).join('')}</div>${engine.upgradeLevel('axiom', 'axiom_multiple_choice') > 0 ? '<button class="ghost" data-action="reroll">REROLL WITH PARADOX</button>' : ''}</section>` : `<section class="panel intervention quiet"><div class="panel-kicker">CURRENT INTERVENTION</div><h2>Monitoring civilization...</h2><p data-live="event-timer">Next intervention window in approximately ${Math.max(0, c.eventTimer).toFixed(1)} simulation seconds.</p></section>`;
        const tendencies = path.tendencies.length ? path.tendencies.map((t) => `<li><b>${esc(t.name)}</b><span>${esc(t.label)}</span></li>`).join('') : '<li><span>No coherent tendency yet.</span></li>';
        const objectiveCard = vm.directiveObjective ? card('Directive Objective', `<div class="objective-progress ${vm.directiveObjective.completed ? 'complete' : ''}"><span>${vm.directiveObjective.completed ? 'COMPLETE' : 'ACTIVE'}</span><b>${esc(vm.directiveObjective.title)}</b><p>${esc(vm.directiveObjective.description)}</p><small>OBJECTIVE BONUS // ×1.15 rewards + 1 Cultivation Credit</small></div>`, 'directive-objective') : '';
        replaceIfChanged(civPanels, `${tacticalRail(vm)}${decisionFeedback(vm.feedback)}${eventCard}${objectiveCard}
      ${card('Strategic Overview', `<div class="stats-grid">${statBar('Reality Stability', c.stats.stability, c.stats.stabilityMax, 'stability')}${statBar('Machine Awareness', c.stats.awareness, 100, 'awareness')}${statBar('Collective Sanity', c.stats.sanity, 100, 'sanity')}${statBar('Cosmic Attention', c.stats.attention, 100, 'attention')}</div><div class="overview-line"><span>Era <b data-live="era">${ERA_NAMES[c.era]}</b></span><span>Year <b data-live="year">${fmt(c.years)}</b></span><span>Development <b data-live="development">${c.development.toFixed(1)}</b></span></div>`)}
      <details><summary>Era Progression</summary>${card('', `<p>Emergence: 0–2,499 years · Expansion: 2,500–6,499 · Transcendence: 6,500+</p><div class="era-track"><i style="width:${Math.min(100, c.years / 6500 * 100)}%"></i></div>`)}</details>
      <details><summary>Cosmic Conditions</summary>${card('', `<p>${c.stats.attention > 65 ? 'External observers are converging.' : c.stats.awareness > 65 ? 'The civilization is becoming dangerously aware of cultivation.' : 'Cosmic observation remains tolerable.'}</p>`)}</details>
      <details><summary>Intervention Control</summary>${card('', `<div class="speed-row"><span>Simulation speed</span>${[1, 2, 4].filter(x => x <= vm.maxSimulationSpeed).map(x => `<button data-action="speed" data-speed="${x}" class="${vm.simulationSpeed === x ? 'active' : ''}">${x}×</button>`).join('')}</div>`)}</details>
      <details><summary>Civilization Identity</summary>${card('', `<p><b>${esc(c.species.name)}</b> · ${esc(c.species.bodyType)} · ${esc(c.species.culture)}</p><p>Visual motif: ${esc(c.species.motif)}</p><p><b>${esc(c.faction.name)}</b><br>Doctrine: ${esc(c.faction.doctrine)}<br>Focus: ${esc(c.faction.focus)}</p>`)}</details>
      <details><summary>Species & Faction Dossier</summary>${card('', `<div class="tag-row">${c.traits.map((t) => `<span>${esc(t.name)}</span>`).join('')}</div><h4>Emerging Tendencies</h4><ul class="tendency-list">${tendencies}</ul>${c.institutions.length ? `<h4>Institutions</h4><p>${c.institutions.map(esc).join(' · ')}</p>` : ''}`)}</details>
      <details><summary>Harvest Projection</summary>${card('', `<div class="harvest-grade"><span>HARVEST GRADE</span><b>${esc(harvest.grade.toUpperCase())}</b><small>×${harvest.rewardMultiplier.toFixed(2)} yield · +${harvest.credits} Cultivation Credit${harvest.credits === 1 ? '' : 's'}${harvest.objectiveCompleted ? ' · OBJECTIVE BONUS ACTIVE' : ''}</small></div><div class="harvest-grid"><div><b>CONTROLLED</b><span>Causal ${fmt(harvest.rewards.causal_mass)}</span><span>Cognition ${engine.resourceDiscovered('cognition') ? fmt(harvest.rewards.cognition) : '???'}</span><span>Paradox ${engine.resourceDiscovered('paradox') ? fmt(harvest.rewards.paradox) : '???'}</span><span>Existence ${engine.resourceDiscovered('existence') ? fmt(harvest.rewards.existence) : '???'}</span></div><div><b>CHAOTIC</b><span>Causal ${fmt(chaotic.rewards.causal_mass)}</span><span>Paradox ${engine.resourceDiscovered('paradox') ? fmt(chaotic.rewards.paradox) : '???'}</span><small>Automatic at zero Stability; Premature collapses retain a salvage floor.</small></div></div>`)}</details>
      <details><summary>Civilization Record</summary>${card('', `<ol class="history">${c.history.length ? c.history.map((h) => `<li>${esc(h)}</li>`).join('') : '<li>No recorded history yet.</li>'}</ol>`)}</details>
      ${c.stats.stability < 25 || vm.tactical.entropy >= 100 ? '<div class="collapse-warning">⚠ REALITY COLLAPSE IMMINENT — CHAOTIC HARVEST WILL TRIGGER AT ZERO STABILITY</div>' : ''}
      <section class="harvest-actions"><button class="primary" data-action="harvest">CONTROLLED HARVEST</button><button class="danger" data-action="chaos">FORCE CHAOTIC HARVEST</button><button class="ghost" data-action="abandon">ABANDON WITHOUT REWARD</button></section>`);
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
        const setWorldText = (selector, value) => { const element = worldHud.querySelector(selector); if (element)
            element.textContent = value; };
        setText('[data-live="event-timer"]', `Next intervention window in approximately ${Math.max(0, c.eventTimer).toFixed(1)} simulation seconds.`);
        setText('[data-live="era"]', ERA_NAMES[c.era]);
        setText('[data-live="year"]', fmt(c.years));
        setText('[data-live="development"]', c.development.toFixed(1));
        setWorldText('[data-live="world-era"]', ERA_NAMES[c.era]);
        setWorldText('[data-live="world-development"]', c.development.toFixed(0));
        setWorldText('[data-live="world-stability"]', c.stats.stability.toFixed(0));
        setWorldText('[data-live="world-sanity"]', c.stats.sanity.toFixed(0));
        setWorldText('[data-live="world-awareness"]', c.stats.awareness.toFixed(0));
        setWorldText('[data-live="world-attention"]', c.stats.attention.toFixed(0));
        setWorldText('[data-live="world-entropy"]', vm.tactical.entropy.toFixed(0));
        setText('[data-live="entropy-value"]', vm.tactical.entropy.toFixed(1));
        setText('[data-live="entropy-band"]', vm.tactical.entropyBand.label);
        setText('[data-live="control-value"]', `${vm.tactical.controlCapacity}/${vm.tactical.controlMax}`);
        setText('[data-live="tactical-failure"]', vm.lastActionFailure);
        const entropyMeter = civPanels.querySelector('[data-live="entropy-meter"]');
        if (entropyMeter)
            entropyMeter.style.width = pct(vm.tactical.entropy);
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
        case 'pan':
            world.nudge(Number(el.dataset.dir));
            break;
    } }); }); }
    engine.onChange(render);
    render();
    return { render };
}
//# sourceMappingURL=app.js.map