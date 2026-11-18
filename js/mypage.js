// 마이페이지: 내 정보·점수·신청·글·댓글 (common.js 다음에 불러옴)
const day = (at) => new Date(at).toLocaleDateString('ko-KR');
const teamLink = (name) => Object.assign(el('a', '', name), { href: `team.html?p=${encodeURIComponent(name)}` });
const button = (text, onClick) => {
  const b = Object.assign(el('button', '', text), { type: 'button' });
  b.addEventListener('click', onClick);
  return b;
};
const myApplications = () => Object.entries(applications).filter(([, a]) => a[me]).map(([name, a]) => [name, a[me]]);

// 내 정보. 저장한 적이 없으면 신청에 적혀 있던 이름·학과를 보여줌(교직원 시연 학생).
const known = myApplications().map(([, a]) => a).find((a) => a.name) || {};
$('sid').value = me === 'guest' ? '' : me;
$('name').value = profile.name || known.name || '';
$('dept').value = profile.dept || known.dept || '';
$('profileForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const saved = { name: $('name').value.trim(), dept: $('dept').value.trim() };
  profiles[me] = Object.assign(profile, saved);
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch { /* 위와 같음 */ }
  // 이미 낸 신청에도 반영해서 교직원 화면에 바로 보이게 함
  for (const [, a] of myApplications()) Object.assign(a, saved);
  saveApplications();
  $('saved').textContent = '저장했어요.';
});

function renderScores() {
  const records = effective();
  const s = summarize(records, PROGRAMS, mileageTerm(now));
  $('scoreSummary').textContent = `이번 학기 ${s.termTotal}점 · 참인재 인증 ${s.certPoints} / 36점 (${s.certCount} / 12개)`;
  const terms = Object.keys(records).sort().reverse();
  $('scoreTerms').replaceChildren(...(terms.length ? terms.map((t) => {
    const li = el('li', 'card');
    const total = Object.values(records[t]).reduce((sum, n) => sum + n, 0);
    li.append(el('h3', '', `${t.replace('-', '년 ')}학기 · ${total}점`), el('p', 'post-body', Object.entries(records[t]).map(([name, n]) => `${name} ${n}점`).join('\n')));
    return li;
  }) : [el('li', 'empty', '아직 받은 점수가 없어요. 교직원이 점수를 부여하면 여기에 보여요.')]));
}

const statusCell = (a) => { const td = el('td'); td.append(el('span', `status ${a.points > 0 ? 'done' : a.status}`, a.points > 0 ? '이수' : APPLY_STATUS[a.status])); return td; };

function renderApplications() {
  const mine = myApplications().sort((a, b) => b[1].at - a[1].at);
  $('applyCount').textContent = `${mine.length}건`;
  $('applyEmpty').hidden = mine.length > 0;
  $('applyRows').closest('table').hidden = !mine.length;
  $('applyRows').replaceChildren(...mine.map(([name, a]) => {
    const tr = el('tr');
    const last = el('td');
    // 선발 전에만 취소할 수 있음 (programs.js와 같은 규칙)
    if (a.status === 'applied' && !(a.points > 0)) {
      const cancel = button('신청 취소', () => {
        if (!confirm(`${name} 신청을 취소할까요?`)) return;
        delete applications[name][me];
        saveApplications(); renderApplications();
      });
      cancel.setAttribute('aria-label', `${name} 신청 취소`);
      last.append(cancel);
    }
    tr.append(el('td', '', name), el('td', '', day(a.at)), statusCell(a), el('td', '', a.points > 0 ? `${a.points}점` : '-'), last);
    return tr;
  }));
}

// 내 글·댓글: 내용은 사용자가 쓴 것이라 전부 textContent로만 넣음
function renderWriting() {
  const posts = boardPosts.filter((p) => p.mine);
  const comments = boardPosts.flatMap((post) => post.comments.filter((c) => c.mine).map((c) => ({ post, c }))).sort((a, b) => b.c.at - a.c.at);
  const fail = () => alert('게시판에 연결하지 못했어요. 잠시 후 다시 해주세요.');
  const remove = (ask, action) => {
    if (!confirm(ask)) return;
    action().then((done) => { if (!done) alert('이 브라우저에서 쓴 것만 지울 수 있어요.'); return loadBoard(); }).catch(fail);
  };
  const card = (program, at, parts, removeText, onRemove) => {
    const li = el('li', 'card');
    const meta = el('div', 'card-top');
    meta.append(teamLink(program), el('span', '', day(at)));
    const mine = el('div', 'mine');
    mine.append(button(removeText, onRemove));
    li.append(meta, ...parts, mine);
    return li;
  };
  $('postCount').textContent = `${posts.length}개`;
  $('postsEmpty').hidden = posts.length > 0;
  $('myPosts').replaceChildren(...posts.map((post) => card(post.program, post.at,
    [el('h3', '', post.title), el('p', 'post-body', post.body), el('p', 'hint', `댓글 ${post.comments.length}개`)],
    '글 지우기', () => remove('이 글을 지울까요? 달린 댓글도 같이 지워져요.', () => board.removePost(post.id)))));
  $('commentCount').textContent = `${comments.length}개`;
  $('commentsEmpty').hidden = comments.length > 0;
  $('myComments').replaceChildren(...comments.map(({ post, c }) => card(post.program, c.at,
    [el('p', 'hint', `"${post.title}" 글에 남긴 댓글`), el('p', 'post-body', c.body)],
    '댓글 지우기', () => remove('이 댓글을 지울까요?', () => board.removeComment(c.id)))));
}

function refresh() { renderScores(); renderApplications(); renderWriting(); }
refresh();
