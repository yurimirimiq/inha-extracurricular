// 실행: node js/test.js
const assert = require('node:assert');
const { PROGRAMS, DEPTS, COMPS } = require('./data.js');
const { mileageTerm, termMonths, runsIn, summarize, grantedFor, authorLabel } = require('./logic.js');

// 데이터 검사
assert.equal(new Set(PROGRAMS.map((p) => p.name)).size, PROGRAMS.length, '프로그램 이름이 겹침');
for (const p of PROGRAMS) {
  assert.ok(COMPS.includes(p.comp), `${p.name}: 핵심역량 오타`);
  assert.ok(DEPTS[p.dept], `${p.name}: 부서 오타`);
  assert.ok(p.points >= 1 && p.points <= 6, `${p.name}: 마일리지 범위`);
  assert.ok(p.months === null || p.months.every((m) => m >= 1 && m <= 12), `${p.name}: 운영 월`);
  assert.ok(p.apply, `${p.name}: 신청 방법 없음`);
}

// 학기 계산
assert.equal(mileageTerm(new Date(2026, 5, 30)), '2026-1');
assert.equal(mileageTerm(new Date(2026, 6, 1)), '2026-2');
assert.deepEqual(termMonths(11), [9, 10, 11, 12, 1, 2]);
assert.deepEqual(termMonths(3), [3, 4, 5, 6, 7, 8]);

// 운영 시기
assert.ok(runsIn({ months: null }, [1]));
assert.ok(runsIn({ months: [12, 1] }, [1]));
assert.ok(!runsIn({ months: [4, 5] }, [11]));

// 합계: 이번 학기만 더하고, 참인재는 전체 학기에서 역량진단을 빼고 셈
const s = summarize(
  {
    '2026-1': { '인하 튜터링': 4, '인하핵심역량진단': 1 },
    '2026-2': { '인하-동동(同動)': 4, '국제도우미 Buddy': 3, '없는 프로그램': 9, '역사기행': 0 },
  },
  PROGRAMS,
  '2026-2',
);
assert.equal(s.termTotal, 7);
assert.deepEqual(s.byComp, { 지식활용: 4, 의사소통: 3 });
assert.equal(s.certPoints, 11);
assert.equal(s.certCount, 3);

// 부여된 점수: 그 학생 것만, 점수와 학기가 있는 것만
const apps = {
  '인하 튜터링': { '12201234': { status: 'selected', points: 4, term: '2026-2' }, '12201235': { status: 'selected', points: 3, term: '2026-2' } },
  '국제도우미 Buddy': { '12201234': { status: 'selected', points: 3, term: '2026-1' } },
  '역사기행': { '12201234': { status: 'selected' } },
  'BOOK새통': { '12201234': { status: 'applied' } },
};
assert.deepEqual(grantedFor(apps, '12201234'), { '2026-2': { '인하 튜터링': 4 }, '2026-1': { '국제도우미 Buddy': 3 } });
assert.deepEqual(grantedFor(apps, '00000000'), {});
assert.equal(summarize(grantedFor(apps, '12201234'), PROGRAMS, '2026-2').termTotal, 4);

// 글쓴이 표시
assert.equal(authorLabel('12221234'), '22학번');
for (const odd of ['ㄷ', '', null, 'guest']) assert.equal(authorLabel(odd), '익명');

// 게시판 서버 모드(board.js): 가짜 서버로 요청 모양과 "내 글" 구분, 지우기 권한을 검사.
// 가짜 서버는 supabase.sql과 같은 규칙을 흉내 냄(열쇠의 SHA-256이 owner_tag와 같아야 지워짐).
(async () => {
  const fs = require('node:fs');
  const { createHash } = require('node:crypto');
  const tables = { posts: [], comments: [] };
  let nextId = 1;
  const fakeFetch = async (url, { method, headers, body }) => {
    assert.equal(headers.apikey, 'KEY');
    const path = url.replace('https://x.supabase.co/rest/v1/', '');
    const data = body && JSON.parse(body);
    const reply = (value) => ({ ok: true, text: async () => (value === undefined ? '' : JSON.stringify(value)) });
    if (method === 'GET') {
      assert.equal(path, 'posts?select=*,comments(*)&order=created_at.desc');
      return reply(tables.posts.map((p) => ({ ...p, comments: tables.comments.filter((c) => c.post_id === p.id) })));
    }
    if (path.startsWith('rpc/delete_')) {
      const table = tables[path === 'rpc/delete_post' ? 'posts' : 'comments'];
      const tag = createHash('sha256').update(data.p_key).digest('hex');
      const at = table.findIndex((row) => row.id === data.p_id && row.owner_tag === tag);
      if (at >= 0) table.splice(at, 1);
      return reply(at >= 0);
    }
    assert.match(data.owner_tag, /^[0-9a-f]{64}$/);
    assert.equal(data.author, '22학번'); // 학번 전체는 서버로 안 보냄
    tables[path].push({ id: nextId++, created_at: new Date(nextId * 1000).toISOString(), ...data });
    return reply();
  };
  // 브라우저 한 대 = 저장소 하나. 서로 다른 열쇠를 갖게 됨.
  const browser = () => {
    const store = {};
    const localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
    return new Function('SUPABASE_URL', 'SUPABASE_ANON_KEY', 'authorLabel', 'localStorage', 'fetch',
      `${fs.readFileSync(`${__dirname}/board.js`, 'utf8')}; return board;`)('https://x.supabase.co', 'KEY', authorLabel, localStorage, fakeFetch);
  };
  const mine = browser(), other = browser();
  assert.equal(mine.remote, true);
  await mine.addPost('12221234', '인하 튜터링', { title: '제목', body: '내용', contact: '연락' });
  const [post] = await other.list('12229999');
  assert.deepEqual([post.title, post.program, post.author, post.mine], ['제목', '인하 튜터링', '22학번', false]); // 남에게도 보이지만 남의 글
  await other.addComment('12221111', post.id, '댓글');
  const [seen] = await mine.list('12221234');
  assert.deepEqual([seen.mine, seen.comments.length, seen.comments[0].body, seen.comments[0].mine], [true, 1, '댓글', false]);
  assert.equal(await other.removePost(post.id), false); // 남은 못 지움
  assert.equal(await mine.removeComment(seen.comments[0].id), false);
  assert.equal(await other.removeComment(seen.comments[0].id), true);
  assert.equal(await mine.removePost(post.id), true);
  assert.deepEqual(await mine.list('12221234'), []);
  console.log(`통과 (프로그램 ${PROGRAMS.length}개)`);
})();
