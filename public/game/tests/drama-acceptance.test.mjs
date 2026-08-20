import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../dist/game/engine.js';
import { civilizationDramaPhase } from '../dist/game/drama.js';
import { buildDecisionFeedback, captureDecisionSnapshot } from '../dist/game/decision-feedback.js';
import { applyWorldMemory } from '../dist/game/world-memory.js';
import { pathIdentity } from '../dist/render/identity.js';
import { worldPresentation } from '../dist/render/world-presentation.js';
import { RenderQualityController, qualityFactors } from '../dist/render/quality.js';
import { applyQualityToLiveSample } from '../dist/render/world-model.js';

function civ(seed=18000){ return GameEngine.createCivilizationForTest(seed); }

test('acceptance A: a fragile early civilization is valid content, not a missing phase', () => {
  const early=civ(); early.development=65; early.eventChoices=0;
  assert.equal(civilizationDramaPhase(early).name,'emergence');
  early.development=90;
  assert.equal(civilizationDramaPhase(early).name,'expansion');
});

test('acceptance B: Machine Faith consolidation becomes an entrenched visible identity', () => {
  const world=civ(18001); world.pathState.affinity.machine_faith=8; world.pathState.dominantPath='machine_faith';
  world.pathState.completedEvents.push('synod_of_the_second_engine');
  assert.equal(pathIdentity(world).tier,3);
  const before=captureDecisionSnapshot(world); world.development+=16; const after=captureDecisionSnapshot(world);
  const feedback=buildDecisionFeedback(1,{id:'synod_of_the_second_engine',title:'Synod'},{label:'Consolidate'},before,after);
  world.visualMemory=applyWorldMemory(world.seed,world.visualMemory,feedback);
  assert.ok(world.visualMemory.marks.some(mark=>mark.domain==='identity' && mark.motif==='engine_shrine'));
});

test('acceptance C: crisis history can be repaired but its scar survives', () => {
  const world=civ(18002);
  const base={sequence:1,eventTitle:'',choiceLabel:'',tone:'negative',metrics:[],affinities:[],additions:[],consequence:{significance:'turning_point',tags:['reality_damage'],transitions:{},signatureProfile:'crisis:entropy_50'}};
  world.visualMemory=applyWorldMemory(world.seed,world.visualMemory,{...base,eventId:'entropy_crisis_50'});
  world.visualMemory=applyWorldMemory(world.seed,world.visualMemory,{...base,eventId:'damage',consequence:{...base.consequence,significance:'major',signatureProfile:'',tags:['civil_unrest']} });
  const scar=structuredClone(world.visualMemory.scars);
  world.visualMemory=applyWorldMemory(world.seed,world.visualMemory,{...base,eventId:'tactical:stabilize',consequence:{...base.consequence,significance:'major',signatureProfile:'',tags:['stabilization','containment']}},{repair:true});
  assert.deepEqual(world.visualMemory.scars,scar);
});

test('acceptance D: Awareness and Attention remain visually independent', () => {
  const world=civ(18003); world.stats.awareness=80; world.stats.attention=10;
  const aware=worldPresentation(world).signals;
  world.stats.awareness=10; world.stats.attention=80;
  const attention=worldPresentation(world).signals;
  assert.ok(aware.outwardObservation>attention.outwardObservation);
  assert.ok(attention.observerPressure>aware.observerPressure);
});

test('acceptance E: Tier 3 sheds cosmetics but keeps every pressure signal', () => {
  const controller=new RenderQualityController();
  let now=6000; for(let tier=0;tier<3;tier++){ for(let i=0;i<30;i++)controller.update(30,now+=200); now+=5001; }
  assert.equal(controller.tier,3);
  assert.equal(qualityFactors(controller.tier).agentFraction,.5);
  // What "without changing game state" means in practice: the tier is applied to the sampled draw
  // budget, so cosmetics fall while the counts that carry Entropy and Awareness survive untouched.
  const sample={particleCount:150,hazeBands:9,fractureCount:12,beaconCount:10,entropyBand:4};
  const shed=applyQualityToLiveSample(sample,controller.tier);
  assert.ok(shed.particleCount<sample.particleCount);
  assert.ok(shed.hazeBands<sample.hazeBands);
  assert.equal(shed.fractureCount,12);
  assert.equal(shed.beaconCount,10);
  assert.deepEqual(sample,{particleCount:150,hazeBands:9,fractureCount:12,beaconCount:10,entropyBand:4});
});
