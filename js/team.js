const $ = (id) => document.getElementById(id);
const el = (tag, className = '', text = '') => Object.assign(document.createElement(tag), { className, textContent: text });
// shortcut: 글이 이 브라우저에만 저장돼서 남에게 안 보임. 진짜 게시판이 되려면 서버(Supabase)에 저장해야 함.
const POSTS_KEY = 'inha-team-posts-v1';

let session = 'guest';
try { session = localStorage.getItem('inha-session'); } catch { /* 저장소를 못 쓰면 로그인 없이 통과 */ }
if (!session) location.replace('login.html');

const program = PROGRAMS.find((p) => p.name === new URLSearchParams(location.search).get('p') && p.team);
if (!program) location.replace('programs.html');

// { 프로그램이름: [{ id, title, body, contact, author, at, comments: [{ id, body, author, at }] }] }
let posts = {};
try { posts = JSON.parse(localStorage.getItem(POSTS_KEY)) || {}; } catch { /* 위와 같음 */ }
const save = () => { try { localStorage.setItem(POSTS_KEY, JSON.stringify(posts)); } catch { /* 위와 같음 */ } };

function render() {
  const list = posts[program.name] || [];
  $('count').textContent = `${list.length}개`;
  $('empty').hidden = list.length > 0;
  // 글 내용은 사용자가 쓴 것이라 전부 textContent로만 넣음 (HTML로 해석되지 않게)
  $('posts').replaceChildren(...list.map((post) => {
    const li = el('li', 'card');
    const meta = el('div', 'card-top');
    meta.append(el('span', '', authorLabel(post.author)), el('span', '', new Date(post.at).toLocaleDateString('ko-KR')));
    const info = el('dl', 'info');
    info.append(el('dt', '', '연락'), el('dd', '', post.contact));
    li.append(meta, el('h3', '', post.title), el('p', 'post-body', post.body), info);
    if (post.author === session) {
      const remove = el('button', '', '내 글 지우기');
      remove.type = 'button';
      remove.addEventListener('click', () => {
        if (!confirm('이 글을 지울까요?')) return;
        posts[program.name] = list.filter((p) => p.id !== post.id);
        save(); render();
      });
      const mine = el('div', 'mine');
      mine.append(remove);
      li.append(mine);
    }
    li.append(commentsOf(post));
    return li;
  }));
}

// 댓글: 글마다 목록 + 한 줄 입력. 글과 같은 곳에 저장하고, 내용은 textContent로만 넣음.
function commentsOf(post) {
  const comments = post.comments || [];
  const box = el('section', 'comments');
  box.append(el('h4', '', `댓글 ${comments.length}개`));
  const ul = el('ul');
  ul.append(...comments.map((c) => {
    const item = el('li');
    item.append(el('span', 'comment-meta', `${authorLabel(c.author)} · ${new Date(c.at).toLocaleDateString('ko-KR')}`), el('p', '', c.body));
    if (c.author === session) {
      const remove = el('button', '', '지우기');
      remove.type = 'button';
      remove.setAttribute('aria-label', '내 댓글 지우기');
      remove.addEventListener('click', () => {
        if (!confirm('이 댓글을 지울까요?')) return;
        post.comments = comments.filter((x) => x.id !== c.id);
        save(); render();
      });
      item.append(remove);
    }
    return item;
  }));
  const form = el('form', 'comment-form');
  const input = Object.assign(el('input'), { maxLength: 300, required: true, placeholder: '댓글을 남겨보세요' });
  input.setAttribute('aria-label', `"${post.title}" 글에 댓글 쓰기`);
  const submit = el('button', '', '댓글 달기');
  form.append(input, submit);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const body = input.value.trim();
    if (!body) return;
    (post.comments ??= []).push({ id: Date.now(), body, author: session, at: Date.now() });
    save(); render();
  });
  box.append(ul, form);
  return box;
}

if (program) {
  document.title = `${program.name} 팀원 구하기 · 인하 비교과 마일리지`;
  $('name').textContent = program.name;
  $('summary').textContent = `${program.dept} · 팀 구성: ${program.team} · 마일리지 ${program.points}점`;
  $('postForm').addEventListener('submit', (e) => {
    e.preventDefault();
    (posts[program.name] ??= []).unshift({
      id: Date.now(),
      title: $('title').value.trim(),
      body: $('body').value.trim(),
      contact: $('contact').value.trim(),
      author: session,
      at: Date.now(),
    });
    save(); render();
    e.target.reset();
  });
  render();
}
