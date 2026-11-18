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

// 신청 (시험 버전): { 프로그램이름: { 신청자: { status, at } } }. 교직원 화면(admin.js)이 같은 곳을 읽고 선발함.
// shortcut: 이 브라우저에만 저장돼서 학교에 실제로 접수되지 않음. 서버 연결 + 학교 협의 전까지는 흐름 시연용.
const APPLY_KEY = 'inha-apply-demo-v1';
let applications = {};
try { applications = JSON.parse(localStorage.getItem(APPLY_KEY)) || {}; } catch { /* 위와 같음 */ }
const saveApplications = () => { try { localStorage.setItem(APPLY_KEY, JSON.stringify(applications)); } catch { /* 위와 같음 */ } };
const me = isStudentId(demoId) ? demoId : session || 'guest';

// 팀 프로그램 카드에 글 개수를 보여주려고 읽음 (쓰기는 team.js)
let teamPosts = {};
try { teamPosts = JSON.parse(localStorage.getItem('inha-team-posts-v1')) || {}; } catch { /* 위와 같음 */ }

const option = (value, text = value) => Object.assign(document.createElement('option'), { value, textContent: text });
for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) {
  for (const t of [2, 1]) $('term').append(option(`${y}-${t}`, `${y}년 ${t}학기`));
}
$('term').value = mileageTerm(now);

// 시연 모드에서는 화면을 옮겨 다녀도 같은 학생으로 보이게 링크에 학번을 붙임
if (isStudentId(demoId)) {
  for (const a of document.querySelectorAll('a[data-keep]')) a.href += `${a.href.includes('?') ? '&' : '?'}demo=${demoId}`;
}
