# gj-jn-policy-radar-web

광주·전남 정책 모니터링 백엔드(`gj-jn-policy-radar`)를 소비하는 Next.js 대시보드입니다. 오늘의 브리핑, 이슈 익스플로러, 트렌드 분석, 지역 지도, 리포트·알림, 관리자 화면을 제공합니다.

## 스크린샷

| 오늘의 브리핑               | 이슈 익스플로러                 | 지역 지도                  |
| --------------------------- | ------------------------------- | -------------------------- |
| `docs/screenshots/home.png` | `docs/screenshots/explorer.png` | `docs/screenshots/map.png` |

## 컴포넌트 구조

```mermaid
graph TD
  App[Next.js App Router] --> Shell[AppShell]
  Shell --> Header
  Shell --> Sidebar
  Shell --> Pages[6 Main Pages]
  Pages --> Query[TanStack Query Hooks]
  Query --> API[FastAPI Backend]
  Pages --> Charts[ECharts/MapLibre/Cytoscape]
  Pages --> UI[Radix + Tailwind UI]
  Admin[/admin] --> Middleware[NextAuth Middleware]
  Middleware --> Login[/login]
```

## 설치

```powershell
copy .env.example .env
pnpm install
pnpm dev
```

개발 주소:

```text
http://localhost:3000
```

로컬 3000 포트가 불안정하면:

```powershell
.\node_modules\.bin\next.cmd dev -H 127.0.0.1 -p 53100
```

## 백엔드 연동

`.env`에 FastAPI 주소를 지정합니다.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change-me
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin
USER_PASSWORD=user
ADMIN_API_KEY=backend-admin-key
```

관리자 mutation은 브라우저에서 직접 백엔드에 키를 보내지 않고 `/api/admin/*` Route Handler를 경유합니다.

## 인증

- 일반 사용자: 이메일 + `USER_PASSWORD`
- 관리자: `ADMIN_EMAIL` + `ADMIN_PASSWORD`
- `/admin/*`은 middleware에서 `role=admin` 세션만 허용합니다.

## 주요 화면

- `/`: 오늘의 브리핑
- `/explorer`: 이슈 익스플로러
- `/trends`: 트렌드 & 토픽
- `/map`: 지역 지도
- `/reports`: 리포트 & 알림
- `/admin`: 관리자

## 단축키

| 키  | 동작                        |
| --- | --------------------------- |
| `/` | 이슈 익스플로러 검색 포커스 |
| `j` | 다음 기사 선택              |
| `k` | 이전 기사 선택              |
| `b` | 선택 기사 북마크            |

## Docker

```powershell
docker compose up --build
```

`web` 서비스는 Next.js standalone 출력물을 사용합니다. `--profile full`을 사용하면 예시 `postgres/api/scheduler` 서비스 정의까지 함께 사용할 수 있습니다.

```powershell
docker compose --profile full up --build
```

## 품질 검사

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm e2e
```

CI는 `.github/workflows/web.yml`에서 lint, TypeScript, Vitest, Playwright를 실행합니다.

## 트러블슈팅

- 글자가 `\uXXXX`처럼 보이면 브라우저 강력 새로고침 후 개발 서버를 재시작합니다.
- 백엔드 데이터가 `ì ì±`처럼 보이면 API 클라이언트의 mojibake 복구 레이어가 적용되는지 확인합니다.
- `/admin` 접근이 막히면 `.env`의 `NEXTAUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`를 확인합니다.
- 차트가 비어 있으면 백엔드 seed 또는 daily pipeline을 먼저 실행합니다.

## 최종 검증 체크리스트

- [ ] `docker-compose up` 후 localhost:3000 접속
- [ ] 상단 배지에 "마지막 수집"·"다음 실행" 정상 표시
- [ ] 6개 메인 화면 모두 정상 동작
- [ ] 다크/라이트 토글, 모바일 반응형 확인
- [ ] 관리자 로그인 → /admin/\* 접근, 비관리자는 차단
- [ ] Lighthouse(데스크탑) 성능·접근성 90 이상
- [ ] pnpm test 와 pnpm e2e 통과
