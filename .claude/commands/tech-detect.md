웹사이트의 기술스택을 빠르게 탐지합니다.

대상 URL: $ARGUMENTS
---

## 실행 절차

### Phase 1: Setup

1. URL 파싱 (`https://` 자동 추가)
2. `tabs_context_mcp` → `tabs_create_mcp` → `navigate`
3. 3초 대기

### Phase 2: 기술스택 탐지

1. `analyzers/tech-detector.js`를 Read → `javascript_tool` 실행 → techData
2. `analyzers/css-analyzer.js`를 Read → `javascript_tool` 실행 → cssData (CSS 프레임워크)
3. Bash로 서버 정보:
   ```
   curl -sI -L "<url>"
   ```
   서버 헤더에서 `server`, `x-powered-by`, `x-generator` 추출

### Phase 3: 사용자에게 결과 출력

리포트 파일 없이 바로 사용자에게 결과를 보여줍니다:

```
🔍 <url> 기술스택

프레임워크:  Next.js, React
CSS:         Tailwind CSS
빌드 도구:    Webpack
CMS:         없음
서버:        nginx
CDN:         Cloudflare, Vercel
애널리틱스:   Google Analytics, Sentry
라이브러리:   jQuery, GSAP
```

목록에 항목이 없으면 해당 줄은 생략합니다.

리포트 파일은 생성하지 않고 터미널에 간결하게 출력만 합니다.
이것은 빠른 체크용 커맨드입니다.

## 에러 처리 & Playwright 폴백

### Chrome MCP 실패 시 → Playwright로 재시도

Phase 2에서 Chrome MCP가 실패하면, **Playwright 폴백**을 실행합니다:

```
node playwright-runner.mjs "<url>" --only techStack,css
```

Playwright 결과에서 `techStack`과 `css` 데이터를 파싱하여 Phase 3과 동일하게 사용자에게 출력합니다.

**Playwright가 설치되지 않은 경우:**
```
cd <project-root> && pnpm install && npx playwright install chromium
```
