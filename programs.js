// 신청 화면: 프로그램 목록 (common.js 다음에 불러옴)
Object.keys(DEPTS).forEach((d) => $('dept').append(option(d)));
const ICONS = { 자율책임: 'compass', 의사소통: 'speech', 창의사고: 'bulb', 지식활용: 'books', 공감협동: 'handshake', 글로벌: 'globe' };
for (const c of COMPS) {
  const label = el('label', 'shortcut');
  const icon = el('span', 'icon');
  icon.append(Object.assign(document.createElement('img'), { src: `icons/${ICONS[c]}.png`, alt: '' }));
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
    (!$('appliedOnly').checked || applications[p.name]?.[me]) &&
    (!q || p.name.toLowerCase().includes(q)));

  $('count').textContent = `${shown.length}개`;
  $('empty').hidden = shown.length > 0;
  $('list').replaceChildren(...shown.map((p) => {
    const li = el('li', 'card');
    li.dataset.comp = p.comp;
    const done = p.name in checked;
    // 교직원이 확정한 건 학생이 못 바꿈
    const locked = p.name in sure;

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

    const apply = el('div');
    const application = applications[p.name]?.[me];
    if (!application) {
      const button = el('button', 'primary', '신청하기');
      button.type = 'button';
      button.addEventListener('click', () => {
        (applications[p.name] ??= {})[me] = { status: 'applied', at: Date.now() };
        saveApplications(); renderList();
      });
      apply.append(button);
    } else {
      apply.append(el('span', `status ${application.status}`, application.status === 'applied' ? '선발 대기' : APPLY_STATUS[application.status]));
      if (application.status === 'applied') {
        const cancel = el('button', '', '취소');
        cancel.setAttribute('aria-label', `${p.name} 신청 취소`);
        cancel.type = 'button';
        cancel.addEventListener('click', () => {
          delete applications[p.name][me];
          saveApplications(); renderList();
        });
        apply.append(cancel);
      }
    }

    const mine = el('div', 'mine');
    const check = Object.assign(document.createElement('input'), { type: 'checkbox', checked: done, disabled: locked });
    const toggle = el('label', 'toggle');
    toggle.append(check, locked ? `확정 ${sure[p.name]}점` : done ? '참여 ✓' : '참여');
    mine.append(toggle);
    if (p.team) {
      const n = (teamPosts[p.name] || []).length;
      mine.append(Object.assign(el('a', 'pill-link', n ? `팀원 ${n}` : '팀원 구하기'), { href: `team.html?p=${encodeURIComponent(p.name)}` }));
    }
    check.addEventListener('change', () => {
      records[term] ??= {};
      if (check.checked) records[term][p.name] = p.points; else delete records[term][p.name];
      save(); renderList();
    });
    if (done && !locked) {
      // 회당·시간별로 점수가 달라지는 프로그램이 있어서 직접 고칠 수 있게 함
      const points = Object.assign(document.createElement('input'), { type: 'number', min: 1, max: 30, value: checked[p.name] });
      points.setAttribute('aria-label', `${p.name} 받은 마일리지`);
      points.addEventListener('change', () => {
        records[term][p.name] = Math.min(30, Math.max(1, Math.round(Number(points.value)) || p.points));
        points.value = records[term][p.name];
        save();
      });
      const pointsLabel = el('label');
      pointsLabel.append(points, '점');
      mine.append(pointsLabel);
    }

    // 칸을 작게 쓰려고 신청과 참여 단추를 한 줄에 모음
    mine.prepend(...apply.childNodes);
    li.append(top, el('h3', '', p.name), more, mine);
    return li;
  }));
}

document.querySelector('.filters').addEventListener('change', renderList);
$('shortcuts').addEventListener('change', renderList);
$('q').addEventListener('input', renderList);
$('term').addEventListener('change', renderList);

// 홈의 타일에서 넘어오면 해당 필터를 미리 켬 (programs.html?show=applied / team)
const show = { applied: 'appliedOnly', team: 'teamOnly' }[new URLSearchParams(location.search).get('show')];
const wanted = new URLSearchParams(location.search).get('comp');
if (COMPS.includes(wanted)) document.querySelector(`[name=comp][value="${wanted}"]`).checked = true;
if (show) {
  $(show).checked = true;
  document.querySelector('[name=when][value=all]').checked = true;
}
renderList();
