// 홈 화면: 내 마일리지 요약 (common.js 다음에 불러옴)
function renderSummary() {
  const term = $('term').value;
  const s = summarize(effective(), PROGRAMS, term);
  const sure = Object.values(confirmed[term] || {}).reduce((a, b) => a + b, 0);
  $('termTotal').textContent = s.termTotal;
  $('heroCount').textContent = Object.keys(effective()[term] || {}).length;
  $('heroSure').textContent = sure;
  $('certPoints').textContent = `${s.certPoints} / 36`;
  $('certPointsBar').value = Math.min(s.certPoints, 36);
  $('certCount').textContent = `${s.certCount} / 12`;

  const used = COMPS.filter((c) => s.byComp[c]);
  $('mixBar').replaceChildren(...used.map((c) => {
    const seg = el('span');
    seg.dataset.comp = c;
    seg.style.flex = s.byComp[c];
    return seg;
  }));
  $('mixLegend').replaceChildren(...(used.length
    ? used.map((c) => { const li = el('li', 'dot', `${c} ${s.byComp[c]}점`); li.dataset.comp = c; return li; })
    : [el('li', '', '참여한 프로그램을 체크하면 여기에 나눠서 보여줘요.')]));
}

// 위쪽 타일: 내 신청 건수와 팀원 구하는 글 수
function renderSide() {
  const mine = Object.values(applications).map((a) => a[me]).filter(Boolean);
  const count = (status) => mine.filter((a) => a.status === status).length;
  $('appliedCount').textContent = mine.length;
  $('appliedFoot').textContent = mine.length ? `선발 ${count('selected')}건 · 대기 ${count('applied')}건` : '신청한 프로그램 보기';
  $('teamCount').textContent = Object.values(teamPosts).reduce((n, list) => n + list.length, 0);
}

$('term').addEventListener('change', renderSummary);
renderSummary();
renderSide();
