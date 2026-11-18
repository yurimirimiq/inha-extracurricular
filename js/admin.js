const $ = (id) => document.getElementById(id);
// shortcut: 시연용이라 로그인·서버 없이 이 브라우저에만 저장함. 실제로 쓰려면 교직원 로그인 + 서버 + 학교 협의가 먼저.
const CONFIRM_KEY = 'inha-confirm-demo-v1';
const now = new Date();

// { 학기: { 프로그램이름: { 학번: 점수 } } }
let confirmations = {};
try { confirmations = JSON.parse(localStorage.getItem(CONFIRM_KEY)) || {}; } catch { /* 저장소를 못 쓰면 저장 없이 동작 */ }
const save = () => { try { localStorage.setItem(CONFIRM_KEY, JSON.stringify(confirmations)); } catch { /* 위와 같음 */ } };

const option = (value, text = value) => Object.assign(document.createElement('option'), { value, textContent: text });
const el = (tag, text = '') => Object.assign(document.createElement(tag), { textContent: text });

Object.keys(DEPTS).forEach((d) => $('dept').append(option(d)));
for (let y = now.getFullYear(); y >= now.getFullYear() - 1; y--) {
  for (const t of [2, 1]) $('term').append(option(`${y}-${t}`, `${y}년 ${t}학기`));
}
$('term').value = mileageTerm(now);

const selected = () => PROGRAMS.find((p) => p.name === $('program').value);
function fillProgram() {
  const p = selected();
  $('points').value = p.points;
  $('programNote').textContent = p.note ? `참고: ${p.note}` : '';
}
function fillPrograms() {
  $('program').replaceChildren(...PROGRAMS.filter((p) => p.dept === $('dept').value).map((p) => option(p.name)));
  fillProgram();
}
$('dept').addEventListener('change', fillPrograms);
$('program').addEventListener('change', fillProgram);
fillPrograms();

function render() {
  const rows = [];
  for (const term of Object.keys(confirmations).sort().reverse()) {
    for (const [name, students] of Object.entries(confirmations[term])) {
      for (const [id, points] of Object.entries(students)) {
        const tr = document.createElement('tr');
        const view = Object.assign(el('a', '학생 화면 보기'), { href: `index.html?demo=${id}` });
        const cancel = el('button', '취소');
        cancel.type = 'button';
        cancel.setAttribute('aria-label', `${id} ${name} 확정 취소`);
        cancel.addEventListener('click', () => {
          delete confirmations[term][name][id];
          save(); render();
        });
        const actions = el('td');
        actions.append(view, cancel);
        tr.append(el('td', term.replace('-', '년 ') + '학기'), el('td', name), el('td', id), el('td', `${points}점`), actions);
        rows.push(tr);
      }
    }
  }
  $('rows').replaceChildren(...rows);
  $('count').textContent = `${rows.length}건`;
  $('confirmedCount').textContent = rows.length;
  $('empty').hidden = rows.length > 0;
}

// 신청자 선발: 학생 화면(programs.js)이 저장한 신청을 읽어서 상태만 바꿈
const APPLY_KEY = 'inha-apply-demo-v1';
let applications = {};
try { applications = JSON.parse(localStorage.getItem(APPLY_KEY)) || {}; } catch { /* 위와 같음 */ }
const saveApplications = () => { try { localStorage.setItem(APPLY_KEY, JSON.stringify(applications)); } catch { /* 위와 같음 */ } };

function renderApplications() {
  const rows = [];
  for (const [name, applicants] of Object.entries(applications)) {
    for (const [id, application] of Object.entries(applicants)) {
      const tr = document.createElement('tr');
      const actions = el('td');
      for (const [status, label] of [['selected', '선발'], ['rejected', '미선발'], ['applied', '대기로']]) {
        if (status === application.status) continue;
        const button = el('button', label);
        button.type = 'button';
        button.setAttribute('aria-label', `${id} ${name} ${label}`);
        button.addEventListener('click', () => {
          application.status = status;
          saveApplications(); renderApplications();
        });
        actions.append(button);
      }
      const state = el('td', APPLY_STATUS[application.status]);
      state.className = `status ${application.status}`;
      tr.append(el('td', new Date(application.at).toLocaleDateString('ko-KR')), el('td', name), el('td', id), state, actions);
      rows.push([application.at, tr]);
    }
  }
  rows.sort((a, b) => b[0] - a[0]);
  $('applyRows').replaceChildren(...rows.map(([, tr]) => tr));
  $('applyCount').textContent = `${rows.length}건`;
  $('waitingCount').textContent = Object.values(applications).flatMap((a) => Object.values(a)).filter((a) => a.status === 'applied').length;
  $('applyEmpty').hidden = rows.length > 0;
}

function confirmStudents(term, name, ids, points) {
  const students = ((confirmations[term] ??= {})[name] ??= {});
  for (const id of ids) students[id] = points;
}

$('confirmForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const { valid, invalid } = parseStudentIds($('ids').value);
  const points = Math.round(Number($('points').value));
  if (!valid.length) { $('formMessage').textContent = '8자리 학번이 하나도 없어요.'; return; }
  confirmStudents($('term').value, $('program').value, valid, points);
  save(); render();
  // 잘못된 학번은 고쳐서 다시 넣을 수 있게 입력칸에 남김
  $('ids').value = invalid.join('\n');
  $('formMessage').textContent = `${valid.length}명 확정했어요.` +
    (invalid.length ? ` 학번 형식이 아니라서 건너뛴 것 ${invalid.length}개는 입력칸에 남겨뒀어요.` : '');
});

$('seed').addEventListener('click', () => {
  const term = mileageTerm(now);
  // 실제 학번과 겹치지 않게 00으로 시작하는 가짜 학번
  confirmStudents(term, '인하 튜터링', ['00000001', '00000002', '00000003'], 4);
  confirmStudents(term, '국제도우미 Buddy', ['00000001', '00000004'], 3);
  confirmStudents(term, '역사기행', ['00000002'], 1);
  for (const [i, id] of ['00000001', '00000002', '00000005'].entries()) {
    (applications['INHA Creative Changer(ICC) 프로젝트'] ??= {})[id] ??= { status: 'applied', at: Date.now() - i * 86400000 };
  }
  saveApplications(); renderApplications();
  save(); render();
  $('formMessage').textContent = '가짜 학번으로 예시를 채웠어요. 아래 표에서 "학생 화면 보기"를 눌러보세요.';
});
$('clear').addEventListener('click', () => {
  if (!confirm('신청과 확정 내역을 모두 지울까요?')) return;
  confirmations = {};
  applications = {};
  saveApplications(); renderApplications();
  save(); render();
  $('formMessage').textContent = '모두 지웠어요.';
});

render();
renderApplications();
