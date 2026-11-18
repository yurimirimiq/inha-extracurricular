// 계산만 하는 함수들 (화면과 분리해서 test.js로 검사)

// 마일리지 학기: 종료일 기준 1~6월 = 1학기, 7~12월 = 2학기 (가이드북 규칙)
const mileageTerm = (date) => `${date.getFullYear()}-${date.getMonth() < 6 ? 1 : 2}`;

// 수업 학기에 해당하는 달: 3~8월이면 1학기(3~8월), 아니면 2학기(9~2월)
const termMonths = (month) => (month >= 3 && month <= 8 ? [3, 4, 5, 6, 7, 8] : [9, 10, 11, 12, 1, 2]);

// months가 null이면 상시 운영
const runsIn = (program, months) => !program.months || program.months.some((m) => months.includes(m));

// records: { '2026-2': { 프로그램이름: 점수 } }
function summarize(records, programs, term) {
  const byName = new Map(programs.map((p) => [p.name, p]));
  const byComp = {};
  let termTotal = 0, certPoints = 0, certCount = 0;
  for (const [t, checked] of Object.entries(records)) {
    for (const [name, raw] of Object.entries(checked)) {
      const p = byName.get(name);
      const points = Number(raw);
      if (!p || !(points > 0)) continue;
      if (t === term) {
        termTotal += points;
        byComp[p.comp] = (byComp[p.comp] || 0) + points;
      }
      if (!p.noCert) { certPoints += points; certCount += 1; }
    }
  }
  return { termTotal, byComp, certPoints, certCount };
}

const isStudentId = (text) => /^\d{8}$/.test(text);

// 교직원이 붙여넣은 명단(줄바꿈·쉼표·공백 구분)을 학번 목록으로. 중복은 한 번만.
function parseStudentIds(text) {
  const tokens = [...new Set(text.split(/[\s,;]+/).filter(Boolean))];
  return { valid: tokens.filter(isStudentId), invalid: tokens.filter((t) => !isStudentId(t)) };
}

// confirmations: { 학기: { 프로그램이름: { 학번: 점수 } } } → 그 학생 것만 { 학기: { 프로그램이름: 점수 } }
function confirmedFor(confirmations, studentId) {
  const out = {};
  for (const [term, programs] of Object.entries(confirmations)) {
    for (const [name, students] of Object.entries(programs)) {
      if (studentId in students) (out[term] ??= {})[name] = students[studentId];
    }
  }
  return out;
}

// 내가 체크한 것 + 확정된 것. 같은 프로그램이면 확정 점수가 이김.
function mergeRecords(mine, confirmed) {
  const out = {};
  for (const term of new Set([...Object.keys(mine), ...Object.keys(confirmed)])) {
    out[term] = { ...mine[term], ...confirmed[term] };
  }
  return out;
}

if (typeof module !== 'undefined') {
  module.exports = { mileageTerm, termMonths, runsIn, summarize, isStudentId, parseStudentIds, confirmedFor, mergeRecords };
}
