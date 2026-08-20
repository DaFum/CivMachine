import type { GameEngine } from '../game/engine.js';
import { ERA_NAMES } from '../game/engine.js';
import { buildViewModel, civilizationRenderKey } from './view-model.js';
import { CivilizationPaths } from '../game/paths.js';
import type { WorldController } from '../render/world.js';

const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]!));
const fmt=(n:number)=>Math.abs(n)>=1e6?`${(n/1e6).toFixed(2)}M`:Math.abs(n)>=1e3?`${(n/1e3).toFixed(1)}K`:Math.round(n).toLocaleString('en-US');
const pct=(v:number,max=100)=>`${Math.max(0,Math.min(100,v/max*100)).toFixed(0)}%`;
const RESOURCE_SHORT:Readonly<Record<string,string>>={causal_mass:'Causal',cognition:'Cognition',paradox:'Paradox',existence:'Existence'};
const CONTROLLED_KEYS=['causal_mass','cognition','paradox','existence'] as const;
const CHAOTIC_KEYS=['causal_mass','paradox'] as const;
// Reserve cost and harvest yield both move with Cultivation Depth on every tick. They must not enter
// the structural render key -- that would rebuild the DOM continuously -- so they are written through
// the live refresh instead, from the same builders the structural render uses.
const reserveCostText=(entry:any)=>`COST ${fmt(entry.cost)} ${entry.currency.replaceAll('_',' ')} · ${entry.usesLeft} OF ${entry.maxUses} LEFT`;
const harvestSummaryText=(details:any)=>`×${details.rewardMultiplier.toFixed(2)} yield · +${details.credits} Cultivation Credit${details.credits===1?'':'s'}${details.objectiveCompleted?' · OBJECTIVE BONUS ACTIVE':''}`;
function statBar(name:string,value:number,max=100,kind=''){return `<div class="stat-row" data-stat="${esc(kind)}"><div><span>${esc(name)}</span><b>${value.toFixed(1)}${max!==100?` / ${max.toFixed(0)}`:''}</b></div><div class="meter ${kind}"><i style="width:${pct(value,max)}"></i></div></div>`;}
function card(title:string,body:string,cls=''){return `<section class="panel ${cls}"><h3>${title}</h3>${body}</section>`;}
function replaceIfChanged(element:HTMLElement,html:string){if(element.innerHTML===html)return false;element.innerHTML=html;return true;}
const signed=(value:number)=>`${value>0?'+':''}${value.toFixed(1)}`;
const metricTone=(item:any)=>((item.key==='awareness'||item.key==='attention'||item.key==='entropy'||item.key==='eventTimer')?item.delta<0:item.delta>0)?'gain':'loss';

function decisionFeedback(feedback:any){
  if(!feedback)return '';
  const metrics=feedback.metrics.map((item:any)=>`<article class="decision-delta"><span>${esc(item.label)}</span><b>${item.before.toFixed(1)} → ${item.after.toFixed(1)}</b><em class="${metricTone(item)}">${signed(item.delta)}</em></article>`).join('');
  const affinities=feedback.affinities.map((item:any)=>`<article class="decision-delta affinity"><span>${esc(item.label)} affinity</span><b>Path influence</b><em class="${item.delta>0?'gain':'loss'}">${signed(item.delta)}</em></article>`).join('');
  const additions=feedback.additions.map((item:any)=>`<span class="decision-addition">+ ${esc(item.label)} <small>${esc(item.kind.replaceAll('_',' '))}</small></span>`).join('');
  const changes=metrics||affinities?`<div class="decision-deltas">${metrics}${affinities}</div>`:'<p class="no-delta">No measurable state change.</p>';
  return `<section class="panel decision-feedback tone-${esc(feedback.tone)}" aria-live="polite" aria-atomic="true"><div class="panel-kicker">DECISION RESOLVED // EXACT OUTCOME</div><div class="decision-heading"><div><h2>${esc(feedback.choiceLabel)}</h2><p>${esc(feedback.eventTitle)}</p></div><span>${feedback.metrics.length} METRIC${feedback.metrics.length===1?'':'S'} CHANGED</span></div>${changes}${additions?`<div class="decision-additions">${additions}</div>`:''}</section>`;
}

