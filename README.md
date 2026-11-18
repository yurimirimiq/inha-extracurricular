# inha-extracurricular

인하대 비교과(인하 더 배움) 프로그램을 한눈에 보고, 내 예상 마일리지를 바로 확인하는 웹사이트. 학교 공식 서비스가 아님.

## 보는 법

`index.html`을 브라우저로 열면 됨. 설치할 것 없음.

## 파일

- `data.js` — 프로그램 목록 (2026 가이드북 기준). 프로그램을 고치거나 추가할 때 여기만 수정.
- `logic.js` — 마일리지 계산
- `index.html`, `home.js` — 홈: 내 마일리지 요약과 비교과·마일리지 설명
- `programs.html`, `programs.js` — 프로그램 신청 화면
- `common.js` — 두 화면이 같이 쓰는 로그인 확인·저장 코드
- `team.js`, `team.html` — 팀 프로그램별 팀원 구하기 글 (시험 버전: 이 브라우저에만 저장)
- `icons/` — 3D 이모지 그림 (Microsoft Fluent Emoji, MIT 라이선스)
- `mascot/` — 인하대 공식 마스코트 그림 (저작권은 인하대학교, 사용 조건은 폴더 안 README.txt)
- `login.html` — 로그인 화면 (시험 버전: 아무 값이나 통과, 비밀번호는 저장 안 함)
- `admin.js`, `admin.html` — 교직원 화면 (시연용, 가짜 데이터, 이 브라우저에만 저장)
- `style.css` — 두 화면이 같이 쓰는 꾸밈
- `test.js` — 검사. `node test.js`로 실행.
