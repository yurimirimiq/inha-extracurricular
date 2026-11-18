const $ = (id) => document.getElementById(id);
const el = (tag, className = '', text = '') => Object.assign(document.createElement(tag), { className, textContent: text });
const option = (value, text = value) => Object.assign(el('option', '', text), { value });

// 교직원 로그인(login.html?staff)을 안 했으면 로그인 화면으로.
// shortcut: 진짜 로그인이 아님(아무 사번이나 통과). 실제로 쓰려면 교직원 계정 확인 + 서버 + 학교 협의가 먼저.
// 저장소를 못 쓰는 브라우저는 로그인 상태를 기억할 수 없어서 그냥 통과시킴(안 그러면 무한 반복).
let staff = 'guest';
try { staff = localStorage.getItem('inha-staff-session'); } catch { /* 위 설명 */ }
if (!staff) location.replace('login.html?staff');
// 맨 위에 로그인한 교직원 정보. 이름·소속은 시연 데이터에만 있고, 직접 로그인하면 사번만 나옴.
let staffProfile = {};
try { staffProfile = JSON.parse(localStorage.getItem('inha-staff-profile')) || {}; } catch { /* 위 설명 */ }
$('who').textContent = staff && staff !== 'guest' ? `${staffProfile.name || staff} 님` : '';
if (staff && staff !== 'guest') {
  for (const [title, value] of [['로그인', '교직원'], ['사번', staff], ['이름', staffProfile.name], ['소속', staffProfile.dept]]) {
    if (value) $('staffInfo').append(el('dt', '', title), el('dd', '', value));
  }
}
$('logout').addEventListener('click', () => {
  try { localStorage.removeItem('inha-staff-session'); localStorage.removeItem('inha-staff-profile'); } catch { /* 위 설명 */ }
  location.href = 'login.html?staff';
});

// 학생 화면(common.js)과 같은 곳을 읽고 씀: { 프로그램이름: { 학번: { status, at, name, dept, points, term } } }
const APPLY_KEY = 'inha-apply-demo-v1';
let applications = {};
const load = () => { try { applications = JSON.parse(localStorage.getItem(APPLY_KEY)) || {}; } catch { /* 저장소를 못 쓰면 저장 없이 동작 */ } };
load();
// 다른 탭(학생 화면)에서 신청·취소하면 여기도 다시 읽음. 안 그러면 다음에 저장할 때 옛 내용으로 덮어씀.
window.addEventListener('storage', () => { load(); render(); });
const save = () => { try { localStorage.setItem(APPLY_KEY, JSON.stringify(applications)); } catch { /* 위와 같음 */ } };
// 교직원이 등록한 활동만 따로 저장 (data.js가 읽어서 PROGRAMS에 합침)
const saveCustom = () => { try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(PROGRAMS.filter((p) => p.custom))); } catch { /* 위와 같음 */ } };

// 알림: 잠깐 떴다가 사라짐
let sayTimer;
const say = (text) => {
  $('message').textContent = text;
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => { $('message').textContent = ''; }, 4000);
};

const term = mileageTerm(new Date());
$('termLabel').textContent = term.replace('-', '년 ') + '학기';

// admin.html = 활동 목록, admin.html?p=활동이름 = 그 활동의 신청자
const wanted = new URLSearchParams(location.search).get('p');
const program = PROGRAMS.find((p) => p.name === wanted);
if (wanted && !program) location.replace('admin.html');
$(program ? 'detailView' : 'listView').hidden = false;

// 신청 기간이 있는 활동이면 ' · 신청 11.20~12.2 (마감까지 5일)'
const periodText = (p) => { const period = applyPeriod(p, todayText()); return period ? ` · 신청 ${shortDate(p.applyFrom)}~${shortDate(p.applyTo)} (${periodLabel(period)})` : ''; };
const applicantsOf = (name) => Object.entries(applications[name] || {});
const count = (name, status) => applicantsOf(name).filter(([, a]) => a.status === status).length;

