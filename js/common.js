const $ = (id) => document.getElementById(id);
const el = (tag, className = '', text = '') => Object.assign(document.createElement(tag), { className, textContent: text });
const picked = (name) => document.querySelector(`[name=${name}]:checked`).value;
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

// 시연 모드: admin.html의 "학생 화면 보기"가 ?demo=학번 으로 열어 그 학생 입장에서 봄
const demoId = new URLSearchParams(location.search).get('demo') || '';
if (isStudentId(demoId)) {
  $('demoBanner').hidden = false;
  $('demoId').textContent = demoId;
}

// 신청 (시험 버전): { 프로그램이름: { 신청자: { status, at, name, dept, points, term } } }.
// 교직원 화면(admin.js)이 같은 곳을 읽어서 선발하고 점수를 부여함. 학생은 신청만 하고 점수는 못 바꿈.
// shortcut: 이 브라우저에만 저장돼서 학교에 실제로 접수되지 않음. 서버 연결 + 학교 협의 전까지는 흐름 시연용.
const APPLY_KEY = 'inha-apply-demo-v1';
let applications = {};
const saveApplications = () => { try { localStorage.setItem(APPLY_KEY, JSON.stringify(applications)); } catch { /* 위와 같음 */ } };
const me = isStudentId(demoId) ? demoId : session || 'guest';
// 이름·학과: 마이페이지에서 적음. { 학번: { name, dept } } 로 저장해서 로그아웃해도 남음.
const PROFILES_KEY = 'inha-profiles-v1';
let profiles = {};
try { profiles = JSON.parse(localStorage.getItem(PROFILES_KEY)) || {}; } catch { /* 위와 같음 */ }
const profile = profiles[me] || {};
// 내 마일리지 = 교직원이 부여한 점수
const effective = () => grantedFor(applications, me);

// 팀 프로그램 카드에 글 개수를 보여주려고 읽음 (쓰기는 team.js)
let teamPosts = {};
const loadStore = () => {
  try {
    applications = JSON.parse(localStorage.getItem(APPLY_KEY)) || {};
    teamPosts = JSON.parse(localStorage.getItem('inha-team-posts-v1')) || {};
  } catch { /* 위와 같음 */ }
};
loadStore();
// 다른 탭에서 저장하면 여기 것도 다시 읽고 다시 그림. 안 그러면 옛 내용으로 덮어써서 지운 글·신청이 되살아남.
// refresh()는 화면별 파일(home.js, programs.js, mypage.js)에 있음.
window.addEventListener('storage', () => { loadStore(); refresh(); });

const option = (value, text = value) => Object.assign(document.createElement('option'), { value, textContent: text });
if ($('term')) {
  for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) {
    for (const t of [2, 1]) $('term').append(option(`${y}-${t}`, `${y}년 ${t}학기`));
  }
  $('term').value = mileageTerm(now);
}

// 시연 모드에서는 화면을 옮겨 다녀도 같은 학생으로 보이게 링크에 학번을 붙임
if (isStudentId(demoId)) {
  for (const a of document.querySelectorAll('a[data-keep]')) a.href += `${a.href.includes('?') ? '&' : '?'}demo=${demoId}`;
}
