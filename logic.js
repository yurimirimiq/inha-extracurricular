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

if (typeof module !== 'undefined') module.exports = { mileageTerm, termMonths, runsIn, summarize };
