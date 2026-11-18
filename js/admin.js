const $ = (id) => document.getElementById(id);
const el = (tag, text = '') => Object.assign(document.createElement(tag), { textContent: text });
// shortcut: 시연용이라 로그인·서버 없이 이 브라우저에만 저장함. 실제로 쓰려면 교직원 로그인 + 서버 + 학교 협의가 먼저.
// 학생 화면(common.js)과 같은 곳을 읽고 씀: { 프로그램이름: { 학번: { status, at, name, dept, points, term } } }
const APPLY_KEY = 'inha-apply-demo-v1';
let applications = {};
const load = () => { try { applications = JSON.parse(localStorage.getItem(APPLY_KEY)) || {}; } catch { /* 저장소를 못 쓰면 저장 없이 동작 */ } };
load();
// 다른 탭(학생 화면)에서 신청·취소하면 여기도 다시 읽음. 안 그러면 다음에 저장할 때 옛 내용으로 덮어씀.
window.addEventListener('storage', () => { load(); render(); });
const save = () => { try { localStorage.setItem(APPLY_KEY, JSON.stringify(applications)); } catch { /* 위와 같음 */ } };

const term = mileageTerm(new Date());
$('termLabel').textContent = term.replace('-', '년 ') + '학기';
const byName = new Map(PROGRAMS.map((p) => [p.name, p]));

function render() {
  // 신청이 들어온 프로그램만 고르기 목록에 넣음
  const chosen = $('program').value;
  $('program').replaceChildren(
    Object.assign(el('option', '모든 프로그램'), { value: '' }),
    ...Object.keys(applications).filter((name) => Object.keys(applications[name]).length).map((name) => Object.assign(el('option', name), { value: name })));
  $('program').value = chosen in applications ? chosen : '';
  const state = document.querySelector('[name=state]:checked').value;

  const all = Object.entries(applications).flatMap(([name, applicants]) => Object.entries(applicants).map(([id, a]) => ({ name, id, a })));
  $('waitingCount').textContent = all.filter(({ a }) => a.status === 'applied').length;
  $('grantedCount').textContent = all.filter(({ a }) => a.points > 0).length;

  const shown = all
    .filter(({ name, a }) => (!$('program').value || name === $('program').value) && (!state || a.status === state))
    .sort((x, y) => y.a.at - x.a.at);
  $('applyCount').textContent = `${shown.length}건`;
  $('applyEmpty').hidden = shown.length > 0;
  $('applyRows').replaceChildren(...shown.map(({ name, id, a }) => {
    const tr = document.createElement('tr');
    const who = `${a.name || id} ${name}`;

    const stateCell = el('td', a.points > 0 ? `이수 · ${a.points}점` : APPLY_STATUS[a.status]);
    stateCell.className = `status ${a.status}`;

    const pick = el('td');
    for (const [status, label] of [['selected', '선발'], ['rejected', '미선발'], ['applied', '대기로']]) {
      if (status === a.status) continue;
      const button = el('button', label);
      button.type = 'button';
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
      const points = Object.assign(document.createElement('input'), { type: 'number', min: 1, max: 30, value: a.points || byName.get(name)?.points || 1 });
      points.setAttribute('aria-label', `${who} 마일리지`);
      const button = el('button', a.points > 0 ? '수정' : '부여');
      button.type = 'button';
      button.className = 'primary';
      button.setAttribute('aria-label', `${who} 마일리지 ${a.points > 0 ? '수정' : '부여'}`);
      button.addEventListener('click', () => {
        a.points = Math.min(30, Math.max(1, Math.round(Number(points.value)) || 1));
        a.term ??= term;
        save(); render();
        $('message').textContent = `${a.name || id} 학생에게 ${name} ${a.points}점을 부여했어요.`;
      });
      grant.append(points, '점', button);
      if (isStudentId(id)) grant.append(Object.assign(el('a', '학생 화면'), { href: `index.html?demo=${id}` }));
    } else {
      grant.append('선발 후 가능');
      grant.className = 'muted';
    }

    tr.append(el('td', a.dept || '-'), el('td', id), el('td', a.name || '-'), el('td', name),
      el('td', new Date(a.at).toLocaleDateString('ko-KR')), stateCell, pick, grant);
    return tr;
  }));
}

$('program').addEventListener('change', render);
document.querySelector('.pills').addEventListener('change', render);

$('seed').addEventListener('click', () => {
  // 실제 학생과 겹치지 않게 00으로 시작하는 가짜 학번과 지어낸 이름
  const fake = [
    ['INHA Creative Changer(ICC) 프로젝트', '00000001', '김인하', '인공지능공학과'],
    ['INHA Creative Changer(ICC) 프로젝트', '00000002', '이비룡', '경영학과'],
    ['INHA Creative Changer(ICC) 프로젝트', '00000003', '박인경', '국어국문학과'],
    ['인하 튜터링', '00000001', '김인하', '인공지능공학과'],
    ['인하 튜터링', '00000004', '최용현', '기계공학과'],
    ['국제도우미 Buddy', '00000005', '정하늘', '국제통상학과'],
  ];
  fake.forEach(([name, id, studentName, dept], i) => {
    (applications[name] ??= {})[id] ??= { status: 'applied', at: Date.now() - i * 86400000, name: studentName, dept };
  });
  save(); render();
  $('message').textContent = '지어낸 학생 5명의 신청을 채웠어요. 선발을 누른 뒤 마일리지를 부여해 보세요.';
});
$('clear').addEventListener('click', () => {
  if (!confirm('신청 내역과 부여한 마일리지를 모두 지울까요?')) return;
  applications = {};
  save(); render();
  $('message').textContent = '모두 지웠어요.';
});

render();
