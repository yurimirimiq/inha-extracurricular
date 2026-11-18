const $ = (id) => document.getElementById(id);
const el = (tag, className = '', text = '') => Object.assign(document.createElement(tag), { className, textContent: text });
const picked = (name) => document.querySelector(`[name=${name}]:checked`).value;
const KEY = 'inha-mileage-v1';
const now = new Date();
const month = now.getMonth() + 1;

// 로그인 안 했으면 로그인 화면으로. 교직원 시연 링크(?demo=)는 로그인 없이 봄.
// 저장소를 못 쓰는 브라우저는 로그인 상태를 기억할 수 없어서 그냥 통과시킴(안 그러면 무한 반복).
let session = 'guest';
try { session = localStorage.getItem('inha-session'); } catch { /* 위 설명 */ }
if (!session && !new URLSearchParams(location.search).has('demo')) location.replace('login.html');
$('who').textContent = session && session !== 'guest' ? `${session} 님` : '';
$('logout').hidden = !session || session === 'guest';
$('logout').addEventListener('click', () => {
  try { localStorage.removeItem('inha-session'); } catch { /* 위 설명 */ }
  location.href = 'login.html';
});

// shortcut: 기록은 이 브라우저에만 저장됨. 기기 간 공유가 필요해지면 로그인 + 서버로 바꿀 것.
let records = {};
try { records = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* 저장소를 못 쓰면 저장 없이 동작 */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(records)); } catch { /* 위와 같음 */ } };

// 시연 모드: admin.html에서 확정한 내역을 ?demo=학번 으로 열어 학생 입장에서 봄
const demoId = new URLSearchParams(location.search).get('demo') || '';
let confirmed = {};
if (isStudentId(demoId)) {
  try { confirmed = confirmedFor(JSON.parse(localStorage.getItem('inha-confirm-demo-v1')) || {}, demoId); } catch { /* 위와 같음 */ }
  $('demoBanner').hidden = false;
  $('demoId').textContent = demoId;
}
const effective = () => mergeRecords(records, confirmed);

// 팀 프로그램 카드에 글 개수를 보여주려고 읽음 (쓰기는 team.js)
let teamPosts = {};
try { teamPosts = JSON.parse(localStorage.getItem('inha-team-posts-v1')) || {}; } catch { /* 위와 같음 */ }

const option = (value, text = value) => Object.assign(document.createElement('option'), { value, textContent: text });
for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) {
  for (const t of [2, 1]) $('term').append(option(`${y}-${t}`, `${y}년 ${t}학기`));
}
$('term').value = mileageTerm(now);
Object.keys(DEPTS).forEach((d) => $('dept').append(option(d)));
for (const c of COMPS) {
  const label = el('label', 'dot');
  label.dataset.comp = c;
  label.append(Object.assign(document.createElement('input'), { type: 'radio', name: 'comp', value: c }), c);
  $('compPills').append(label);
}

const monthsText = (p) => {
  if (!p.months) return '상시 (공지 확인)';
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
  const term = $('term').value;
  const s = summarize(effective(), PROGRAMS, term);
  const sure = Object.values(confirmed[term] || {}).reduce((a, b) => a + b, 0);
  $('termTotal').textContent = s.termTotal;
  $('confirmedNote').textContent = sure ? `이 중 ${sure}점은 교직원이 확정했어요` : '';
  $('certPoints').textContent = `${s.certPoints} / 36`;
  $('certPointsBar').value = Math.min(s.certPoints, 36);
  $('certCount').textContent = `${s.certCount} / 12`;
  $('certCountBar').value = Math.min(s.certCount, 12);

  const used = COMPS.filter((c) => s.byComp[c]);
  $('mixBar').replaceChildren(...used.map((c) => {
    const seg = el('span');
    seg.dataset.comp = c;
    seg.style.flex = s.byComp[c];
    return seg;
  }));
  $('mixLegend').replaceChildren(...(used.length
    ? used.map((c) => { const li = el('li', 'dot', `${c} ${s.byComp[c]}점`); li.dataset.comp = c; return li; })
    : [el('li', '', '아래에서 참여한 프로그램을 체크하면 역량별로 나눠서 보여줘요.')]));
}

function renderList() {
  const term = $('term').value;
  const checked = effective()[term] || {};
  const sure = confirmed[term] || {};
  const months = { term: termMonths(month), month: [month], all: null }[picked('when')];
  const comp = picked('comp');
  const q = $('q').value.trim().toLowerCase();
  const shown = PROGRAMS.filter((p) =>
    (!months || runsIn(p, months)) &&
    (!comp || p.comp === comp) &&
    (!$('dept').value || p.dept === $('dept').value) &&
    (!$('teamOnly').checked || p.team) &&
    (!$('mineOnly').checked || p.name in checked) &&
    (!q || p.name.toLowerCase().includes(q)));

  $('count').textContent = `${shown.length}개`;
  $('empty').hidden = shown.length > 0;
  $('list').replaceChildren(...shown.map((p) => {
    const li = el('li', 'card');
    const done = p.name in checked;
    // 교직원이 확정한 건 학생이 못 바꿈
    const locked = p.name in sure;

    const top = el('div', 'card-top');
    const compLabel = el('span', 'dot', p.comp);
    compLabel.dataset.comp = p.comp;
    top.append(compLabel, el('span', 'pts', `${p.points}점`));

    const info = el('dl', 'info');
    const row = (title, ...detail) => { const dd = el('dd'); dd.append(...detail); info.append(el('dt', '', title), dd); };
    row('부서', Object.assign(el('a', '', p.dept), { href: DEPTS[p.dept], target: '_blank', rel: 'noopener' }));
    row('시기', monthsText(p));
    row('신청', p.apply);
    if (p.team) row('팀', p.team);
    if (p.note) row('참고', p.note);

    const mine = el('div', 'mine');
    const check = Object.assign(document.createElement('input'), { type: 'checkbox', checked: done, disabled: locked });
    const toggle = el('label', 'toggle');
    toggle.append(check, locked ? `이수 확정 ${sure[p.name]}점` : done ? '참여했어요 ✓' : '참여했어요');
    mine.append(toggle);
    if (p.team) {
      const n = (teamPosts[p.name] || []).length;
      mine.append(Object.assign(el('a', 'pill-link', n ? `팀원 구하기 ${n}` : '팀원 구하기'), { href: `team.html?p=${encodeURIComponent(p.name)}` }));
    }
    check.addEventListener('change', () => {
      records[term] ??= {};
      if (check.checked) records[term][p.name] = p.points; else delete records[term][p.name];
      save(); renderSummary(); renderList();
    });
    if (done && !locked) {
      // 회당·시간별로 점수가 달라지는 프로그램이 있어서 직접 고칠 수 있게 함
      const points = Object.assign(document.createElement('input'), { type: 'number', min: 1, max: 30, value: checked[p.name] });
      points.setAttribute('aria-label', `${p.name} 받은 마일리지`);
      points.addEventListener('change', () => {
        records[term][p.name] = Math.min(30, Math.max(1, Math.round(Number(points.value)) || p.points));
        points.value = records[term][p.name];
        save(); renderSummary();
      });
      const pointsLabel = el('label');
      pointsLabel.append('받은 점수 ', points);
      mine.append(pointsLabel);
    }

    li.append(top, el('h3', '', p.name), info, mine);
    return li;
  }));
}

document.querySelector('.filters').addEventListener('change', renderList);
$('q').addEventListener('input', renderList);
$('term').addEventListener('change', () => { renderSummary(); renderList(); });
renderSummary();
renderList();
