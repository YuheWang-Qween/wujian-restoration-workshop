import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getSim } from './sim';
import { ACT_SIM } from './content';
import { actSubProgress } from './act-progress';

test('reviewing another section retains live and settled simulation counts without inventing missing progress', () => {
  const input = { reached: true, isCurrent: false, stageId: 1, questions: [], answered: 0, simSettled: false };
  assert.equal(actSubProgress(ACT_SIM, { ...input, simCursor: 2 })?.done, 2);
  assert.equal(actSubProgress(ACT_SIM, input), null);
  assert.equal(actSubProgress(ACT_SIM, { ...input, simSettled: true })?.done, getSim(1)!.steps.length);
});
