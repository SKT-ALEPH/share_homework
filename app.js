const assignments = window.ASSIGNMENTS;
const resources = window.ASSIGNMENT_RESOURCES || {};
const prerequisites = {
  9: {
    title: 'SKT-ALEPH 사이트에서 내 리추얼 기록을 먼저 받아야 진행할 수 있습니다.',
    detail: 'SKT-ALEPH 사이트 → 과제 9 → 내 리추얼 기록 → 「텍스트 파일로 담기」를 누르세요. 받은 기록 파일을 준비한 뒤, 아래 과제 전체 내용과 함께 LLM에 넣어 주세요.'
  }
};
const $ = id => document.getElementById(id);
let current;
let view = 'criteria';
let toastTimer;
const copyIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4"/></svg>';

function notify(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2600);
}
async function copy(text, message) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
    notify(message);
  } catch {
    $('manual-copy').value = text;
    $('copy-dialog').showModal();
    $('manual-copy').focus();
    $('manual-copy').select();
  }
}
function groupText(group) {
  return `카드 ${group.number} — ${group.title}\n${group.criteria.map(item => `${item.id} ${item.text}`).join('\n')}`;
}
function fullCriteria(item) {
  return `과제 ${item.number} — ${item.title}\n\n${item.groups.map(groupText).join('\n\n')}`;
}
function fullAssignment(item) {
  const prerequisite = prerequisites[item.number];
  const notice = prerequisite ? `[시작 전 필수 준비]\n${prerequisite.title}\n${prerequisite.detail}\n\n` : '';
  let text = `${notice}아래 과제의 주제와 제출물, 카드별 지침, 모든 통과 기준을 반영해 과제를 진행해 주세요.\n\n${item.raw.trim()}`;
  const resource = resources[item.number];
  if (resource) {
    text += `\n\n---\n첨부 자료 안내\n${resource.note}\n\n${resource.description}\n\n`;
    text += resource.links.map(link => `${link.label}\n${new URL(link.path, 'https://skt-aleph.github.io/share_homework/').href}`).join('\n\n');
  }
  return text;
}
function drawResources() {
  const resource = resources[current.number];
  $('resources').hidden = !resource;
  $('resource-links').replaceChildren();
  if (!resource) return;
  $('resource-note').textContent = resource.note;
  $('resource-description').textContent = resource.description;
  for (const item of resource.links) {
    const link = document.createElement('a');
    link.href = `./${item.path}`;
    link.textContent = item.label + (item.download ? ' ↓' : ' ↗');
    if (item.download) link.download = '';
    else { link.target = '_blank'; link.rel = 'noreferrer'; }
    $('resource-links').append(link);
  }
}
function drawNav() {
  const query = $('search').value.toLocaleLowerCase().replace(/\s/g, '');
  $('assignment-nav').replaceChildren();
  const matches = assignments.filter(item => `과제${item.number}${item.title}`.toLocaleLowerCase().replace(/\s/g, '').includes(query));
  for (const item of matches) {
    const link = document.createElement('a');
    link.href = `#assignment-${item.number}`;
    link.className = 'nav-item';
    if (item.number === current.number) link.setAttribute('aria-current', 'page');
    const num = document.createElement('span');
    num.className = 'nav-number';
    num.textContent = String(item.number).padStart(2, '0');
    const text = document.createElement('span');
    const label = document.createElement('strong');
    label.textContent = `과제 ${item.number}`;
    const title = document.createElement('small');
    title.textContent = item.title;
    text.append(label, title);
    const arrow = document.createElement('span');
    arrow.className = 'nav-arrow';
    arrow.textContent = '↗';
    arrow.setAttribute('aria-hidden', 'true');
    link.append(num, text, arrow);
    $('assignment-nav').append(link);
  }
  $('empty-search').hidden = matches.length > 0;
}
function changeView(next) {
  view = next;
  for (const name of ['criteria', 'original']) {
    $(name + '-tab').setAttribute('aria-selected', String(name === view));
    $(name + '-tab').tabIndex = name === view ? 0 : -1;
    $(name + '-panel').hidden = name !== view;
  }
  $('copy-all').querySelector('span').textContent = view === 'criteria' ? '제약조건만 복사' : '원문만 복사';
  $('reading-note').hidden = view !== 'criteria';
}
function selectAssignment() {
  const number = Number(location.hash.match(/^#assignment-(\d+)$/)?.[1]);
  current = assignments.find(item => item.number === number) || assignments[0];
  document.title = `과제 ${current.number} · ${current.title} | ALEPH`;
  $('assignment-count').textContent = assignments.length;
  $('assignment-badge').textContent = `ASSIGNMENT ${String(current.number).padStart(2, '0')}`;
  $('assignment-time').textContent = current.time ? `예상 ${current.time}` : '';
  $('assignment-title').textContent = current.title;
  $('assignment-description').textContent = current.description;
  const prerequisite = prerequisites[current.number];
  $('prerequisite').hidden = !prerequisite;
  $('prerequisite-title').textContent = prerequisite?.title || '';
  $('prerequisite-detail').textContent = prerequisite?.detail || '';
  $('criteria-count').textContent = current.count;
  $('original-text').textContent = current.raw;
  $('source-info').textContent = `카드 ${current.groups.length}개 · 제약조건 ${current.count}개`;
  $('download').href = `./assignments/${encodeURIComponent(current.source)}`;
  $('download').download = current.source;
  $('criteria-panel').replaceChildren();
  for (const group of current.groups) {
    const section = document.createElement('section');
    section.className = 'criteria-card';
    const header = document.createElement('div');
    header.className = 'card-heading';
    const title = document.createElement('h3');
    const number = document.createElement('span');
    number.className = 'card-number';
    number.textContent = String(group.number).padStart(2, '0');
    title.append(number, document.createTextNode(group.title));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-card';
    button.innerHTML = copyIcon + '<span>카드 복사</span>';
    button.setAttribute('aria-label', `카드 ${group.number} ${group.title} 제약조건 복사`);
    button.addEventListener('click', () => copy(groupText(group), `카드 ${group.number}의 제약조건을 복사했습니다.`));
    header.append(title, button);
    const list = document.createElement('ul');
    list.className = 'criteria-list';
    for (const criterion of group.criteria) {
      const row = document.createElement('li');
      const id = document.createElement('span');
      id.className = 'criterion-id';
      id.textContent = criterion.id;
      const text = document.createElement('span');
      text.textContent = criterion.text;
      row.append(id, text);
      list.append(row);
    }
    section.append(header, list);
    $('criteria-panel').append(section);
  }
  drawNav();
  drawResources();
  changeView('criteria');
}
$('search').addEventListener('input', drawNav);
$('copy-assignment').addEventListener('click', () => copy(fullAssignment(current), `과제 ${current.number}의 주제부터 모든 제약조건까지 복사했습니다. 다른 LLM에 붙여넣으세요.`));
$('copy-all').addEventListener('click', () => copy(view === 'criteria' ? fullCriteria(current) : current.raw, `과제 ${current.number} ${view === 'criteria' ? '제약조건' : '원문'} 전체를 복사했습니다.`));
$('close-dialog').addEventListener('click', () => $('copy-dialog').close());
for (const name of ['criteria', 'original']) {
  $(name + '-tab').addEventListener('click', () => changeView(name));
  $(name + '-tab').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'criteria' : event.key === 'End' ? 'original' : name === 'criteria' ? 'original' : 'criteria';
    changeView(next);
    $(next + '-tab').focus();
  });
}
window.addEventListener('hashchange', () => {
  if (!/^#assignment-\d+$/.test(location.hash)) return;
  selectAssignment();
  window.scrollTo({ top: 0 });
});
selectAssignment();
