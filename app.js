const $ = (id) => document.getElementById(id);
const KEY = 'inha-mileage-v1';
const now = new Date();
const month = now.getMonth() + 1;

const db = SUPABASE_URL ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let user = null;

let records = {};
try { records = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* 저장소를 못 쓰면 저장 없이 동작 */ }
const saveLocal = () => { try { localStorage.setItem(KEY, JSON.stringify(records)); } catch { /* 위와 같음 */ } };
const save = () => {
  saveLocal();
  if (user) db.from('records').upsert({ user_id: user.id, data: records }).then(({ error }) => { $('syncError').hidden = !error; });
};

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

// --- 로그인 ---
let signingUp = false;
const setMode = (signup) => {
  signingUp = signup;
  $('authTitle').textContent = $('authSubmit').textContent = signup ? '가입하기' : '로그인';
  $('authSwitch').textContent = signup ? '이미 가입했어요 (로그인)' : '처음이에요 (가입하기)';
  $('signupNote').hidden = !signup;
  $('pw').autocomplete = signup ? 'new-password' : 'current-password';
  $('authError').textContent = '';
};
const AUTH_ERRORS = {
  invalid_credentials: '학번 또는 비밀번호가 맞지 않아요.',
  user_already_exists: '이미 가입된 학번이에요. 로그인해 주세요.',
  weak_password: '비밀번호가 너무 쉬워요. 더 길게 만들어 주세요.',
  over_request_rate_limit: '시도가 너무 많아요. 잠시 뒤에 다시 해주세요.',
};

$('loginOpen').addEventListener('click', () => { setMode(false); $('auth').showModal(); });
$('authClose').addEventListener('click', () => $('auth').close());
$('authSwitch').addEventListener('click', () => setMode(!signingUp));
$('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginEmail($('sid').value.trim());
  if (!email) { $('authError').textContent = '학번은 숫자 8자리로 입력해 주세요.'; return; }
  if (!db) { $('authError').textContent = '아직 서버가 연결되지 않았어요. (config.js 설정 필요)'; return; }
  $('authSubmit').disabled = true;
  const credentials = { email, password: $('pw').value };
  const { data, error } = signingUp ? await db.auth.signUp(credentials) : await db.auth.signInWithPassword(credentials);
  $('authSubmit').disabled = false;
  if (error) { $('authError').textContent = AUTH_ERRORS[error.code] || `잘 안 됐어요: ${error.message}`; return; }
  // 메일 확인 설정이 켜져 있으면 가입해도 로그인이 안 됨
  if (!data.session) { $('authError').textContent = '가입은 됐지만 로그인이 안 됐어요. Supabase의 Confirm email 설정을 꺼주세요.'; return; }
  $('pw').value = '';
  $('auth').close();
});
$('logout').addEventListener('click', async () => {
  await db.auth.signOut();
  // 같이 쓰는 컴퓨터에 기록이 남지 않게 비움
  records = {};
  saveLocal();
  renderSummary(); renderList();
});

async function onUser(u) {
  user = u;
  $('who').textContent = u ? `${u.email.split('@')[0]} 님` : '';
  $('loginOpen').hidden = !!u;
  $('logout').hidden = !u;
  if (!u) return;
  const { data, error } = await db.from('records').select('data').maybeSingle();
  $('syncError').hidden = !error;
  if (error) return;
  // 계정에 기록이 있으면 그걸 쓰고, 처음 로그인이면 이 브라우저 기록을 계정으로 올림
  if (data) { records = data.data; saveLocal(); } else save();
  renderSummary(); renderList();
}
// 콜백 안에서 바로 Supabase를 부르면 멈출 수 있어서 한 박자 늦춤 (Supabase 안내)
db?.auth.onAuthStateChange((_event, session) => {
  const u = session?.user ?? null;
  if (u?.id !== user?.id) setTimeout(() => onUser(u));
});
