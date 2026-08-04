# AEDI-V 크리에이터 사용 가이드 — 제작 소스

전달물은 상위 폴더의 **`AEDI-V-EXTENSION_사용가이드.pdf`** 하나입니다.
이 폴더는 그 PDF를 다시 만들기 위한 소스입니다.

## 이 문서의 전제

| 항목 | 값 |
| --- | --- |
| 본문 언어 | **한국어** (미국 현지에서 영어로 번역해 사용하는 원고) |
| 화면 이미지 | **영문 UI** (`_en` 튜토리얼 이미지) |
| 대상 지역 | **미국** — 제휴는 Amazon Associates 기준 (한국은 쿠팡 파트너스) |
| 기준 버전 | 확장 **v1.2.79** |

## 구성

| 파일 | 역할 |
| --- | --- |
| `guide.html` | 가이드 본문. 내용을 고칠 땐 여기만 수정합니다. |
| `shots/` | 본문 이미지. `tutorial*_en.png`는 `aedi-v/images` 사본, 숫자로 시작하는 파일은 실제 화면 캡처 |
| `logo.svg` | 표지 로고 (`aedi-v/images/logo.svg` 사본) |
| `build-pdf.mjs` | `guide.html` → PDF |
| `preview.mjs` | HTML을 고정 높이로 잘라 훑어보기 (`preview/`에 생성) |
| `render-pdf.mjs` | **완성된 PDF를 페이지 이미지로 렌더링** (`pages/`에 생성). 실제 페이지 나눔은 이걸로 봅니다 |

## 문구만 고칠 때

```bash
# guide.html 수정 후
node build-pdf.mjs
node render-pdf.mjs   # 실제 페이지 확인 (pages/pdf-NN.png)
```

## 화면 이미지를 갱신할 때

본문 이미지는 두 갈래입니다.

- **실제 화면 캡처** — 숫자로 시작하는 파일. 아래 두 표 참고.
- **확장 내장 튜토리얼 슬라이드** — `tutorial_a{2,4,5}_en.png`. 지금은 **5장(구독자 500명 미만)에만** 씁니다.
  확장이 업데이트되면 다시 복사하세요.

```bash
SRC=../../aedi-v/images
cp $SRC/tutorial_a{2,4,5}_en.png shots/
```

4장(구독자 500명 이상)에 쓰던 `tutorial{1,2,3,4,6}_en.png`와 `tutorial_a1_en.png`는
실제 화면·데모 캡처로 모두 교체해서 **더 이상 본문에서 쓰지 않습니다.**
`shots/`에 남아는 있으니 되돌릴 일이 있으면 그대로 참조하면 됩니다.

### 실제 화면 캡처

아래 다섯 장은 확장을 설치한 크롬에서 직접 찍은 화면입니다.
**미국 VPN + `aisum@aisum.com` 계정 + 제품 태그 가능 상태**에서 2026-08-04에 캡처했습니다.

| 파일 | 화면 | 쓰이는 곳 |
| --- | --- | --- |
| `01-onboarding_en.png` | Amazon Associates ID 입력 + 약관 동의 | 5장 |
| `10-panel_en.png` | AEDI-V 패널 | 3장 |
| `11-menu_en.png` | ☰ MENU | 3장 |
| `60-payment_en.png` | Payment 요금제 목록 | 6장 |
| `61-topup_en.png` | 추가 크레딧 충전 · 프로모션 코드 | 6장 |

아래 네 장은 **데모 시연 영상(`aedi-v_demo.mp4`, 3분 14초)에서 뽑은 프레임**입니다.
데모 사이트 `magic3.aedi.ai/aedi-v-demo` 화면이라 실제 확장과 UI는 같지만 데이터는 시뮬레이션입니다.

| 파일 | 화면 | 원본 시각 | 쓰이는 곳 |
| --- | --- | --- | --- |
| `20-analyzing_en.png` | Analyzing AI video 70% | 1:40 | 4장 2단계 |
| `21-apply-entire_en.png` | Apply to entire video · 제품 3개 선택 | 2:52 | 4장 3~4단계 |
| `22-tagged_en.png` | 태그 완료 · 설명란 아래 제품 3개 | 2:56 | 4장 6단계 |
| `70-soldout_en.png` | 품절 알림 · Replace Product | 2:59 | 7장 |

추출 명령입니다. 브라우저 주소창·북마크바를 잘라내고 오른쪽 아래 `Reset demo` 배지를 흰색으로 덮습니다.

```bash
VF="crop=1908:902:0:78,drawbox=x=1755:y=836:w=153:h=66:color=white:t=fill"
ffmpeg -ss 100 -i aedi-v_demo.mp4 -vf "$VF" -frames:v 1 shots/20-analyzing_en.png
```

다시 찍을 때 주의할 점.

- 웹스토어(`00-store_en.png`)는 **확장에서 스크립팅이 차단**되므로 브라우저 자동화로 못 찍습니다. Playwright나 수동 캡처를 쓰세요.
- 창 크기에 따라 배율이 달라집니다. 위 다섯 장은 **1400×900 창**에서 찍어 배율을 맞췄습니다.
- 계정이 Enterprise 요금제라 패널에 `Unlimited`가 표시됩니다.
  일반 사용자 화면과 다르지만 그대로 쓰기로 했습니다.
