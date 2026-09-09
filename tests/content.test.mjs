import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { parseAssignment } from '../scripts/build.mjs';

test('every source criterion is preserved exactly once, in its original order', async () => {
  const files = (await readdir(new URL('../assignments/', import.meta.url))).filter(file => file.endsWith('.txt'));
  const context = { window: {} };
  vm.runInNewContext(await readFile(new URL('../data.js', import.meta.url), 'utf8'), context);
  const generated = JSON.parse(JSON.stringify(context.window.ASSIGNMENTS));
  for (const file of files) {
    const raw = await readFile(new URL(`../assignments/${file}`, import.meta.url), 'utf8');
    const parsed = parseAssignment(raw, file);
    const sourceCriteria = raw.split(/\r?\n/).map(line => line.replace(/^\s*-\s*/, '').trim()).filter(line => /^T\d+-C\d+\s/.test(line));
    assert.deepEqual(parsed.groups.flatMap(group => group.criteria.map(item => `${item.id} ${item.text}`)), sourceCriteria);
    assert.deepEqual(generated.find(item => item.number === parsed.number), parsed);
    assert.ok(parsed.count > 0);
  }
  assert.equal(generated.length, files.length);
});

test('malformed or duplicate criteria stop publication instead of disappearing silently', () => {
  assert.throws(() => parseAssignment('과제 1\n제목\n왜 이걸 하는가\n카드 1 — 검사\nT01-C01 조건\nT01-C01 중복', 'test'));
  assert.throws(() => parseAssignment('과제 1\n제목\n왜 이걸 하는가\n카드 1 — 검사\nT02-C01 잘못된 과제', 'test'));
});
