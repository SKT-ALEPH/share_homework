const assignments = window.ASSIGNMENTS;
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
  $('copy-all').querySelector('span').textContent = view === 'criteria' ? '제약조건 전체 복사' : '원문 전체 복사';
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
  $('criteria-count').textContent = current.count;
  $('original-text').textContent = current.raw;
  $('source-info').textContent = `카드 ${current.groups.length}개 · 제약조건 ${current.count}개`;
  $('download').href = `./assignments/${encodeURIComponent(current.source)}`;
  $('download').download = `과제 ${current.number}.txt`;
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
  changeView('criteria');
}
$('search').addEventListener('input', drawNav);
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
window.addEventListener('hashchange', () => { selectAssignment(); window.scrollTo({ top: 0 }); });
selectAssignment();