- 5장 시작 화면(`01-onboarding_en.png`)은 계정의 `apply_amazon_affiliate`가 `'N'`일 때만 뜹니다
  (`aedi-v/background.ts:713-716`). ID를 한 번 등록하면 재설치해도 안 나오니,
  다시 찍으려면 **ID 미등록 계정**이 필요합니다.

## 인쇄 레이아웃 점검

`preview.mjs`는 고정 높이로 잘라 보여줄 뿐 실제 페이지 나눔과 다릅니다.
**실제 페이지는 `render-pdf.mjs`로 확인합니다.** 완성된 PDF를 pdf.js로 페이지마다 그려 PNG로 떨굽니다.
pdf.js는 CDN에서 받아 Chromium 안에서 돌리므로 `npm install`이 필요 없습니다. (인터넷은 필요합니다.)

- **한 페이지보다 큰 블록이 있으면 잘립니다.** 현재는 없습니다. 가장 큰 블록이 1장 STEP 상자로 한 페이지의 66%입니다.
- `.howto`에 `break-inside:avoid`를 걸면 이 상자가 통째로 다음 장으로 밀려 **반 페이지가 비었습니다.**
  그래서 상자는 페이지를 넘어가도록 두고, 개별 단계(`.hstep`)만 안 쪼개지게 했습니다.
- `figure.shot`은 폭을 **86%로 제한**했습니다. 스크린샷이 가로로 길어 폭을 꽉 채우면 그림 하나가
  한 페이지의 36%를 먹고, 3장이 연달아 나오는 4장에서 **그림 한 장만 남은 페이지**가 생겼습니다.
- 남은 여백은 표·그림이 다음 장으로 넘어가며 생기는 정도라 인쇄물에서는 자연스럽습니다.
- `section.chap`에 `break-before:page`를 걸어 **각 장이 항상 새 페이지에서 시작**합니다.
  표지에만 `break-after:page`가 있고 목차에는 없습니다. 둘 다 걸면 빈 페이지가 생깁니다.

## 장 구성

0 개요 · 1 설치와 가입 · 2 영상 조건 · 3 패널 · **4 구독자 500명 이상** · **5 구독자 500명 미만** ·
6 크레딧과 요금제 · **7 품절** · 8 알아두면 좋은 기능 · 9 자주 묻는 질문

- 예전엔 4·5장을 **방식 A / 방식 B**로 불렀습니다. 지금은 **구독자 500명 이상 / 미만**으로 씁니다.
  갈리는 실제 조건은 YouTube Shopping 제품 태그 사용 가능 여부이고, 화면 문구가
  `Can be activated with 500 or more subscribers`라 이 기준을 그대로 씁니다.
- 약관 동의 화면은 두 갈래입니다. 500명 이상은 패널 위 `Confirm` 오버레이(4장),
  500명 미만은 Associates ID까지 함께 받는 시작 화면(5장)입니다. 그래서 1장에는 설치와 로그인만 남겼습니다.

### 사용하지 않는 튜토리얼 이미지

사용하지 않는 이미지가 두 장 있습니다.

- `tutorial5_en.png` — `tutorial4_en`과 같은 화면이고, 주석이
  "Adding a product link to the description"으로 **제품 태그 흐름에는 맞지 않아** 제외했습니다.
- `tutorial_a3_en.png` — `tutorial_a4_en`과 같은 화면이라 중복이어서 제외했습니다.

## 알아둘 점

- 본문 폰트는 CDN의 Pretendard입니다. PDF를 구울 때 **인터넷 연결이 필요**합니다.
- Playwright는 `AEDI-V-DASHBOARD/node_modules`의 것을 절대 경로로 불러옵니다.
  대시보드 저장소 위치가 바뀌면 `build-pdf.mjs` / `preview.mjs` 상단의
  `PLAYWRIGHT` 상수를 고쳐야 합니다.
- 디자인 토큰과 컴포넌트는 `AEDI-V-DASHBOARD_가이드/guide.html`과 동일합니다.
  두 문서를 나란히 배포하므로 한쪽 스타일을 바꾸면 다른 쪽도 맞춰 주세요.

## 의도적으로 비워 둔 내용

아래 항목은 코드에서 확인되지 않아 **수치를 적지 않고 "담당자 확인"으로 처리**했습니다.
자료가 확정되면 6장에 추가하세요.

1. **환불 정책** — 코드·약관에서 미확인. (피그마 보드 스티키에만 존재)
2. **탈퇴 체크리스트 4항목의 정확한 문구** — `aedi.ai` 저장소에 `aedi_v.*` 언어 파일이 없습니다.

### 해소된 항목

- **요금제별 가격·크레딧 용량** — 값이 서버 API(`products.plans`)에서 내려와 코드에는 없지만,
  2026-08-04에 `global.aedi.ai/aediv/payment` 화면에서 확인해 6장에 표로 넣었습니다.
  **지역·시점에 따라 달라지므로** 개정할 때마다 화면을 다시 확인해야 합니다.