function renderList() {
  const all = Object.values(applications).flatMap((applicants) => Object.values(applicants));
  $('totalCount').textContent = all.length;
  $('waitingCount').textContent = all.filter((a) => a.status === 'applied').length;
  $('selectedCount').textContent = all.filter((a) => a.status === 'selected').length;
  $('grantedCount').textContent = all.filter((a) => a.points > 0).length;
  $('grantedPoints').textContent = all.reduce((sum, a) => sum + (a.points || 0), 0);
  // 핵심역량별 신청 수 (홈의 역량 막대와 같은 모양)
  const byComp = {};
  for (const p of PROGRAMS) if (applicantsOf(p.name).length) byComp[p.comp] = (byComp[p.comp] || 0) + applicantsOf(p.name).length;
  const used = COMPS.filter((c) => byComp[c]);
  $('compBar').replaceChildren(...used.map((c) => { const seg = el('span'); seg.dataset.comp = c; seg.style.flex = byComp[c]; return seg; }));
  $('compLegend').replaceChildren(...(used.length
    ? used.map((c) => { const li = el('li', 'dot', `${c} ${byComp[c]}건`); li.dataset.comp = c; return li; })
    : [el('li', '', '신청이 들어오면 역량별로 나눠서 보여줘요.')]));

  const q = $('q').value.trim().toLowerCase();
  const shown = PROGRAMS
    .filter((p) => (!$('appliedOnly').checked || applicantsOf(p.name).length) && (!$('customOnly').checked || p.custom) && (!$('dept').value || p.dept === $('dept').value) && (!q || p.name.toLowerCase().includes(q)))
    // 선발을 기다리는 신청이 많은 활동부터, 그다음 신청이 많은 순
    .sort((a, b) => count(b.name, 'applied') - count(a.name, 'applied') || applicantsOf(b.name).length - applicantsOf(a.name).length);
  $('count').textContent = `${shown.length}개`;
  $('empty').hidden = shown.length > 0;
  $('list').replaceChildren(...shown.map((p) => {
    const li = el('li', 'card');
    li.dataset.comp = p.comp;
    const top = el('div', 'card-top');
    top.append(el('span', '', `${p.comp} · ${p.dept}${p.custom ? ' · 등록한 활동' : ''}`), el('span', 'pts', `${p.points}점`));
    const total = applicantsOf(p.name).length;
    const waiting = count(p.name, 'applied');
    const mine = el('div', 'mine');
    mine.append(
      el('span', total ? 'count' : 'count none', total ? `신청 ${total}명` : '신청 없음'),
      Object.assign(el('a', 'pill-link', waiting ? `선발하기 ${waiting}` : '신청자 보기'), { href: `admin.html?p=${encodeURIComponent(p.name)}` }));
    const detail = (total ? `대기 ${waiting} · 선발 ${count(p.name, 'selected')} · 미선발 ${count(p.name, 'rejected')}` : '아직 신청한 학생이 없어요') + periodText(p);
    li.append(top, el('h3', '', p.name), el('p', 'hint', detail), mine);
    return li;
  }));
}

function renderDetail() {
  const name = program.name;
  const state = document.querySelector('[name=state]:checked').value;
  const shown = applicantsOf(name).filter(([, a]) => !state || a.status === state).sort((x, y) => y[1].at - x[1].at);
  $('applyCount').textContent = `신청 ${applicantsOf(name).length}명 · 대기 ${count(name, 'applied')} · 선발완료 ${count(name, 'selected')} · 미선발 ${count(name, 'rejected')}`;
  $('selectAll').disabled = !count(name, 'applied');
  $('grantAll').disabled = !applicantsOf(name).some(([, a]) => a.status === 'selected' && !(a.points > 0));
  $('applyEmpty').hidden = shown.length > 0;
  $('applyRows').replaceChildren(...shown.map(([id, a]) => {
    const tr = el('tr');
    const who = a.name || id;

    const stateCell = el('td');
    stateCell.append(el('span', `status ${a.points > 0 ? 'done' : a.status}`, a.points > 0 ? `이수 · ${a.points}점` : APPLY_STATUS[a.status]));

    const pick = el('td');
    for (const [status, label] of [['selected', '선발'], ['rejected', '미선발'], ['applied', '대기로']]) {
      if (status === a.status) continue;
      const button = Object.assign(el('button', '', label), { type: 'button' });
      button.setAttribute('aria-label', `${who} ${label}`);
      button.addEventListener('click', () => {
        a.status = status;
        // 선발이 아니게 되면 부여했던 점수도 거둠
        if (status !== 'selected') { delete a.points; delete a.term; }
        save(); render();
      });
      pick.append(button);
    }

    const grant = el('td');
    if (a.status === 'selected') {
      const points = Object.assign(el('input'), { type: 'number', min: 1, max: 30, value: a.points || program.points || 1 });
      points.setAttribute('aria-label', `${who} 마일리지`);
      const button = Object.assign(el('button', 'primary', a.points > 0 ? '수정' : '부여'), { type: 'button' });
      button.setAttribute('aria-label', `${who} 마일리지 ${a.points > 0 ? '수정' : '부여'}`);
      button.addEventListener('click', () => {
        a.points = Math.min(30, Math.max(1, Math.round(Number(points.value)) || 1));
        a.term ??= term;
        save(); render();
        say(`${who} 학생에게 ${name} ${a.points}점을 부여했어요.`);
      });
      grant.append(points, '점', button);
      if (isStudentId(id)) grant.append(Object.assign(el('a', '', '학생 화면'), { href: `index.html?demo=${id}` }));
    } else {
      grant.append('선발 후 가능');
      grant.className = 'muted';
    }

    tr.append(el('td', '', a.dept || '-'), el('td', '', id), el('td', '', a.name || '-'),
      el('td', '', new Date(a.at).toLocaleDateString('ko-KR')), stateCell, pick, grant);
    return tr;
  }));
}

