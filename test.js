// 실행: node test.js
const assert = require('node:assert');
const { PROGRAMS, DEPTS, COMPS } = require('./data.js');
const { mileageTerm, termMonths, runsIn, summarize, parseStudentIds, confirmedFor, mergeRecords, authorLabel } = require('./logic.js');

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

// 교직원 명단 입력
assert.deepEqual(parseStudentIds('12201234\n12201235, 1220abc\n12201234  999'), {
  valid: ['12201234', '12201235'],
  invalid: ['1220abc', '999'],
});
assert.deepEqual(parseStudentIds('  \n'), { valid: [], invalid: [] });

// 확정 내역: 그 학생 것만 뽑고, 내 체크와 합칠 때 확정 점수가 이김
const confirmations = {
  '2026-2': { '인하 튜터링': { '12201234': 4, '12201235': 4 }, '역사기행': { '12201235': 1 } },
  '2026-1': { '국제도우미 Buddy': { '12201234': 3 } },
};
const mine = confirmedFor(confirmations, '12201234');
assert.deepEqual(mine, { '2026-2': { '인하 튜터링': 4 }, '2026-1': { '국제도우미 Buddy': 3 } });
assert.deepEqual(confirmedFor(confirmations, '00000000'), {});
assert.deepEqual(
  mergeRecords({ '2026-2': { '인하 튜터링': 2, '역사기행': 1 }, '2025-2': { 'BOOK새통': 1 } }, mine),
  { '2026-2': { '인하 튜터링': 4, '역사기행': 1 }, '2025-2': { 'BOOK새통': 1 }, '2026-1': { '국제도우미 Buddy': 3 } },
);

// 글쓴이 표시
assert.equal(authorLabel('12221234'), '22학번');
for (const odd of ['ㄷ', '', null, 'guest']) assert.equal(authorLabel(odd), '익명');

console.log(`통과 (프로그램 ${PROGRAMS.length}개)`);
