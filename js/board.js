// 팀원 구하기 글·댓글 저장소 (config.js, logic.js 다음에 불러옴).
// config.js에 Supabase 주소가 있으면 서버에 저장해서 모두에게 보이고, 없으면 이 브라우저에만 저장함.
// 어느 쪽이든 같은 모양으로 돌려줌:
//   [{ id, program, title, body, skills, contact, author, mine, at, comments: [{ id, body, skills, author, mine, at }] }]
// skills는 글쓴이·지원자가 적은 경험·역량. 예전 글에는 없어서 빈 글자로 돌려줌.
// author는 "22학번" 같은 표시용 글자, mine은 내가 쓴 것인지.
const board = (() => {
  const remote = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

  // ---------- 이 브라우저에만 저장: { 프로그램이름: [{ id, title, body, contact, author(학번), at, comments }] } ----------
  const LOCAL_KEY = 'inha-team-posts-v1';
  // 매번 저장소에서 새로 읽고 써서, 탭을 여러 개 열어도 옛 내용으로 덮어쓰지 않음
  const read = () => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}; } catch { return {}; } };
  const write = (all) => { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(all)); } catch { /* 저장소를 못 쓰면 저장 없이 동작 */ } };
  const local = {
    async list(who) {
      return Object.entries(read()).flatMap(([program, posts]) => posts.map((p) => ({
        id: p.id, program, title: p.title, body: p.body, skills: p.skills || '', contact: p.contact, author: authorLabel(p.author), mine: p.author === who, at: p.at,
        comments: (p.comments || []).map((c) => ({ id: c.id, body: c.body, skills: c.skills || '', author: authorLabel(c.author), mine: c.author === who, at: c.at })),
      }))).sort((a, b) => b.at - a.at);
    },
    async addPost(who, program, fields) {
      const all = read();
      (all[program] ??= []).unshift({ id: Date.now(), ...fields, author: who, at: Date.now() });
      write(all);
    },
    async addComment(who, postId, body, skills = '') {
      const all = read();
      const post = Object.values(all).flat().find((p) => p.id === postId);
      if (!post) return;
      (post.comments ??= []).push({ id: Date.now(), body, skills, author: who, at: Date.now() });
      write(all);
    },
    async removePost(id) {
      const all = read();
      for (const program of Object.keys(all)) all[program] = all[program].filter((p) => p.id !== id);
      write(all);
      return true;
    },
    async removeComment(id) {
      const all = read();
      for (const post of Object.values(all).flat()) if (post.comments) post.comments = post.comments.filter((c) => c.id !== id);
      write(all);
      return true;
    },
  };

  // ---------- 서버(Supabase)에 저장. 표와 규칙은 supabase.sql ----------
  const api = async (path, body) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: body && JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`게시판 서버 오류 ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  };
  // shortcut: 진짜 로그인이 없어서 "내 글"을 학번이 아니라 이 브라우저에 만들어 둔 비밀 열쇠로 구분함.
  // 서버에는 열쇠의 해시(owner_tag)만 올라가고, 지울 때 열쇠를 보내 서버가 맞는지 확인함.
  // 그래서 다른 기기나 저장소를 지운 브라우저에서는 내 글을 못 지움. 진짜 로그인을 붙이면 계정으로 바꿈.
  const ownerKey = () => {
    let key = localStorage.getItem('inha-owner-key');
    if (!key) { key = crypto.randomUUID(); localStorage.setItem('inha-owner-key', key); }
    return key;
  };
  let tag;
  const ownerTag = async () => tag ??= [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ownerKey())))]
    .map((b) => b.toString(16).padStart(2, '0')).join('');
  const server = {
    // shortcut: 모든 프로그램의 글을 한 번에 받아옴. 글이 수백 개를 넘으면 프로그램별로 나눠 받게 바꿈.
    async list() {
      const mine = await ownerTag();
      const rows = await api('posts?select=*,comments(*)&order=created_at.desc');
      return rows.map((p) => ({
        id: p.id, program: p.program, title: p.title, body: p.body, skills: p.skills || '', contact: p.contact, author: p.author, mine: p.owner_tag === mine, at: Date.parse(p.created_at),
        comments: p.comments.map((c) => ({ id: c.id, body: c.body, skills: c.skills || '', author: c.author, mine: c.owner_tag === mine, at: Date.parse(c.created_at) })).sort((a, b) => a.at - b.at),
      }));
    },
    // 학번 전체는 서버로 보내지 않고 "22학번" 같은 표시만 보냄
    async addPost(who, program, fields) { await api('posts', { program, ...fields, author: authorLabel(who), owner_tag: await ownerTag() }); },
    async addComment(who, postId, body, skills = '') { await api('comments', { post_id: postId, body, skills, author: authorLabel(who), owner_tag: await ownerTag() }); },
    removePost: (id) => api('rpc/delete_post', { p_id: id, p_key: ownerKey() }),
    removeComment: (id) => api('rpc/delete_comment', { p_id: id, p_key: ownerKey() }),
  };

  return { remote, ...(remote ? server : local) };
})();
