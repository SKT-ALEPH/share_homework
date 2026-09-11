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

test('unnumbered Markdown sections preserve T09 groups and the gap in criterion IDs', async () => {
  const raw = await readFile(new URL('../assignments/과제 9.txt', import.meta.url), 'utf8');
  const item = parseAssignment(raw, '과제 9.txt');
  assert.equal(item.number, 9);
  assert.deepEqual(item.groups.map(group => [group.title, group.criteria.length]), [
    ['내 기록을 먼저 읽기', 2],
    ['에이전트에게 다섯 가지 규칙 주기', 3],
    ['강점 지도 뽑고, 틀린 것 지우기', 5],
    ['나의 회복탄력성: 고난을 통해 더 나아진 나', 3],
    ['자기소개서 초안과 포트폴리오 뼈대', 7]
  ]);
  assert.equal(item.count, 20);
  assert.deepEqual(item.groups.at(-1).criteria.slice(-2).map(criterion => criterion.id), ['T09-C19', 'T09-C26']);
  assert.equal(item.raw, raw);
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
