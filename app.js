const $ = (id) => document.getElementById(id);
const KEY = 'inha-mileage-v1';
const now = new Date();
const month = now.getMonth() + 1;

// shortcut: 기록은 이 브라우저에만 저장됨. 기기 간 공유가 필요해지면 로그인 + 서버로 바꿀 것.
let records = {};
try { records = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* 저장소를 못 쓰면 저장 없이 동작 */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(records)); } catch { /* 위와 같음 */ } };

const option = (value, text = value) => Object.assign(document.createElement('option'), { value, textContent: text });

for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) {
  for (const t of [2, 1]) $('term').append(option(`${y}-${t}`, `${y}년 ${t}학기`));
}
$('term').value = mileageTerm(now);
COMPS.forEach((c) => $('comp').append(option(c)));
Object.keys(DEPTS).forEach((d) => $('dept').append(option(d)));

const monthsText = (p) => {
  if (!p.months) return '상시 · 시기는 공지 확인';
  const sorted = [...p.months].sort((a, b) => a - b);
  if (sorted.length === 12) return '연중';
  // 이어지는 달은 "3~6월"처럼 묶음
  const runs = [];
  for (const m of sorted) {
    const last = runs[runs.length - 1];
    if (last && last[1] === m - 1) last[1] = m; else runs.push([m, m]);
  }
  return runs.map(([a, b]) => (a === b ? `${a}월` : `${a}~${b}월`)).join(', ');
};

function renderSummary() {
  const s = summarize(records, PROGRAMS, $('term').value);
  $('termTotal').textContent = s.termTotal;
  $('certPoints').textContent = `${s.certPoints} / 36`;
  $('certPointsBar').value = Math.min(s.certPoints, 36);
  $('certCount').textContent = `${s.certCount} / 12`;
  $('certCountBar').value = Math.min(s.certCount, 12);
  $('byComp').replaceChildren(...COMPS.map((c) => {
    const n = s.byComp[c] || 0;
    return Object.assign(document.createElement('span'), { className: n ? 'chip' : 'chip zero', textContent: `${c} ${n}` });
  }));
}

function renderList() {
  const term = $('term').value;
  const checked = records[term] || {};
  const months = { term: termMonths(month), month: [month], all: null }[$('when').value];
  const q = $('q').value.trim().toLowerCase();
  const shown = PROGRAMS.filter((p) =>
    (!months || runsIn(p, months)) &&
    (!$('comp').value || p.comp === $('comp').value) &&
    (!$('dept').value || p.dept === $('dept').value) &&
    (!$('teamOnly').checked || p.team) &&
    (!$('mineOnly').checked || p.name in checked) &&
    (!q || p.name.toLowerCase().includes(q)));

  $('count').textContent = `${shown.length}개`;
  $('list').replaceChildren(...shown.map((p) => {
    const li = document.createElement('li');
    const done = p.name in checked;
    if (done) li.className = 'done';

    const el = (tag, className, text) => Object.assign(document.createElement(tag), { className, textContent: text });
    const chips = el('div', 'chips');
    chips.style.marginTop = 0;
    chips.append(el('span', 'chip', p.comp), el('span', 'chip', `${p.points}점`));
    if (p.team) chips.append(el('span', 'chip team', `팀 · ${p.team}`));

    const link = Object.assign(el('a', '', p.dept), { href: DEPTS[p.dept], target: '_blank', rel: 'noopener' });
    const dept = el('p', 'meta');
    dept.append(link, ` · ${monthsText(p)}`);

    li.append(el('span', 'name', p.name), chips, dept, el('p', 'meta', `신청: ${p.apply}`));
    if (p.note) li.append(el('p', 'meta', `참고: ${p.note}`));

    const mine = el('div', 'mine');
    const check = Object.assign(document.createElement('input'), { type: 'checkbox', checked: done });
    const checkLabel = document.createElement('label');
    checkLabel.append(check, ' 참여했어요');
    mine.append(checkLabel);
    check.addEventListener('change', () => {
      records[term] ??= {};
      if (check.checked) records[term][p.name] = p.points; else delete records[term][p.name];
      save(); renderSummary(); renderList();
    });
    if (done) {
      // 회당·시간별로 점수가 달라지는 프로그램이 있어서 직접 고칠 수 있게 함
      const points = Object.assign(document.createElement('input'), { type: 'number', min: 1, max: 30, value: checked[p.name] });
      points.setAttribute('aria-label', `${p.name} 받은 마일리지`);
      points.addEventListener('change', () => {
        records[term][p.name] = Math.min(30, Math.max(1, Math.round(Number(points.value)) || p.points));
        points.value = records[term][p.name];
        save(); renderSummary();
      });
      const pointsLabel = document.createElement('label');
      pointsLabel.append(points, ' 점');
      mine.append(pointsLabel);
    }
    li.append(mine);
    return li;
  }));
}

for (const id of ['when', 'comp', 'dept', 'teamOnly', 'mineOnly']) $(id).addEventListener('change', renderList);
$('q').addEventListener('input', renderList);
$('term').addEventListener('change', () => { renderSummary(); renderList(); });
renderSummary();
renderList();
