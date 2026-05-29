# gj-jn-policy-radar-web

광주·전남 정책 모니터링 백엔드(`gj-jn-policy-radar`)를 사용하는 Next.js 대시보드입니다. 오늘의 브리핑, 이슈 익스플로러, 트렌드, 지역 지도, 리포트, 관리자 화면을 제공합니다.

## 실행

```powershell
corepack pnpm install
corepack pnpm dev
```

기본 주소는 `http://localhost:3000`입니다. Windows에서 3000번 포트가 예약되어 있으면 다음처럼 다른 포트로 실행합니다.

```powershell
corepack pnpm exec next dev -H 127.0.0.1 -p 3120
```

## 백엔드 연동

`.env.local`에 FastAPI 주소를 지정합니다.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3120
NEXTAUTH_SECRET=change-me
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin
USER_PASSWORD=user
ADMIN_API_KEY=change-me
```

## 지역 지도 GeoJSON 데이터

지역 지도 화면은 다음 파일을 사용합니다.

- `public/geojson/gwangju.geojson`: 광주 5개 자치구
- `public/geojson/jeonnam.geojson`: 전남 22개 시군

현재 저장소에는 개발·시연용으로 단순화한 경계 샘플이 포함되어 있습니다. 운영 배포에서는 국토지리정보원 또는 행정안전부 행정구역 경계 자료를 GeoJSON으로 변환해 교체하는 것을 권장합니다.

출처 표기:

- 국토지리정보원 국토정보플랫폼 행정경계 자료
- 행정안전부 주민등록 행정구역 코드 및 행정구역 기준 자료

공식/내부 배포 GeoJSON URL이 준비되어 있으면 아래처럼 내려받을 수 있습니다.

```powershell
$env:GWANGJU_GEOJSON_URL="https://example.com/gwangju.geojson"
$env:JEONNAM_GEOJSON_URL="https://example.com/jeonnam.geojson"
corepack pnpm geojson
```

`scripts/download-geojson.ts`는 위 두 환경변수를 읽어 `public/geojson/gwangju.geojson`, `public/geojson/jeonnam.geojson`을 갱신합니다.

## 주요 단축키

| 키  | 동작                        |
| --- | --------------------------- |
| `/` | 이슈 익스플로러 검색 포커스 |
| `j` | 다음 기사 선택              |
| `k` | 이전 기사 선택              |
| `b` | 선택 기사 북마크            |

## 품질 확인

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm e2e
```

## 최종 체크리스트

- [ ] 백엔드 `http://localhost:8000` 정상 응답
- [ ] 프론트 접속 후 상단 배지에 마지막 수집·다음 실행 표시
- [ ] 6개 메인 화면 정상 동작
- [ ] 지역 지도에서 광주 5구·전남 22시군 지도 표시
- [ ] 지도 행정구역 클릭 시 상세 패널 및 URL `?region=...` 반영
- [ ] 지역×영역 히트맵 셀 클릭 시 이슈 익스플로러 이동
- [ ] 관리자 로그인 후 `/admin` 접근
- [ ] `corepack pnpm test`, `corepack pnpm e2e` 통과