const render = program ? renderDetail : renderList;

if (program) {
  document.title = `${program.name} 신청자 · 교직원 화면`;
  $('programName').textContent = program.name;
  $('programInfo').textContent = `${program.dept} · ${program.comp} · 마일리지 ${program.points}점${program.team ? ` · 팀 구성: ${program.team}` : ''}${periodText(program)}`;
  document.querySelector('.pills').addEventListener('change', render);
  // 한 번에 처리: 대기 중인 신청을 모두 선발 / 아직 점수가 없는 선발자에게 활동의 기본 점수 부여
  $('grantAll').textContent = `선발자 전원에게 ${program.points}점 부여`;
  $('selectAll').addEventListener('click', () => {
    const waiting = applicantsOf(program.name).filter(([, a]) => a.status === 'applied');
    for (const [, a] of waiting) a.status = 'selected';
    save(); render();
    say(`${waiting.length}명을 선발했어요.`);
  });
  $('grantAll').addEventListener('click', () => {
    const due = applicantsOf(program.name).filter(([, a]) => a.status === 'selected' && !(a.points > 0));
    for (const [, a] of due) { a.points = program.points; a.term ??= term; }
    save(); render();
    say(`${due.length}명에게 ${program.points}점씩 부여했어요.`);
  });
  // 가이드북에 있는 활동은 못 지우고, 교직원이 등록한 것만 지울 수 있음
  $('removeProgram').hidden = !program.custom;
  $('removeProgram').addEventListener('click', () => {
    if (!confirm(`"${program.name}" 활동을 삭제할까요? 이 활동의 신청 ${applicantsOf(program.name).length}건도 같이 지워져요.`)) return;
    PROGRAMS.splice(PROGRAMS.indexOf(program), 1);
    delete applications[program.name];
    saveCustom(); save();
    location.href = 'admin.html';
  });
} else {
  Object.keys(DEPTS).forEach((d) => $('pDept').append(option(d)));
  COMPS.forEach((c) => $('pComp').append(option(c)));
  [...new Set(PROGRAMS.map((p) => p.dept))].forEach((d) => $('dept').append(option(d)));
  for (const id of ['appliedOnly', 'customOnly', 'dept']) $(id).addEventListener('change', render);
  $('q').addEventListener('input', render);

  $('programForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = (id) => $(id).value.trim();
    const name = text('pName');
    // 신청이 활동 이름으로 묶여 있어서 이름이 겹치면 안 됨
    if (PROGRAMS.some((p) => p.name === name)) { say(`"${name}" 활동이 이미 있어요. 다른 이름으로 등록해 주세요.`); return; }
    // 값은 고르는 칸에서만 오게 하고, 점수는 1~30 사이로 맞춤 (저장된 값을 학생 화면이 그대로 씀)
    if (!name || !(text('pDept') in DEPTS) || !COMPS.includes(text('pComp'))) return;
    const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (!isDate(text('pFrom')) || !isDate(text('pTo'))) { say('신청 시작일과 마감일을 넣어 주세요.'); return; }
    if (text('pFrom') > text('pTo')) { say('신청 마감일이 시작일보다 빨라요.'); return; }
    const added = {
      name, dept: text('pDept'), comp: text('pComp'),
      points: Math.min(30, Math.max(1, Math.round(Number($('pPoints').value)) || 1)),
      months: { term: TERM, vac: VAC, year: R(1, 12), any: ALL }[$('pWhen').value] ?? ALL,
      applyFrom: text('pFrom'), applyTo: text('pTo'), custom: true,
    };
    if (text('pTeam')) added.team = text('pTeam');
    if (text('pNote')) added.note = text('pNote');
    PROGRAMS.push(added);
    saveCustom();
    e.target.reset();
    $('register').open = false;
    $('customOnly').checked = true;
    render();
    say(`"${name}" 활동을 등록했어요. 학생의 프로그램 신청 화면에 바로 보여요.`);
  });

  // 예시 데이터: 지어낸 학생 9명의 신청·점수·글 (js/demo.js). 시연하다 꼬였을 때 처음 상태로 되돌리는 데도 씀.
  $('seed').addEventListener('click', () => {
    if (!confirm('지금 저장된 신청·글·등록한 활동을 예시 데이터로 바꿀까요?')) return;
    seedDemo();
    location.reload();
  });
  $('clear').addEventListener('click', () => {
    if (!confirm('신청 내역과 부여한 마일리지를 모두 지울까요? 등록한 활동은 남아요.')) return;
    applications = {};
    save(); render();
    say('신청을 모두 지웠어요.');
  });
}

render();
