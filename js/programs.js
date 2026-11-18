// 신청 화면: 프로그램 목록 (common.js 다음에 불러옴)
Object.keys(DEPTS).forEach((d) => $('dept').append(option(d)));
const ICONS = { 자율책임: 'compass', 의사소통: 'speech', 창의사고: 'bulb', 지식활용: 'books', 공감협동: 'handshake', 글로벌: 'globe' };
for (const c of COMPS) {
  const label = el('label', 'shortcut');
  const icon = el('span', 'icon');
  icon.append(Object.assign(document.createElement('img'), { src: `assets/icons/${ICONS[c]}.png`, alt: '' }));
  label.dataset.comp = c;
  label.append(Object.assign(document.createElement('input'), { type: 'radio', name: 'comp', value: c }), icon, c);
  $('teamShortcut').before(label);
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

function renderList() {
  const months = { term: termMonths(month), month: [month], all: null }[picked('when')];
  const comp = picked('comp');
  const q = $('q').value.trim().toLowerCase();
  const shown = PROGRAMS.filter((p) =>
    (!months || runsIn(p, months)) &&
    (!comp || p.comp === comp) &&
    (!$('dept').value || p.dept === $('dept').value) &&
    (!$('teamOnly').checked || p.team) &&
    (!$('appliedOnly').checked || applications[p.name]?.[me]) &&
    (!q || p.name.toLowerCase().includes(q)));

  $('count').textContent = `${shown.length}개`;
  $('empty').hidden = shown.length > 0;
  $('list').replaceChildren(...shown.map((p) => {
    const li = el('li', 'card');
    li.dataset.comp = p.comp;

    const top = el('div', 'card-top');
    top.append(el('span', '', `${p.comp} · ${monthsText(p)}`), el('span', 'pts', `${p.points}점`));

    const info = el('dl', 'info');
    const row = (title, ...detail) => { const dd = el('dd'); dd.append(...detail); info.append(el('dt', '', title), dd); };
    row('부서', Object.assign(el('a', '', p.dept), { href: DEPTS[p.dept], target: '_blank', rel: 'noopener' }));
    row('신청', p.apply);
    if (p.team) row('팀', p.team);
    if (p.note) row('참고', p.note);
    const more = el('details');
    more.append(el('summary', '', '신청 방법 보기'), info);

    // 학생은 신청만 함. 선발과 점수는 교직원 화면에서.
    const mine = el('div', 'mine');
    const application = applications[p.name]?.[me];
    if (!application) {
      const button = el('button', 'primary', '신청하기');
      button.type = 'button';
      button.addEventListener('click', () => {
        (applications[p.name] ??= {})[me] = { status: 'applied', at: Date.now(), name: profile.name || '', dept: profile.dept || '' };
        saveApplications(); renderList();
      });
      mine.append(button);
    } else if (application.points > 0) {
      mine.append(el('span', 'status selected', `이수 · ${application.points}점 받음`));
    } else {
      mine.append(el('span', `status ${application.status}`, application.status === 'applied' ? '신청 완료 · 선발 대기' : APPLY_STATUS[application.status]));
      if (application.status === 'applied') {
        const cancel = el('button', '', '신청 취소');
        cancel.type = 'button';
        cancel.addEventListener('click', () => {
          delete applications[p.name][me];
          saveApplications(); renderList();
        });
        mine.append(cancel);
      }
    }
    if (p.team) {
      const n = (teamPosts[p.name] || []).length;
      mine.append(Object.assign(el('a', 'pill-link', n ? `팀원 ${n}` : '팀원 구하기'), { href: `team.html?p=${encodeURIComponent(p.name)}` }));
    }

    li.append(top, el('h3', '', p.name), more, mine);
    return li;
  }));
}

document.querySelector('.filters').addEventListener('change', renderList);
$('shortcuts').addEventListener('change', renderList);
$('q').addEventListener('input', renderList);

// 홈의 타일에서 넘어오면 해당 필터를 미리 켬 (programs.html?show=applied / team)
const show = { applied: 'appliedOnly', team: 'teamOnly' }[new URLSearchParams(location.search).get('show')];
const wanted = new URLSearchParams(location.search).get('comp');
if (COMPS.includes(wanted)) document.querySelector(`[name=comp][value="${wanted}"]`).checked = true;
if (show) {
  $(show).checked = true;
  document.querySelector('[name=when][value=all]').checked = true;
}
const refresh = renderList;
refresh();
