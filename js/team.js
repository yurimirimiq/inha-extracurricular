// 팀원 구하기 화면 (common.js 다음에 불러옴). 로그인 확인과 위쪽 줄, 글 불러오기(boardPosts)는 common.js가 함.
const program = PROGRAMS.find((p) => p.name === new URLSearchParams(location.search).get('p') && p.team);
if (!program) location.replace('programs.html');

// 글·댓글은 board.js가 저장함 (서버가 연결돼 있으면 서버, 아니면 이 브라우저)
let posts = [];
const fail = () => alert('게시판에 연결하지 못했어요. 잠시 후 다시 해주세요.');
const reload = loadBoard;
// common.js가 글을 받아오거나 다른 탭에서 바뀌면 부름
function refresh() {
  if (!program) return;
  posts = boardPosts.filter((p) => p.program === program.name);
  render();
}
const button = (text, onClick) => {
  const b = Object.assign(el('button', '', text), { type: 'button' });
  b.addEventListener('click', onClick);
  return b;
};
// 지우기: 서버가 "내 글이 아님"이라고 하면(false) 알려줌
const remove = (ask, action) => {
  if (!confirm(ask)) return;
  action().then((done) => { if (!done) alert('이 브라우저에서 쓴 것만 지울 수 있어요.'); return reload(); }).catch(fail);
};

function render() {
  $('count').textContent = `${posts.length}개`;
  $('empty').hidden = posts.length > 0;
  // 글 내용은 사용자가 쓴 것이라 전부 textContent로만 넣음 (HTML로 해석되지 않게)
  $('posts').replaceChildren(...posts.map((post) => {
    const li = el('li', 'card');
    const meta = el('div', 'card-top');
    meta.append(el('span', '', post.author), el('span', '', new Date(post.at).toLocaleDateString('ko-KR')));
    const info = el('dl', 'info');
    info.append(el('dt', '', '연락'), el('dd', '', post.contact));
    li.append(meta, el('h3', '', post.title), el('p', 'post-body', post.body), info);
    if (post.mine) {
      const mine = el('div', 'mine');
      mine.append(button('내 글 지우기', () => remove('이 글을 지울까요? 달린 댓글도 같이 지워져요.', () => board.removePost(post.id))));
      li.append(mine);
    }
    li.append(commentsOf(post));
    return li;
  }));
}

// 댓글: 글마다 목록 + 한 줄 입력. 내용은 textContent로만 넣음.
function commentsOf(post) {
  const box = el('section', 'comments');
  box.append(el('h4', '', `댓글 ${post.comments.length}개`));
  const ul = el('ul');
  ul.append(...post.comments.map((c) => {
    const item = el('li');
    item.append(el('span', 'comment-meta', `${c.author} · ${new Date(c.at).toLocaleDateString('ko-KR')}`), el('p', '', c.body));
    if (c.mine) {
      const erase = button('지우기', () => remove('이 댓글을 지울까요?', () => board.removeComment(c.id)));
      erase.setAttribute('aria-label', '내 댓글 지우기');
      item.append(erase);
    }
    return item;
  }));
  const form = el('form', 'comment-form');
  const input = Object.assign(el('input'), { maxLength: 300, required: true, placeholder: '댓글을 남겨보세요' });
  input.setAttribute('aria-label', `"${post.title}" 글에 댓글 쓰기`);
  form.append(input, el('button', '', '댓글 달기'));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const body = input.value.trim();
    if (!body) return;
    board.addComment(me, post.id, body).then(reload).catch(fail);
  });
  box.append(ul, form);
  return box;
}

if (program) {
  document.title = `${program.name} 팀원 구하기 · 인하 비교과 마일리지`;
  $('name').textContent = program.name;
  $('summary').textContent = `${program.dept} · 팀 구성: ${program.team} · 마일리지 ${program.points}점`;
  // 서버에 저장될 때는 "이 브라우저에만 저장" 안내를 숨김
  $('localNotice').hidden = board.remote;
  $('postForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = { title: $('title').value.trim(), body: $('body').value.trim(), contact: $('contact').value.trim() };
    if (!fields.title || !fields.body || !fields.contact) return;
    board.addPost(me, program.name, fields).then(() => { e.target.reset(); return reload(); }).catch(fail);
  });
}
