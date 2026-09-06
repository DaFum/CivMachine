import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGameContent } from '../dist/game/content-validation.js';

test('content-validation module tests', async (t) => {
  await t.test('validateGameContent handles null, primitives, and non-objects gracefully', () => {
    for (const input of [null, undefined, 42, 'string', true, []]) {
      const result = validateGameContent(input);
      assert.deepEqual(result.traits, []);
      assert.deepEqual(result.events, []);
      assert.deepEqual(result.machine_upgrades, []);
      assert.deepEqual(result.universe_upgrades, []);
      assert.deepEqual(result.axiom_upgrades, []);
      assert.deepEqual(result.directives, []);
      assert.deepEqual(result.breeding_matrices, []);
      assert.deepEqual(result.mutations, []);
    }
  });

  await t.test('validateGameContent handles partial or malformed array fields', () => {
    const raw = {
      traits: [{ id: 't1' }],
      events: 'invalid',
      machine_upgrades: null,
      universe_upgrades: [{ id: 'u1' }],
      extraField: 'kept',
    };
    const result = validateGameContent(raw);
    assert.deepEqual(result.traits, [{ id: 't1' }]);
    assert.deepEqual(result.events, []);
    assert.deepEqual(result.machine_upgrades, []);
    assert.deepEqual(result.universe_upgrades, [{ id: 'u1' }]);
    assert.deepEqual(result.axiom_upgrades, []);
    assert.equal(result.extraField, 'kept');
  });

  await t.test('validateGameContent preserves valid content object', () => {
    const raw = {
      traits: [{ id: 'trait1' }],
      events: [{ id: 'event1' }],
      machine_upgrades: [{ id: 'mu1' }],
      universe_upgrades: [{ id: 'uu1' }],
      axiom_upgrades: [{ id: 'au1' }],
      directives: [{ id: 'd1' }],
      breeding_matrices: [{ id: 'bm1' }],
      mutations: [{ id: 'm1' }],
    };
    const result = validateGameContent(raw);
    assert.deepEqual(result.traits, [{ id: 'trait1' }]);
    assert.deepEqual(result.events, [{ id: 'event1' }]);
    assert.deepEqual(result.machine_upgrades, [{ id: 'mu1' }]);
    assert.deepEqual(result.universe_upgrades, [{ id: 'uu1' }]);
    assert.deepEqual(result.axiom_upgrades, [{ id: 'au1' }]);
    assert.deepEqual(result.directives, [{ id: 'd1' }]);
    assert.deepEqual(result.breeding_matrices, [{ id: 'bm1' }]);
    assert.deepEqual(result.mutations, [{ id: 'm1' }]);
  });
});
