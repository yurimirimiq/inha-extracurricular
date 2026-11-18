# inha-extracurricular

인하대 비교과(인하 더 배움) 프로그램을 한눈에 보고, 내 예상 마일리지를 바로 확인하는 웹사이트. 학교 공식 서비스가 아님.

## 보는 법

`index.html`을 브라우저로 열면 됨. 설치할 것 없음.

## 파일

- `data.js` — 프로그램 목록 (2026 가이드북 기준). 프로그램을 고치거나 추가할 때 여기만 수정.
- `logic.js` — 마일리지 계산
- `app.js`, `index.html` — 화면
- `test.js` — 검사. `node test.js`로 실행.
- `config.js` — 로그인 서버(Supabase) 주소와 공개 키. 비어 있으면 로그인 없이 동작.
- `supabase.sql` — Supabase에 한 번 실행하는 표 설정

## 로그인 켜는 법

1. Supabase에서 프로젝트를 만들고 SQL Editor에서 `supabase.sql`을 실행.
2. Authentication → Sign In / Providers → Email에서 **Confirm email을 끔** (학번을 메일 주소 모양으로 바꿔 쓰기 때문에 실제 메일을 보내면 안 됨).
3. Project Settings → API의 Project URL과 anon public 키를 `config.js`에 넣음.
