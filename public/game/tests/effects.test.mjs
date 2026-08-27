import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEffects, clampStats } from '../dist/game/effects.js';
import { freshEngine, runCivilization } from './balance-harness.mjs';

test('effects module tests', async (t) => {

    function getCiv() {
        const engine = freshEngine();
        runCivilization(engine, { maxSeconds: 0 }); // starts civ, gets past machine phase
        return engine.state.civilization;
    }

    const defaultBonuses = {
        stabilityLossMult: 1,
        awarenessGainMult: 1,
        sanityLossMult: 1,
        attentionGainMult: 1,
    };

    await t.test('clampStats clamps stats correctly', () => {
        const civ = getCiv();
        civ.stats.stabilityMax = 80;
        civ.stats.stability = 90;
        civ.stats.awareness = 110;
        civ.stats.sanity = -10;
        civ.stats.attention = 150;

        clampStats(civ);

        assert.equal(civ.stats.stability, 80);
        assert.equal(civ.stats.awareness, 100);
        assert.equal(civ.stats.sanity, 0);
        assert.equal(civ.stats.attention, 100);
    });

    await t.test('applyEffects handles basic stats', () => {
        const civ = getCiv();
        // Setup initial stats for deterministic test
        civ.stats.stabilityMax = 100;
        civ.stats.stability = 50;
        civ.stats.awareness = 50;
        applyEffects(civ, { stability: 10, awareness: -5 }, false, defaultBonuses);
        assert.equal(civ.stats.stability, 60);
        assert.equal(civ.stats.awareness, 45);
    });

    await t.test('applyEffects handles resilience and bonuses', () => {
        const civ = getCiv();
        civ.stats.stabilityMax = 100;
        civ.stats.stability = 50;
        civ.stats.awareness = 50;
        civ.stats.sanity = 50;
        civ.stats.attention = 50;
        const bonuses = { ...defaultBonuses, stabilityLossMult: 0.5, awarenessGainMult: 2.0, sanityLossMult: 0.5, attentionGainMult: 2.0 };

        // Loss and gain when resilient
        applyEffects(civ, { stability: -20, awareness: 10, sanity: -20, attention: 10 }, true, bonuses);

        assert.equal(civ.stats.stability, 40); // -20 * 0.5 = -10. 50 - 10 = 40
        assert.equal(civ.stats.awareness, 70); // 10 * 2.0 = 20. 50 + 20 = 70
        assert.equal(civ.stats.sanity, 40); // -20 * 0.5 = -10. 50 - 10 = 40
        assert.equal(civ.stats.attention, 70); // 10 * 2.0 = 20. 50 + 20 = 70
    });

    await t.test('applyEffects applies tactical properties', () => {
        const civ = getCiv();
        civ.tactical.entropy = 50;
        civ.tactical.controlCapacity = 2;
        applyEffects(civ, { entropy: 10, control_capacity: 1 }, false, defaultBonuses);
        assert.equal(civ.tactical.entropy, 60);
        assert.equal(civ.tactical.controlCapacity, 3);
    });

    await t.test('applyEffects applies additional game properties', () => {
        const civ = getCiv();
        civ.stats.stabilityMax = 100;
        civ.development = 10;
        civ.developmentMultiplier = 1.0;
        civ.eventDelayBonus = 0;
        civ.stabilityDecayMult = 1.0;

        applyEffects(civ, {
            stability_max: 20,
            development: 5,
            development_mult: 0.5,
            event_delay: 2,
            stability_decay_mult: 0.8
        }, false, defaultBonuses);

        assert.equal(civ.stats.stabilityMax, 120);
        assert.equal(civ.development, 15);
        assert.equal(civ.developmentMultiplier, 1.5);
        assert.equal(civ.eventDelayBonus, 2);
        assert.equal(civ.stabilityDecayMult, 0.8);
    });

    await t.test('applyEffects applies flags and institutions', () => {
        const civ = getCiv();
        applyEffects(civ, {
            flag_add: 'test_flag',
            institution_add: 'test_inst',
            flags_add: ['flag2', 'flag3'],
            institutions_add: ['inst2', 'inst3'],
            trait_add: 'test_trait'
        }, false, defaultBonuses);

        assert.ok(civ.flags.includes('test_flag'));
        assert.ok(civ.flags.includes('flag2'));
        assert.ok(civ.flags.includes('flag3'));
        assert.ok(civ.institutions.includes('test_inst'));
        assert.ok(civ.institutions.includes('inst2'));
        assert.ok(civ.institutions.includes('inst3'));
        assert.ok(civ.traits.includes('test_trait'));
    });

    await t.test('applyEffects handles harvest modifiers', () => {
        const civ = getCiv();
        civ.harvestMult.causal_mass = 1.0;
        civ.harvestBonus.causal_mass = 0;

        applyEffects(civ, {
            harvest_mult_causal_mass: 2.0,
            harvest_causal_mass: 5
        }, false, defaultBonuses);

        assert.equal(civ.harvestMult.causal_mass, 2.0);
        assert.equal(civ.harvestBonus.causal_mass, 5);
    });

    await t.test('applyEffects handles invalid effects safely', () => {
        const civ = getCiv();
        civ.stats.stability = 50;
        applyEffects(civ, null, false, defaultBonuses);
        applyEffects(civ, undefined, false, defaultBonuses);
        applyEffects(civ, "not an object", false, defaultBonuses);
        // Should not throw or alter civ
        assert.equal(civ.stats.stability, 50);
    });
});
