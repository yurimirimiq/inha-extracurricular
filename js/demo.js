// 시연 도구 (data.js, logic.js 다음에 불러옴). 학교에 보여줄 때 텅 빈 화면 대신 그럴듯한 예시 데이터로 시작하고,
// 아래쪽 막대로 학생 화면과 교직원 화면을 오갈 수 있게 함. 전부 이 브라우저에만 저장되는 지어낸 데이터.
const DEMO_FLAG = 'inha-demo';
const DEMO_STUDENT = '12229001';
const DEMO_STAFF = '시연 교직원';

function seedDemo() {
  const day = 86400000, now = Date.now();
  const term = mileageTerm(new Date());
  // 지난 학기 (예: 2026-2 → 2026-1, 2026-1 → 2025-2)
  const [year, half] = term.split('-').map(Number);
  const lastTerm = half === 2 ? `${year}-1` : `${year - 1}-2`;
  // 지어낸 학생들. 실제 학번과 겹치지 않게 뒤 네 자리를 9000번대로 둠.
  const people = {
    12229001: ['김인하', '컴퓨터공학과'], 12239002: ['이비룡', '경영학과'], 12249003: ['박인경', '국어국문학과'],
    12229004: ['최용현', '기계공학과'], 12259005: ['정하늘', '국제통상학과'], 12239006: ['한바다', '해양과학과'],
    12249007: ['오하윤', '화학공학과'], 12259008: ['서지우', '전자공학과'], 12239009: ['문태오', '통계학과'],
  };
  // 교직원이 등록한 활동: 신청 중(마감 임박) 하나, 곧 시작 하나
  const dateText = (offset) => todayText(new Date(now + offset * day));
  const custom = [
    { name: 'AI 활용 글쓰기 워크숍', dept: '교수학습개발센터', comp: '의사소통', points: 2, months: TERM, custom: true, note: '회차별 20명', applyFrom: dateText(-6), applyTo: dateText(2) },
    { name: '겨울방학 코딩 부트캠프', dept: '인하공학교육혁신센터', comp: '지식활용', points: 4, months: VAC, custom: true, note: '3주 과정', applyFrom: dateText(4), applyTo: dateText(18) },
  ];

  // '학번:상태+점수'. a=대기, s=선발완료, r=미선발, 뒤의 숫자는 부여한 점수. 끝에 p가 붙으면 지난 학기 점수.
  const plan = {
    '학습유형진단': '12229001:s1p',
    '인하TED워크숍': '12229001:s1p',
    '국제도우미 Buddy': '12229001:s3p 12259005:a 12239006:a',
    'GEE 프로그램(Movie Club)': '12229001:s3p',
    '인하 튜터링': '12229001:s4 12239002:s4 12249003:s 12229004:a 12259005:a 12239006:r',
    'Global Program': '12229001:s3 12259005:s3 12239009:s3 12239002:r',
    'BOOK드림': '12229001:s2',
    '런! 런! 챌린지': '12229001:s2 12249007:s2',
    'Rise-Up 신입생 멘토링': '12229001:s 12249003:s 12259005:s 12249007:a',
    '기업사회문제해결프로젝트': '12229001:a 12229004:a 12239006:a 12259008:a 12239009:a',
    '인하-동동(同動)': '12239002:a 12249007:a 12259008:a',
    'INHA B-Meet Club': '12249003:a 12249007:s 12239009:a',
    '영어 프리젠테이션 경진대회': '12229001:r 12259008:s 12229004:a',
    'AI 활용 글쓰기 워크숍': '12259008:a 12239002:a 12239006:a 12249007:a 12239009:a', // 시연 학생은 아직 신청 전 (직접 눌러 보게)
  };
  const applications = {};
  let n = 0;
  for (const [program, list] of Object.entries(plan)) {
    for (const item of list.split(' ')) {
      const [id, code] = item.split(':');
      const points = Number(code.replace(/\D/g, ''));
      const past = code.endsWith('p');
      const a = { status: { a: 'applied', s: 'selected', r: 'rejected' }[code[0]], at: now - (past ? 150 : 2 + (n++ % 20)) * day, name: people[id][0], dept: people[id][1] };
      if (points) Object.assign(a, { points, term: past ? lastTerm : term });
      (applications[program] ??= {})[id] = a;
    }
  }

  const post = (id, daysAgo, author, title, body, contact, comments) => ({
    id, title, body, contact, author, at: now - daysAgo * day,
    comments: comments.map(([who, text], i) => ({ id: id * 10 + i, author: who, body: text, at: now - daysAgo * day + (i + 1) * 3600000 })),
  });
  const posts = {
    '인하-동동(同動)': [
      post(101, 1, '12229001', '선형대수 스터디 팀원 구합니다', '화·목 저녁 7시에 60주년기념관에서 모여요. 과제 같이 풀고 시험 전에 기출 정리할 분 환영!', '오픈채팅 "인하 선대 스터디"', [['12229004', '기계과인데 참여 가능할까요?'], ['12229001', '그럼요! 오픈채팅으로 들어와 주세요 :)']]),
      post(102, 3, '12249003', '자료구조 같이 공부할 2명 구해요', '매주 수요일 오후에 2시간씩 모여서 문제 풀어요. 1학년도 괜찮아요.', '인스타 @inha_ds_study', [['12249007', '저 참여하고 싶어요! 수요일 가능해요'], ['12259008', '한 자리 남았나요?']]),
    ],
    '인하 튜터링': [
      post(103, 2, '12229004', '미적분 튜티 구해요 (튜터 경험 있음)', '작년에 튜터로 활동했어요. 공학수학까지 봐드릴 수 있고, 주 1회 2시간 생각하고 있어요.', '오픈채팅 "미적 튜터링"', [['12229001', '시간대가 어떻게 되나요?'], ['12229004', '평일 4시 이후면 다 좋아요']]),
    ],
    'INHA B-Meet Club': [
      post(104, 5, '12249007', 'SF 소설 읽는 독서 팀 만들어요', '한 달에 한 권, 테드 창부터 시작하려고 해요. 4명 정도 모이면 신청할게요.', '오픈채팅 "인하 SF 읽기"', [['12229001', '재밌겠다, 저도 낄게요']]),
    ],
    'Rise-Up 신입생 멘토링': [
      post(105, 6, '12259005', '국제통상학과 신입생 멘티 모집', '수강신청, 교환학생 준비, 동아리 고르는 법까지 같이 얘기해요. 격주로 만납니다.', '인스타 @haneul_trade', []),
    ],
  };

  const set = (key, value) => localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  set(DEMO_FLAG, '1');
  set('inha-session', DEMO_STUDENT);
  set('inha-staff-session', DEMO_STAFF);
  set('inha-profiles-v1', { [DEMO_STUDENT]: { name: people[DEMO_STUDENT][0], dept: people[DEMO_STUDENT][1] } });
  set('inha-apply-demo-v1', applications);
  set('inha-team-posts-v1', posts);
  set(CUSTOM_KEY, custom);
}

