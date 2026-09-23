import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { workflowExamples } from '../lib/workflow-examples';
import type { Listing, Schema } from '../lib/types';

const listing = {
  id: '01a0ccea-2449-7796-ba40-bfcded89b97d',
  listingVersionId: '01a0ccf2-f42f-7486-8198-69922ca9c15c',
} as Listing;
const schema: Schema = {
  fields: [{ key: 'language', label: '输出语言', value_type: 'string' }, { key: 'requirements', label: '复刻要求', value_type: 'string' }],
  sample_rows: [{ language: '简体中文', requirements: '背景改成浅粉色' }],
};

test('试跑输入输出成对展示，不将默认填写示例当作试跑输入，不提交私有附件ID', () => {
  const [trial, sample] = workflowExamples(listing, schema);
  assert.ok(trial.output);
  assert.equal(trial.inputImages?.length, 2);
  assert.match(String(trial.input.requirements), /暖黄色灯光/);
  assert.equal(trial.input.referenceImage, undefined);
  assert.equal(trial.input.productImage, undefined);
  assert.equal(sample.input.requirements, '背景改成浅粉色');
  assert.equal(sample.output, undefined);
  for (const image of [...trial.inputImages!, trial.output!]) {
    assert.ok(existsSync(new URL(`../public${image.src}`, import.meta.url)), image.src);
  }
});

test('案例不串到其他Skill或新版本，没有案例时不虚构输出', () => {
  assert.equal(workflowExamples({ ...listing, id: 'other' }, schema)[0].output, undefined);
  assert.equal(workflowExamples({ ...listing, listingVersionId: 'next' }, schema)[0].output, undefined);
  assert.deepEqual(workflowExamples({ ...listing, id: 'other' }, { ...schema, sample_rows: [] }), []);
});
