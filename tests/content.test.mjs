import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
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

test('T04 offers exactly the four original attachments with unchanged names and bytes', async () => {
  const resources = JSON.parse(await readFile(new URL('../assignments/resources.json', import.meta.url), 'utf8'));
  const links = resources['4'].links;
  assert.deepEqual(links.map(link => link.label), [
    'orbit-iss-board-a5c034dea460468029e4618f45a47ac5a75bda2b.zip',
    'README (2).md', 'public-contract (1).json', 'asset-manifest (1).json'
  ]);
  for (const file of links) {
    const bytes = await readFile(new URL('../' + file.path, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
    assert.equal(file.path.split('/').at(-1), file.label);
    assert.equal(file.download, true);
  }
});
