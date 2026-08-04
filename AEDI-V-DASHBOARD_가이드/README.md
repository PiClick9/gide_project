# AEDI-V Dashboard 사용 가이드 — 제작 소스

전달물은 상위 폴더의 **`AEDI-V-DASHBOARD_사용가이드.pdf`** 하나입니다.
이 폴더는 그 PDF를 다시 만들기 위한 소스입니다.

## 구성

| 파일 | 역할 |
| --- | --- |
| `guide.html` | 가이드 본문. 내용을 고칠 땐 여기만 수정합니다. |
| `shots/` | 본문에 들어가는 화면 캡처 (자동 생성) |
| `logo.svg` | 표지 로고 (AEDI-V-DASHBOARD `public/logo.svg` 사본) |
| `capture.mjs` | 대시보드를 띄워 `shots/`를 자동 촬영 |
| `mock-data.mjs` | 촬영용 가짜 API 응답 생성기 (고정 시드 → 항상 같은 화면) |
| `build-pdf.mjs` | `guide.html` → PDF |
| `preview.mjs` | 인쇄 레이아웃을 페이지 단위 PNG로 미리보기 (검수용, `preview/`에 생성) |

## 문구만 고칠 때

```bash
# guide.html 수정 후
node build-pdf.mjs
```

## 화면 캡처를 다시 찍을 때

앱이 바뀌었거나 캡처를 새로 뜨고 싶을 때만 필요합니다.

```bash
# 1) 대시보드 dev 서버를 5199 포트로 띄운다
cd ../../AEDI-V-DASHBOARD
npm run dev -- --port 5199 --strictPort

# 2) 다른 터미널에서 촬영 → PDF
cd ../gide_project/AEDI-V-DASHBOARD_가이드
node capture.mjs
node build-pdf.mjs
```

`capture.mjs`는 Playwright의 라우트 가로채기로 `/api/v1/**` 요청을 전부 대신
응답하므로 **백엔드 서버 없이** 실제 화면이 렌더링됩니다.
`AEDI-V-DASHBOARD` 저장소는 전혀 수정하지 않습니다.

## 알아둘 점

- 캡처 데이터는 `mock-data.mjs`의 고정 시드(`SEED`)로 생성되어 매번 동일합니다.
  단, 날짜는 `capture.mjs`의 `TODAY` 상수(현재 `2026-08-04`)를 기준으로 만들어지므로
  다시 촬영하면 화면의 날짜가 그날로 바뀝니다. 본문에서 날짜를 언급한 곳
  (3-2절 "오늘(4일) 이후" 캡션 등)은 함께 확인하세요.
- Playwright는 `AEDI-V-DASHBOARD/node_modules`의 것을 절대 경로로 불러옵니다.
  대시보드 저장소 위치가 바뀌면 `capture.mjs` / `build-pdf.mjs` 상단의
  `PLAYWRIGHT` 상수를 고쳐야 합니다.
- 본문 폰트는 CDN의 Pretendard입니다. PDF를 구울 때 인터넷 연결이 필요합니다.