function endDemo() {
  for (const key of [DEMO_FLAG, 'inha-session', 'inha-staff-session', 'inha-profiles-v1', 'inha-apply-demo-v1', 'inha-team-posts-v1', CUSTOM_KEY]) localStorage.removeItem(key);
}

// 시연 중이면 화면 아래에 막대를 붙임 (로그인 화면 제외)
(() => {
  let on = false;
  try { on = Boolean(localStorage.getItem(DEMO_FLAG)); } catch { /* 저장소를 못 쓰면 시연 도구 없음 */ }
  if (!on || document.body.classList.contains('login')) return;
  document.body.classList.add('demo');
  const bar = document.createElement('aside');
  bar.className = 'demo-bar';
  bar.setAttribute('aria-label', '시연 도구');
  const staffSide = location.pathname.endsWith('admin.html');
  const link = (text, href, current) => {
    const a = Object.assign(document.createElement('a'), { textContent: text, href });
    if (current) a.setAttribute('aria-current', 'page');
    return a;
  };
  const button = (text, onClick) => {
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: text });
    b.addEventListener('click', onClick);
    return b;
  };
  bar.append(
    Object.assign(document.createElement('strong'), { textContent: '시연 모드' }),
    link('학생 화면', 'index.html', !staffSide),
    link('교직원 화면', 'admin.html', staffSide),
    button('처음 상태로', () => { if (confirm('예시 데이터를 처음 상태로 되돌릴까요?')) { seedDemo(); location.reload(); } }),
    button('끝내기', () => { if (confirm('시연을 끝내고 예시 데이터를 모두 지울까요?')) { endDemo(); location.href = 'login.html'; } }));
  document.body.append(bar);
})();
