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

// 신청 상태 (학생 화면과 교직원 화면이 같이 씀)
const APPLY_STATUS = { applied: '대기', selected: '선발완료', rejected: '미선발' };

// 신청 기간. applyFrom~applyTo는 '2026-11-20' 모양이고 두 날 모두 신청할 수 있음. today도 같은 모양.
// 기간이 없는 프로그램(가이드북 목록)은 null. state: before(시작 전) / open(신청 중) / closed(마감), days: 시작 또는 마감까지 남은 날
function applyPeriod(program, today) {
  if (!program.applyFrom || !program.applyTo) return null;
  const days = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
  if (today < program.applyFrom) return { state: 'before', days: days(today, program.applyFrom) };
  if (today > program.applyTo) return { state: 'closed', days: 0 };
  return { state: 'open', days: days(today, program.applyTo) };
}
const periodLabel = ({ state, days }) => ({
  before: `${days}일 뒤 신청 시작`,
  open: days === 0 ? '오늘 마감' : `마감까지 ${days}일`,
  closed: '신청 마감',
}[state]);
// 날짜를 '2026-11-20' 모양으로 (이 기기 시간 기준, 안 주면 오늘)
const todayText = (d = new Date()) => { return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); };
// '2026-11-20' → '11.20'
const shortDate = (text) => `${Number(text.slice(5, 7))}.${Number(text.slice(8, 10))}`;

const isStudentId = (text) => /^\d{8}$/.test(text);

// 게시판 글쓴이 표시: 학번 전체 대신 입학 연도만 (12221234 → "22학번"). 인하대 학번이 12 + 입학 연도 두 자리로 시작한다고 가정함.
const authorLabel = (studentId) => (isStudentId(studentId || '') ? `${studentId.slice(2, 4)}학번` : '익명');

// 교직원이 신청에 부여한 점수만 모음.
// applications: { 프로그램이름: { 신청자: { status, points, term } } } → 그 학생 것만 { 학기: { 프로그램이름: 점수 } }
function grantedFor(applications, studentId) {
  const out = {};
  for (const [name, applicants] of Object.entries(applications)) {
    const a = applicants[studentId];
    if (a && a.points > 0 && a.term) (out[a.term] ??= {})[name] = a.points;
  }
  return out;
}

if (typeof module !== 'undefined') {
  module.exports = { mileageTerm, termMonths, runsIn, summarize, APPLY_STATUS, isStudentId, authorLabel, grantedFor, applyPeriod, periodLabel, shortDate };
}