export function createGameUI(engine:GameEngine,world:WorldController){
  const resourceBar=document.querySelector('#resource-bar') as HTMLElement;
  const metaBar=document.querySelector('#meta-bar') as HTMLElement;
  const machine=document.querySelector('#machine-view') as HTMLElement;
  const civView=document.querySelector('#civilization-view') as HTMLElement;
  const worldShell=document.querySelector('#world-shell') as HTMLElement;
  const worldHud=document.querySelector('#world-hud') as HTMLElement;
  const civPanels=document.querySelector('#civilization-panels') as HTMLElement;
  const victoryView=document.querySelector('#victory-view') as HTMLElement;
  const log=document.querySelector('#machine-log') as HTMLElement;
  let currentCivilizationKey='';
  let lastFeedbackSequence=0;
  let impactTimer=0;

  const render=()=>{
    const vm=buildViewModel(engine);
    replaceIfChanged(resourceBar,vm.resources.map(r=>`<div class="resource"><span>${esc(r.name)}</span><strong>${fmt(r.amount)}</strong></div>`).join(''));
    replaceIfChanged(metaBar,`<span>Machine Insight <b>${vm.machineInsight}</b></span><span>Cultivation Credits <b>${vm.cultivationCreditsThisUniverse}/${vm.universeRequirement}</b></span><span>Milestones <b>${vm.milestones.completed}/${vm.milestones.total}</b></span>${vm.systems.multiversePrestige?`<span>Multiverse <b>${vm.universesThisMultiverse}/${vm.multiverseRequirement}</b></span>`:''}${vm.convergence.convergences?`<span>Convergences <b>${vm.convergence.convergences}</b></span>`:''}`);
    machine.classList.toggle('is-hidden',vm.phase!=='machine');
    civView.classList.toggle('is-hidden',vm.phase!=='civilization');
    victoryView.classList.toggle('is-hidden',vm.phase!=='victory');
    if(vm.phase==='victory')renderVictory(vm);
    if(vm.phase==='machine'){
      currentCivilizationKey='';
      renderMachine(vm);
    }else{
      const nextKey=civilizationRenderKey(vm);
      if(nextKey!==currentCivilizationKey){
        renderCivilization(vm);
        currentCivilizationKey=nextKey;
      }else{
        refreshCivilizationLive(vm);
      }
    }
    replaceIfChanged(log,vm.messages.length?vm.messages.map(x=>`<li>${esc(x)}</li>`).join(''):'<li>Machine record awaiting activity.</li>');
    bindActions();
  };

  const upgrades=(entries:any[],layer:string)=>entries.map(entry=>{const d=entry.definition;const level=engine.upgradeLevel(layer as any,d.id),cost=engine.upgradeCost(layer as any,d.id),max=Number(d.max_level);const locked=entry.status==='locked';return `<article class="upgrade ${locked?'locked':''}"><div><h4>${esc(d.name)}</h4><p>${esc(d.description)}</p>${locked?`<small>🔒 ${esc(entry.reason)}</small>`:`<small>${esc(d.currency.replaceAll('_',' '))} ${fmt(cost)} · Level ${level}/${max}</small>`}</div><button data-action="upgrade" data-layer="${layer}" data-id="${esc(d.id)}" ${locked||level>=max||!engine.canPurchaseUpgrade(layer as any,d.id)?'disabled':''}>${level>=max?'MAX':locked?'LOCKED':'INSTALL'}</button></article>`;}).join('');

  const optionCards=(items:any[],kind:'directive'|'matrix',selected:string,locked:boolean)=>items.map(x=>`<article class="build-option ${selected===x.id?'selected':''}"><h4>${esc(x.name)}</h4><p>${esc(x.description)}</p>${x.objective?`<div class="objective-brief"><span>DIRECTIVE OBJECTIVE</span><b>${esc(x.objective.title)}</b><small>${esc(x.objective.description)}</small></div>`:''}<button data-action="${kind}" data-id="${esc(x.id)}" ${locked||selected===x.id?'disabled':''}>${selected===x.id?'ACTIVE':locked?'LOCKED FOR RUN':'SELECT'}</button></article>`).join('');

  const milestoneRegister=(vm:any)=>{const groups=['CULTIVATION','HARVEST','PATHS','PRESTIGE','CONVERGENCE'];const sections=groups.map(group=>{const entries=vm.milestones.entries.filter((entry:any)=>entry.group===group);if(!entries.length)return '';const open=entries.filter((entry:any)=>!entry.completed).map((entry:any)=>`<article class="milestone"><div><b>${esc(entry.title)}</b><p>${esc(entry.description)}</p></div><div class="milestone-progress"><div class="meter"><i style="width:${pct(entry.current,entry.target)}"></i></div><small>${fmt(entry.current)} / ${fmt(entry.target)} · INSIGHT +${entry.insight}</small></div></article>`).join('');const done=entries.filter((entry:any)=>entry.completed).map((entry:any)=>`<article class="milestone complete"><b>\u2713 ${esc(entry.title)}</b><small>INSIGHT +${entry.insight}</small></article>`).join('');return `<div class="milestone-group"><span class="panel-kicker">${esc(group)}</span>${open}${done}</div>`;}).join('');return card('MILESTONE REGISTER',`<div class="milestone-register"><p class="register-summary">${vm.milestones.completed} of ${vm.milestones.total} milestones recorded. Each one pays Machine Insight.</p>${sections}</div>`,'milestone-card');};
  const convergenceCard=(vm:any)=>{if(!vm.convergence.visible)return '';const rows=vm.convergence.requirements.map((entry:any)=>`<li class="${entry.met?'met':'open'}"><span>${entry.met?'\u2713':'\u25CB'} ${esc(entry.label)}</span><b>${fmt(entry.current)} / ${fmt(entry.target)}</b></li>`).join('');return card('GREAT CONVERGENCE',`<div class="convergence-card"><p>Terminal cultivation begins in APOTHEOSIS with no yield and 1.6\u00D7 Entropy. It is won by a controlled harvest at Cultivation Depth ${vm.convergence.targetDepth.toFixed(1)} or deeper. Failure costs nothing but the run.</p><ul class="convergence-requirements">${rows}</ul><button class="primary big" data-action="convergence" ${vm.convergence.unlocked?'':'disabled'}>INITIATE GREAT CONVERGENCE</button>${vm.convergence.unlocked?'':`<p class="start-reason" role="status">${esc(vm.convergence.reason)}</p>`}${vm.convergence.convergences?`<small>Convergences achieved: ${vm.convergence.convergences}</small>`:''}</div>`,'convergence-panel');};
  function renderMachine(vm:any){
    const previews=vm.previews.map((p:any)=>`<article class="unlock-preview"><b>🔒 ${esc(p.name)}</b><span>${esc(p.condition)}</span></article>`).join('');
    const previewTraits=vm.previewTraits.map((trait:any)=>`<span>${esc(trait.name)}</span>`).join('');
    const directiveDraft=vm.systems.directives?(vm.directives.length?`<div class="option-grid directive-draft">${optionCards(vm.directives,'directive',vm.runBuild.selectedDirective,vm.runBuild.directiveLocked)}</div>`:'<p>No Directive offers are currently stable.</p>'):'';
    const lastHarvest=vm.lastHarvest.grade?`<div class="last-harvest"><span>LAST HARVEST</span><b>${esc(String(vm.lastHarvest.grade).toUpperCase())}</b><small>+${fmt(Number(vm.lastHarvest.credits??0))} Cultivation Credits · ×${Number(vm.lastHarvest.reward_multiplier??1).toFixed(2)} yield</small></div>`:'';
    replaceIfChanged(machine,`
      <section class="machine-hero"><div><p class="eyebrow">REALITY CONSUMPTION ENGINE // BROWSER NODE</p><h2>Machine Control</h2><p>Cultivate civilizations, shape their histories, and harvest reality without allowing the crop to understand the farm.</p></div>${lastHarvest}</section>
      ${card('NEXT CIVILIZATION',`<div class="run-preview"><div><span class="panel-kicker">STARTING TRAITS // DETERMINISTIC PREVIEW</span><div class="tag-row preview-traits">${previewTraits||'<span>Trait archive unavailable</span>'}</div></div>${directiveDraft}<button class="primary big start-run" data-action="start" ${vm.canStartCivilization?'':'disabled'}>START CIVILIZATION</button>${vm.startReason?`<p class="start-reason" role="status">${esc(vm.startReason)}</p>`:''}</div>`,'run-preparation')}
      ${card('Machine Upgrades',`<div class="upgrade-list">${upgrades(vm.machineUpgrades,'machine')}</div>`)}
      ${vm.systems.breedingMatrices?card('Breeding Matrix',vm.matrices.length?`<div class="option-grid">${optionCards(vm.matrices,'matrix',vm.runBuild.selectedBreedingMatrix,vm.runBuild.matrixLocked)}</div>`:'<p>No breeding matrices are currently understood.</p>'):''}
      ${vm.systems.universeUpgrades?card('Universe Upgrades',`<div class="upgrade-list">${upgrades(vm.universeUpgrades,'universe')}</div>`):''}
      ${vm.systems.axioms?card('Axiom Upgrades',`<div class="upgrade-list">${upgrades(vm.axiomUpgrades,'axiom')}</div>`):''}
      ${convergenceCard(vm)}
      ${milestoneRegister(vm)}
      ${previews?card('Next Discoveries',`<div class="preview-grid">${previews}</div>`):''}
      <section class="prestige-row">${vm.systems.universePrestige?`<button data-action="universe" ${vm.canConsumeUniverse?'':'disabled'}>CONSUME UNIVERSE <span>${vm.cultivationCreditsThisUniverse}/${vm.universeRequirement} Cultivation Credits</span></button>`:''}${vm.systems.multiversePrestige?`<button class="danger" data-action="multiverse" ${vm.canConsumeMultiverse?'':'disabled'}>COLLAPSE MULTIVERSE <span>${vm.universesThisMultiverse}/${vm.multiverseRequirement}</span></button>`:''}</section>`);
  }

  const rewardText=(key:string,details:any)=>`${RESOURCE_SHORT[key]} ${key==='causal_mass'||engine.resourceDiscovered(key)?fmt(details.rewards[key]):'???'}`;
  const rewardSpan=(kind:string,key:string,details:any)=>`<span data-live="harvest-${kind}-${key}">${esc(rewardText(key,details))}</span>`;

  // Turns the computed urgency into the one sentence the player actually needs. The numbers behind it
  // -- development rate against seconds to cascade -- are exact, so the call is a calculation, not a
  // vibe: the next Cultivation Credit either fits inside the remaining window or it does not.
  const urgencyText=(h:any)=>{
    const u=h.urgency;
    if(u.state==='cascading')return 'CASCADE UNDER WAY // harvest now or lose 40% of the credits';
    const left=Number.isFinite(u.secondsOfRunLeft)?`${Math.floor(u.secondsOfRunLeft)}s`:'no limit';
    if(u.state==='harvest')return `HARVEST NOW // credit ${u.nextCredit} needs ${Math.ceil(u.secondsToNextCredit)}s, the run can reach ${left}`;
    if(u.state==='closing')return `CLOSING // credit ${u.nextCredit} in ${Math.ceil(u.secondsToNextCredit)}s, the run can reach ${left}`;
    if(h.controlled.grade==='premature')return 'BUILDING // no credits until the run clears Premature';
    return `BUILDING // credit ${u.nextCredit} in ${Math.ceil(u.secondsToNextCredit)}s`;
  };
  // The harvest readout sits inside the rail rather than in a collapsed panel: it answers the same
  // question as CASCADE IN Xs -- stay or harvest -- and the two are only useful side by side.
  const harvestReadout=(vm:any)=>{const h=vm.harvest;if(!h)return'';const next=h.nextBand?`NEXT <b>${esc(h.nextBand.label.toUpperCase())}</b> AT DEPTH ${h.nextBand.depthNeeded} FOR ×${h.nextBand.yieldMultiplier.toFixed(2)}`:'DEEPEST BAND REACHED';return `<div class="harvest-readout urgency-${esc(h.urgency.state)}"><span>HARVEST GRADE // <b>${esc(h.controlled.grade.toUpperCase())}</b></span><strong data-live="depth">${h.depth.toFixed(1)}</strong><div class="harvest-meter" aria-hidden="true"><i data-live="harvest-meter" style="width:${pct(h.bandProgress)}"></i></div><small data-live="harvest-summary">${esc(harvestSummaryText(h.controlled))}</small><small class="next-band">${next}</small><p class="harvest-call" role="status" data-live="harvest-call">${esc(urgencyText(h))}</p></div>`;};
  const tacticalRail=(vm:any)=>{const t=vm.tactical;if(!t)return'';const pips=Array.from({length:t.controlMax},(_,index)=>`<i class="${index<t.controlCapacity?'active':''}" aria-hidden="true"></i>`).join('');const keys=t.actions.map((action:any)=>`<b>${esc(action.shortcut)}</b>`).join(' ');const actions=t.actions.map((action:any)=>`<div class="tactical-action-wrap"><button data-action="tactical" data-id="${esc(action.id)}" aria-describedby="tactical-reason-${esc(action.id)}" ${action.enabled?'':'disabled'}><span><kbd>${esc(action.shortcut)}</kbd>${esc(action.label)}</span><b>${esc(action.summary)}</b><small>${esc(action.risk)} · COST ${action.cost}</small></button><span id="tactical-reason-${esc(action.id)}" class="tactical-reason" data-tactical-reason="${esc(action.id)}">${esc(action.reason)}</span></div>`).join('');return `<section class="tactical-rail entropy-${esc(t.entropyBand.id)}" aria-label="Tactical actions"><div class="tactical-status"><div><div class="rail-head"><span class="panel-kicker">TACTICAL ACTIONS</span><span class="rail-keys">KEYS ${keys}</span></div><strong>CONTROL CAPACITY</strong><div class="control-pips" aria-label="${t.controlCapacity} of ${t.controlMax} Control available">${pips}<b data-live="control-value">${t.controlCapacity}/${t.controlMax}</b></div></div><div class="entropy-readout"><span>ENTROPY // <b data-live="entropy-band">${esc(t.entropyBand.label)}</b></span><strong data-live="entropy-value">${t.entropy.toFixed(1)}</strong><div class="entropy-meter"><i data-live="entropy-meter" style="width:${pct(t.entropy)}"></i></div><small>Containment <b>${t.containmentRating}</b> · Pressure <b data-live="pressure-multiplier">×${t.pressureMultiplier.toFixed(2)}</b> · <b data-live="entropy-rate">${t.entropyRate.toFixed(2)}</b>/s</small><small class="cascade-eta">CASCADE IN <b data-live="cascade-eta">${t.secondsToCascade.toFixed(0)}s</b> AT CURRENT COURSE</small></div>${harvestReadout(vm)}</div><div class="tactical-actions">${actions}</div><p class="tactical-failure" aria-live="polite" data-live="tactical-failure">${esc(vm.lastActionFailure)}</p></section>`;};

  function renderCivilization(vm:any){const c=vm.civilization;if(!c)return;const event=vm.event;const path=c.path;const harvest=vm.harvest.controlled;const chaotic=vm.harvest.chaotic;
    const terminalBanner=c.terminal?`<section class="panel terminal-banner ${vm.harvest.convergenceReady?'ready':''}"><div class="panel-kicker">TERMINAL CULTIVATION</div><b>CONVERGENCE TARGET DEPTH ${vm.convergence.targetDepth.toFixed(1)}</b><span>CURRENT <b data-live="convergence-depth">${vm.harvest.depth.toFixed(1)}</b> \u00B7 ${vm.harvest.convergenceReady?'CONVERGENCE READY':'INSUFFICIENT DEPTH'}</span></section>`:'';
    replaceIfChanged(worldHud,`<div class="world-chip"><span>${esc(c.faction.name)}</span><b>${esc(c.species.name)}</b></div><div class="world-chip path-chip">${path.dominantName?`DOMINANT: <b>${esc(path.dominantName)}</b>`:'PATH: <b>UNRESOLVED</b>'}</div><div class="world-state-strip"><span>ERA <b data-live="world-era">${esc(ERA_NAMES[c.era])}</b></span><span>DEV <b data-live="world-development">${c.development.toFixed(0)}</b></span><span>STB <b data-live="world-stability">${c.stats.stability.toFixed(0)}</b></span><span>SAN <b data-live="world-sanity">${c.stats.sanity.toFixed(0)}</b></span><span>AWR <b data-live="world-awareness">${c.stats.awareness.toFixed(0)}</b></span><span>ATT <b data-live="world-attention">${c.stats.attention.toFixed(0)}</b></span><span>ENT <b data-live="world-entropy">${vm.tactical.entropy.toFixed(0)}</b></span></div><div class="swipe-hint">↔ DRAG / SWIPE TO EXPLORE</div><button class="world-arrow left" data-action="pan" data-dir="-1" aria-label="Pan left">‹</button><button class="world-arrow right" data-action="pan" data-dir="1" aria-label="Pan right">›</button>`);
    const eventCard=event?`<section class="panel intervention"><div class="panel-kicker">CURRENT INTERVENTION${event.probed?' // PROBED':''}</div><h2>${esc(event.title)}</h2><p class="event-body">${esc(event.body)}</p>${event.predictionLocked?'<div class="prediction-lock">PREDICTION CORE OFFLINE // Spend 1 Control on Probe to reveal risk directions.</div>':''}<div class="choice-list">${event.choices.map((ch:any)=>`<button data-action="choice" data-index="${ch.index}"><b>${esc(ch.label)}</b>${ch.prediction?`<span>${esc(ch.prediction)}</span>`:''}</button>`).join('')}</div>${engine.upgradeLevel('axiom','axiom_multiple_choice')>0?'<button class="ghost" data-action="reroll">REROLL WITH PARADOX</button>':''}</section>`:`<section class="panel intervention quiet"><div class="panel-kicker">CURRENT INTERVENTION</div><h2>Monitoring civilization...</h2><p data-live="event-timer">Next intervention window in approximately ${Math.max(0,c.eventTimer).toFixed(1)} simulation seconds.</p></section>`;
    const tendencies=path.tendencies.length?path.tendencies.map((t:any)=>`<li><b>${esc(t.name)}</b><span>${esc(t.label)}</span></li>`).join(''):'<li><span>No coherent tendency yet.</span></li>';
    const objectiveCard=vm.directiveObjective?card('Directive Objective',`<div class="objective-progress ${vm.directiveObjective.completed?'complete':''}"><span>${vm.directiveObjective.completed?'COMPLETE':'ACTIVE'}</span><b>${esc(vm.directiveObjective.title)}</b><p>${esc(vm.directiveObjective.description)}</p><small>OBJECTIVE BONUS // ×1.15 rewards + 1 Cultivation Credit</small></div>`,'directive-objective'):'';
    const reserveCard=vm.machineReserve.length?card('Machine Reserve',`<p class="panel-note">Commit banked resources to the running civilization. Each use triples the price, and the price rises with the depth already reached.</p><div class="reserve-actions">${vm.machineReserve.map((entry:any)=>`<div class="tactical-action-wrap"><button data-action="reserve" data-id="${esc(entry.id)}" aria-describedby="reserve-reason-${esc(entry.id)}" ${entry.enabled?'':'disabled'}><span>${esc(entry.title)}</span><b>${esc(entry.summary)}</b><small data-reserve-cost="${esc(entry.id)}">${esc(reserveCostText(entry))}</small></button><span id="reserve-reason-${esc(entry.id)}" class="tactical-reason" data-reserve-reason="${esc(entry.id)}">${esc(entry.reason)}</span></div>`).join('')}</div>`,'machine-reserve'):'';
    replaceIfChanged(civPanels,`${terminalBanner}${tacticalRail(vm)}${decisionFeedback(vm.feedback)}${eventCard}${objectiveCard}${reserveCard}
      ${card('Strategic Overview',`<div class="stats-grid">${statBar('Reality Stability',c.stats.stability,c.stats.stabilityMax,'stability')}${statBar('Machine Awareness',c.stats.awareness,100,'awareness')}${statBar('Collective Sanity',c.stats.sanity,100,'sanity')}${statBar('Cosmic Attention',c.stats.attention,100,'attention')}</div><div class="overview-line"><span>Era <b data-live="era">${ERA_NAMES[c.era]}</b></span><span>Year <b data-live="year">${fmt(c.years)}</b></span><span>Development <b data-live="development">${c.development.toFixed(1)}</b></span></div>`)}
      <details><summary>Era Progression</summary>${card('',`<p>Emergence: 0–2,499 years · Expansion: 2,500–6,499 · Transcendence: 6,500–13,999 · Apotheosis: 14,000+</p><div class="era-track"><i style="width:${Math.min(100,c.years/14000*100)}%"></i></div>`)}</details>
      <details><summary>Cosmic Conditions</summary>${card('',`<p>${c.stats.attention>65?'External observers are converging.':c.stats.awareness>65?'The civilization is becoming dangerously aware of cultivation.':'Cosmic observation remains tolerable.'}</p>`)}</details>
      <details><summary>Intervention Control</summary>${card('',`<div class="speed-row"><span>Simulation speed</span>${[1,2,4].filter(x=>x<=vm.maxSimulationSpeed).map(x=>`<button data-action="speed" data-speed="${x}" class="${vm.simulationSpeed===x?'active':''}">${x}×</button>`).join('')}</div>`)}</details>
      <details><summary>Civilization Identity</summary>${card('',`<p><b>${esc(c.species.name)}</b> · ${esc(c.species.bodyType)} · ${esc(c.species.culture)}</p><p>Visual motif: ${esc(c.species.motif)}</p><p><b>${esc(c.faction.name)}</b><br>Doctrine: ${esc(c.faction.doctrine)}<br>Focus: ${esc(c.faction.focus)}</p>`)}</details>
      <details><summary>Species & Faction Dossier</summary>${card('',`<div class="tag-row">${c.traits.map((t:any)=>`<span>${esc(t.name)}</span>`).join('')}</div><h4>Emerging Tendencies</h4><ul class="tendency-list">${tendencies}</ul>${c.institutions.length?`<h4>Institutions</h4><p>${c.institutions.map(esc).join(' · ')}</p>`:''}`)}</details>
      <details><summary>Harvest Yield Detail</summary>${card('',`<p class="panel-note">Grade, Cultivation Depth and the next band are in the tactical rail above; this is the per-resource breakdown behind them.</p><div class="harvest-grid"><div><b>CONTROLLED</b>${CONTROLLED_KEYS.map(key=>rewardSpan('controlled',key,harvest)).join('')}</div><div><b>CHAOTIC</b>${CHAOTIC_KEYS.map(key=>rewardSpan('chaotic',key,chaotic)).join('')}<small>Automatic at zero Stability; Premature collapses retain a salvage floor.</small></div></div>`)}</details>
      <details><summary>Civilization Record</summary>${card('',`<ol class="history">${c.history.length?c.history.map((h:string)=>`<li>${esc(h)}</li>`).join(''):'<li>No recorded history yet.</li>'}</ol>`)}</details>
      ${c.stats.stability<25||vm.tactical.entropy>=100?'<div class="collapse-warning">⚠ REALITY COLLAPSE IMMINENT — CHAOTIC HARVEST WILL TRIGGER AT ZERO STABILITY</div>':''}
      <section class="harvest-actions"><button class="primary" data-action="harvest">CONTROLLED HARVEST</button><button class="danger" data-action="chaos">FORCE CHAOTIC HARVEST</button><button class="ghost" data-action="abandon">ABANDON WITHOUT REWARD</button></section>`);
    if(vm.feedback&&vm.feedback.sequence!==lastFeedbackSequence){
      lastFeedbackSequence=vm.feedback.sequence;
      worldShell.classList.remove('decision-impact','tone-positive','tone-negative','tone-mixed');
      void worldShell.offsetWidth;
      worldShell.classList.add('decision-impact',`tone-${vm.feedback.tone}`);
      window.clearTimeout(impactTimer);
      impactTimer=window.setTimeout(()=>worldShell.classList.remove('decision-impact','tone-positive','tone-negative','tone-mixed'),1800);
    }
  }

  function refreshCivilizationLive(vm:any){
    const c=vm.civilization;if(!c)return;
    const setText=(selector:string,value:string)=>{const element=civPanels.querySelector(selector);if(element)element.textContent=value;};
    const setWorldText=(selector:string,value:string)=>{const element=worldHud.querySelector(selector);if(element)element.textContent=value;};
    setText('[data-live="event-timer"]',`Next intervention window in approximately ${Math.max(0,c.eventTimer).toFixed(1)} simulation seconds.`);
    setText('[data-live="era"]',ERA_NAMES[c.era]);
    setText('[data-live="year"]',fmt(c.years));
    setText('[data-live="development"]',c.development.toFixed(1));
    setText('[data-live="cascade-eta"]',`${vm.tactical.secondsToCascade.toFixed(0)}s`);
    setText('[data-live="entropy-rate"]',vm.tactical.entropyRate.toFixed(2));
    setText('[data-live="pressure-multiplier"]',`×${vm.tactical.pressureMultiplier.toFixed(2)}`);
    setText('[data-live="depth"]',vm.harvest.depth.toFixed(1));
    setText('[data-live="convergence-depth"]',vm.harvest.depth.toFixed(1));
    setText('[data-live="harvest-summary"]',harvestSummaryText(vm.harvest.controlled));
    for(const key of CONTROLLED_KEYS)setText(`[data-live="harvest-controlled-${key}"]`,rewardText(key,vm.harvest.controlled));
    for(const key of CHAOTIC_KEYS)setText(`[data-live="harvest-chaotic-${key}"]`,rewardText(key,vm.harvest.chaotic));
    for(const entry of vm.machineReserve){
      setText(`[data-reserve-cost="${entry.id}"]`,reserveCostText(entry));
      setText(`[data-reserve-reason="${entry.id}"]`,entry.reason);
      const button=civPanels.querySelector<HTMLButtonElement>(`[data-action="reserve"][data-id="${entry.id}"]`);
      if(button)button.disabled=!entry.enabled;
    }
    setWorldText('[data-live="world-era"]',ERA_NAMES[c.era]);
    setWorldText('[data-live="world-development"]',c.development.toFixed(0));
    setWorldText('[data-live="world-stability"]',c.stats.stability.toFixed(0));
    setWorldText('[data-live="world-sanity"]',c.stats.sanity.toFixed(0));
    setWorldText('[data-live="world-awareness"]',c.stats.awareness.toFixed(0));
    setWorldText('[data-live="world-attention"]',c.stats.attention.toFixed(0));
    setWorldText('[data-live="world-entropy"]',vm.tactical.entropy.toFixed(0));
    setText('[data-live="entropy-value"]',vm.tactical.entropy.toFixed(1));
    setText('[data-live="entropy-band"]',vm.tactical.entropyBand.label);
    setText('[data-live="control-value"]',`${vm.tactical.controlCapacity}/${vm.tactical.controlMax}`);
    setText('[data-live="tactical-failure"]',vm.lastActionFailure);
    const entropyMeter=civPanels.querySelector<HTMLElement>('[data-live="entropy-meter"]');if(entropyMeter)entropyMeter.style.width=pct(vm.tactical.entropy);
    const harvestMeter=civPanels.querySelector<HTMLElement>('[data-live="harvest-meter"]');if(harvestMeter)harvestMeter.style.width=pct(vm.harvest.bandProgress);
    setText('[data-live="harvest-call"]',urgencyText(vm.harvest));
    // Both sides of the urgency threshold -- development rate and seconds to cascade -- move
    // continuously, so the state must never enter civilizationRenderKey or a run near a boundary
    // would rebuild the panel frame after frame. It rides the live refresh instead.
    const readout=civPanels.querySelector<HTMLElement>('.harvest-readout');
    if(readout)for(const state of ['building','closing','harvest','cascading'])readout.classList.toggle(`urgency-${state}`,vm.harvest.urgency.state===state);
    civPanels.querySelectorAll<HTMLElement>('.control-pips i').forEach((pip,index)=>pip.classList.toggle('active',index<vm.tactical.controlCapacity));
    for(const action of vm.tactical.actions){const button=civPanels.querySelector<HTMLButtonElement>(`[data-action="tactical"][data-id="${action.id}"]`);if(button)button.disabled=!action.enabled;const reason=civPanels.querySelector(`[data-tactical-reason="${action.id}"]`);if(reason)reason.textContent=action.reason;}
    const liveStats=[
      ['stability',c.stats.stability,c.stats.stabilityMax],
      ['awareness',c.stats.awareness,100],
      ['sanity',c.stats.sanity,100],
      ['attention',c.stats.attention,100],
    ] as const;
    liveStats.forEach(([kind,value,max])=>{
      const row=civPanels.querySelector(`[data-stat="${kind}"]`);
      const label=row?.querySelector('b');
      const meter=row?.querySelector<HTMLElement>('i');
      if(label)label.textContent=`${value.toFixed(1)}${max!==100?` / ${max.toFixed(0)}`:''}`;
      if(meter)meter.style.width=pct(value,max);
    });
  }

  function renderVictory(vm:any){const record=vm.victory?.record;if(!record){replaceIfChanged(victoryView,'');return;}const endgames=record.endgameStates.length?record.endgameStates.map((state:string)=>`<span>${esc(state.replace('endgame_','').replaceAll('_',' '))}</span>`).join(''):'<span>none recorded</span>';replaceIfChanged(victoryView,`<section class="panel victory-screen"><div class="panel-kicker">GREAT CONVERGENCE ${record.convergence}</div><h2>The Machine Closes Its Ledger</h2><p>A civilization was cultivated to the depth at which the harvest and the harvester stop being different operations.</p><div class="victory-stats"><article><span>SEED</span><b>${fmt(record.seed)}</b></article><article><span>YEARS</span><b>${fmt(record.years)}</b></article><article><span>ERA</span><b>${esc(ERA_NAMES[record.era])}</b></article><article><span>DEPTH</span><b>${record.depth.toFixed(1)}</b></article><article><span>DEVELOPMENT</span><b>${fmt(record.development)}</b></article><article><span>DOMINANT PATH</span><b>${esc(record.dominantPath?CivilizationPaths.displayName(record.dominantPath):'unresolved')}</b></article></div><div class="victory-endgames">${endgames}</div><p class="victory-bonus">Permanent reward: \u00D7${(1+.25*vm.victory.convergences).toFixed(2)} harvest yield and +${2*vm.victory.convergences} Containment.</p><button class="primary big" data-action="acknowledge-victory">CONTINUE</button></section>`);}
  function bindActions(){document.querySelectorAll<HTMLElement>('[data-action]').forEach(el=>{if(el.dataset.bound)return;el.dataset.bound='1';el.addEventListener('click',()=>{const a=el.dataset.action;switch(a){case'start':engine.startCivilization();break;case'upgrade':engine.purchaseUpgrade(el.dataset.layer as any,el.dataset.id!);break;case'directive':engine.selectDirective(el.dataset.id!);break;case'matrix':engine.selectBreedingMatrix(el.dataset.id!);break;case'universe':engine.consumeUniverse();break;case'multiverse':engine.consumeMultiverse();break;case'choice':engine.chooseEvent(Number(el.dataset.index));break;case'tactical':engine.useTacticalAction(el.dataset.id as any);break;case'reserve':engine.useRunIntervention(el.dataset.id!);break;case'reroll':engine.rerollEvent();break;case'speed':engine.setSimulationSpeed(Number(el.dataset.speed));break;case'harvest':engine.harvest(false);break;case'chaos':engine.harvest(true);break;case'abandon':engine.returnToMachineWithoutReward();break;case'convergence':engine.startConvergenceRun();break;case'acknowledge-victory':engine.acknowledgeVictory();break;case'pan':world.nudge(Number(el.dataset.dir));break;}});});}
  engine.onChange(render);render();return{render};
}
