# Claude Chrome Skills

Claude Code + Chrome MCP 기반 웹사이트 분석 스킬 모음 (Playwright 폴백 지원)

## 개요

Claude Chrome Skills는 [Claude Code](https://claude.com/claude-code)의 슬래시 커맨드(Skills) 시스템을 활용하여, 실제 Chrome 브라우저(MCP) 또는 Playwright 헤드리스 브라우저에서 웹사이트를 분석하는 도구 모음입니다.

6개의 JavaScript 분석기를 브라우저 컨텍스트에서 실행하여 기술스택, CSS, SEO, 접근성, 디자인 토큰, 성능 데이터를 수집하고, 16개의 슬래시 커맨드를 통해 다양한 관점의 분석 리포트를 생성합니다.

## 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                  Claude Code CLI                     │
│                 (슬래시 커맨드 실행)                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│   /analyze, /perf, /security-scan, /check-seo ...   │
│                                                     │
├──────────────────┬──────────────────────────────────┤
│  Chrome MCP      │  Playwright 폴백                  │
│  (javascript_tool)│  (playwright-runner.mjs)          │
├──────────────────┴──────────────────────────────────┤
│                                                     │
│   analyzers/tech-detector.js                        │
│   analyzers/css-analyzer.js                         │
│   analyzers/seo-analyzer.js                         │
│   analyzers/accessibility-analyzer.js               │
│   analyzers/design-token-analyzer.js                │
│   analyzers/performance-analyzer.js                 │
│                                                     │
├─────────────────────────────────────────────────────┤
│                 reports/<domain>/                    │
│              (마크다운 리포트 출력)                     │
└─────────────────────────────────────────────────────┘
```

### 실행 흐름

1. 사용자가 Claude Code에서 `/analyze https://example.com` 같은 슬래시 커맨드를 실행
2. Chrome MCP 확장 프로그램이 연결되어 있으면 `javascript_tool`로 분석기를 브라우저에서 직접 실행
3. Chrome MCP가 없거나 실패하면 `playwright-runner.mjs`를 통해 Playwright 헤드리스 브라우저로 폴백
4. 수집된 데이터를 기반으로 `reports/` 디렉토리에 마크다운 리포트를 생성

## 설치

### 사전 요구 사항

- [Claude Code CLI](https://claude.com/claude-code)
- Node.js 18+
- pnpm (또는 npm)

### 설치 방법

```bash
# 프로젝트를 Claude Code의 작업 디렉토리에 배치
cd claude-chrome-skills

# 의존성 설치 (Playwright 폴백용)
pnpm install

# Playwright Chromium 브라우저 설치 (폴백 사용 시)
npx playwright install chromium
```

### Chrome MCP 설정 (권장)

Chrome MCP 확장 프로그램이 설치되어 있으면 실제 Chrome 브라우저에서 분석이 실행됩니다. 이 경우 로그인 상태, 쿠키, JavaScript 렌더링 등을 포함한 실제 사용자 환경에서의 분석이 가능합니다.

Chrome MCP가 없어도 Playwright 폴백을 통해 모든 기능이 동작합니다.

## 사용법

Claude Code 프로젝트 디렉토리에서 슬래시 커맨드로 실행합니다:

```
/analyze https://example.com         # 종합 분석
/perf https://example.com            # 성능 분석
/security-scan https://example.com   # 보안 스캔
/check-seo https://example.com       # SEO 점검
```

## 슬래시 커맨드 목록

### 종합 분석

| 커맨드 | 설명 | 리포트 생성 |
| --- | --- | --- |
| `/analyze <url>` | 6개 분석기 전체 실행 + 보안 헤더 + 디자인 시스템 평가. 8개의 마크다운 리포트 파일 생성 | O |
| `/compare <url1> <url2>` | 두 웹사이트를 기술스택, 성능, 보안, SEO, 접근성 5개 영역에서 비교 분석 | O |

### 개별 분석

| 커맨드 | 설명 | 리포트 생성 |
| --- | --- | --- |
| `/perf <url>` | 성능 측정 (Core Web Vitals, 리소스 현황, 최적화 체크리스트) | O |
| `/security-scan <url>` | 보안 헤더 + 클라이언트 보안 체크 (Mixed Content, SRI, iframe 등). A-F 등급 산출 | O |
| `/check-seo <url>` | SEO 메타태그, OG/Twitter 카드, 구조화 데이터, 헤딩 구조 분석. 100점 만점 점수 | O |
| `/audit-a11y <url>` | WCAG 2.1 Level AA 기준 접근성 감사. 시맨틱/ARIA/키보드/터치타겟 체크 | O |
| `/cookie-scan <url>` | 쿠키 분류(필수/분석/광고/기능), 트래킹 스크립트, GDPR 준수 체크 | O |
| `/extract-colors <url>` | 색상 팔레트 추출, 디자인 토큰 분석, 타이포그래피/간격 스케일 | O |
| `/responsive <url>` | 8개 뷰포트(320px~1920px) 반응형 테스트 + 미디어 쿼리 분석 | O |
| `/links <url>` | 링크 수집 및 HTTP 상태 코드 확인, 깨진 링크 탐지 | O |
| `/login-check <url>` | 로그인/인증 폼 보안 분석 (CSRF, CAPTCHA, OAuth) + UX 평가 | O |
| `/image-audit <url>` | 이미지 최적화 상태 분석 (포맷, 레이지로딩, 오버사이즈, alt 텍스트) | O |
| `/font-check <url>` | 폰트 분석 (@font-face, woff2, font-display, preload, 서브셋) | O |

### 빠른 체크 (리포트 미생성)

| 커맨드 | 설명 | 리포트 생성 |
| --- | --- | --- |
| `/tech-detect <url>` | 기술스택 빠르게 탐지 (프레임워크, CSS, 빌드도구, CDN, 애널리틱스) | X |
| `/screenshot <url>` | 5개 뷰포트(320/428/768/1280/1920px) 스크린샷 캡처 + 반응형 관찰 | X |

### 유틸리티

| 커맨드 | 설명 |
| --- | --- |
| `/test [url]` | 6개 분석기 단위 테스트. Chrome MCP + Playwright 양쪽 검증 |

## 분석기 (Analyzers)

`analyzers/` 디렉토리에 위치한 6개의 JavaScript 파일은 브라우저의 `page.evaluate()` 컨텍스트에서 실행되는 IIFE 형태의 스크립트입니다. 각 스크립트는 분석 결과를 `JSON.stringify()`로 반환합니다.

| 파일 | 분석 영역 | 주요 탐지 항목 |
| --- | --- | --- |
| `tech-detector.js` | 기술스택 | React, Vue, Angular, Svelte, Next.js, Nuxt 등 프레임워크/라이브러리, Webpack/Vite 빌드도구, CMS, CDN, 애널리틱스 (GA, Hotjar, Sentry 등) |
| `css-analyzer.js` | CSS | CSS 프레임워크 (Tailwind, Bootstrap, Chakra UI, MUI 등), 미디어 쿼리, 커스텀 프로퍼티, 애니메이션, Grid/Flexbox 레이아웃 사용량 |
| `seo-analyzer.js` | SEO | title, meta description, canonical, Open Graph, Twitter Card, 구조화 데이터 (JSON-LD), 헤딩 구조 (h1~h6) |
| `accessibility-analyzer.js` | 접근성 | 시맨틱 요소, ARIA 속성, 이미지 alt 텍스트, 폼 라벨, skip links, 랜드마크 |
| `design-token-analyzer.js` | 디자인 토큰 | 색상 팔레트 (사용 빈도별), 타이포그래피 (폰트 패밀리/웨이트/사이즈), 간격 시스템, 그림자, 보더 라디우스, 트랜지션 |
| `performance-analyzer.js` | 성능 | 리소스 총계 (유형별 크기/개수), 이미지 레이지 로딩, preload/preconnect 리소스 힌트, Navigation Timing API (DOMContentLoaded, FCP 등) |

## Playwright 폴백 러너

`playwright-runner.mjs`는 Chrome MCP가 사용 불가능할 때의 폴백 실행 엔진입니다.

```bash
# 기본 사용법: 6개 분석기 전체 실행
node playwright-runner.mjs https://example.com

# 특정 분석기만 실행
node playwright-runner.mjs https://example.com --only techStack,css

# 스크린샷 캡처
node playwright-runner.mjs https://example.com --screenshot shot.png

# 멀티 뷰포트 스크린샷
node playwright-runner.mjs https://example.com \
  --viewports "320x568,768x1024,1920x1080" \
  --screenshot screenshots/

# 커스텀 JavaScript 실행
node playwright-runner.mjs https://example.com --eval "document.title"

# 파일에서 JavaScript 실행
node playwright-runner.mjs https://example.com --eval-file custom-check.js
```

### 옵션

| 옵션 | 설명 |
| --- | --- |
| `--only <names>` | 실행할 분석기 지정 (쉼표 구분). 이름: `techStack`, `css`, `seo`, `accessibility`, `designTokens`, `performance` |
| `--screenshot <path>` | 스크린샷 저장 경로 |
| `--viewports <specs>` | 멀티 뷰포트 스크린샷. 형식: `"너비x높이,너비x높이,..."` |
| `--eval <code>` | 커스텀 JavaScript 코드 실행 |
| `--eval-file <path>` | 파일에서 JavaScript 읽어 실행 |

### 출력 형식

JSON 결과는 stdout으로, 진행 로그는 stderr로 출력됩니다.

```json
{
  "techStack": { "frameworks": [...], "libraries": [...], ... },
  "css": { "framework": "Tailwind CSS", "mediaQueries": [...], ... },
  "seo": { "title": "...", "ogTags": {...}, ... },
  "accessibility": { "semanticElements": [...], "ariaAttributes": [...], ... },
  "designTokens": { "colors": [...], "typography": [...], ... },
  "performance": { "resources": {...}, "timing": {...}, ... }
}
```

## 리포트 출력

분석 리포트는 `reports/<도메인>/<타임스탬프>/` 또는 `reports/<도메인>/<분석유형>-<타임스탬프>.md` 형태로 저장됩니다.

### `/analyze` 종합 분석 리포트 구조

```
reports/www.example.com/20260211-175809/
  00-종합요약.md       # AI 종합 분석 (한줄요약, 주요 발견, 개선 권장사항)
  01-기술스택.md       # 프레임워크, 라이브러리, 인프라 정보
  02-CSS분석.md        # CSS 프레임워크, 레이아웃, 미디어 쿼리, 커스텀 프로퍼티
  03-성능분석.md       # 리소스 현황, 이미지 최적화, 타이밍 지표
  04-SEO분석.md        # 메타태그, OG/Twitter, 구조화 데이터, 헤딩 구조
  05-보안분석.md       # 보안 헤더, 쿠키 보안, 보안 점수
  06-접근성분석.md     # 시맨틱 요소, ARIA, 이미지 alt, 폼 라벨
  07-디자인토큰.md     # 색상 팔레트, 타이포그래피, 간격 시스템
```

### 개별 분석 리포트

```
reports/www.example.com/perf-20260211-180000.md
reports/www.example.com/security-20260211-180100.md
reports/www.example.com/seo-20260211-180200.md
reports/www.example.com/a11y-20260211-180300.md
reports/www.example.com/colors-20260211-180400.md
reports/www.example.com/cookies-20260211-180500.md
reports/www.example.com/responsive-20260211-180600.md
reports/www.example.com/links-20260211-180700.md
reports/www.example.com/login-20260211-180800.md
reports/www.example.com/images-20260211-180900.md
reports/www.example.com/fonts-20260211-181000.md
```

## 프로젝트 구조

```
claude-chrome-skills/
├── .claude/
│   └── commands/           # Claude Code 슬래시 커맨드 정의 (16개)
│       ├── analyze.md      # /analyze - 종합 분석
│       ├── perf.md         # /perf - 성능 분석
│       ├── security-scan.md# /security-scan - 보안 스캔
│       ├── check-seo.md    # /check-seo - SEO 점검
│       ├── audit-a11y.md   # /audit-a11y - 접근성 감사
│       ├── cookie-scan.md  # /cookie-scan - 쿠키 분석
│       ├── extract-colors.md# /extract-colors - 색상 추출
│       ├── responsive.md   # /responsive - 반응형 테스트
│       ├── links.md        # /links - 링크 검사
│       ├── login-check.md  # /login-check - 로그인 분석
│       ├── image-audit.md  # /image-audit - 이미지 감사
│       ├── font-check.md   # /font-check - 폰트 분석
│       ├── compare.md      # /compare - 사이트 비교
│       ├── tech-detect.md  # /tech-detect - 기술스택 탐지
│       ├── screenshot.md   # /screenshot - 멀티 뷰포트 스크린샷
│       └── test.md         # /test - 분석기 단위 테스트
├── analyzers/              # 브라우저 컨텍스트 실행 분석 스크립트 (6개)
│   ├── tech-detector.js
│   ├── css-analyzer.js
│   ├── seo-analyzer.js
│   ├── accessibility-analyzer.js
│   ├── design-token-analyzer.js
│   └── performance-analyzer.js
├── reports/                # 분석 리포트 출력 디렉토리
├── playwright-runner.mjs   # Playwright 폴백 실행 엔진
├── package.json
└── pnpm-lock.yaml
```

## 에러 처리 전략

모든 커맨드는 동일한 폴백 전략을 따릅니다:

1. **Chrome MCP 우선**: `javascript_tool`로 분석기를 실제 Chrome에서 실행
2. **Playwright 폴백**: Chrome MCP 실패 시 `playwright-runner.mjs`로 헤드리스 실행
3. **부분 실패 허용**: 개별 분석기가 실패하면 해당 섹션만 스킵하고 나머지 진행
4. **curl 독립 실행**: 서버 보안 헤더 분석(`curl -sI`)은 브라우저 실패와 무관하게 항상 실행

## 라이선스

이 프로젝트는 개인 도구로 제작되었습니다.
