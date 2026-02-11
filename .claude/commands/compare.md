두 웹사이트를 기술적으로 비교 분석합니다.

비교 대상: $ARGUMENTS

---

## 실행 절차

### Phase 1: URL 파싱

`$ARGUMENTS`에서 2개의 URL을 파싱합니다.
- 공백 또는 쉼표로 구분 (예: `https://a.com https://b.com` 또는 `a.com, b.com`)
- `https://`가 없으면 자동 추가
- URL이 1개이면 사용자에게 두 번째 URL을 요청합니다.

### Phase 2: 첫 번째 사이트 분석

1. `tabs_context_mcp` → `tabs_create_mcp` → `navigate`로 첫 번째 URL을 엽니다.
2. 3초 대기 → `screenshot`
3. 다음 스크립트를 순차 실행 (Read → javascript_tool):
   - `analyzers/tech-detector.js` → siteA.techStack
   - `analyzers/css-analyzer.js` → siteA.css
   - `analyzers/performance-analyzer.js` → siteA.perf
   - `analyzers/seo-analyzer.js` → siteA.seo
   - `analyzers/accessibility-analyzer.js` → siteA.a11y
4. Bash로 `curl -sI -L "<url>"` 실행 → siteA.headers

### Phase 3: 두 번째 사이트 분석

1. 같은 탭에서 `navigate`로 두 번째 URL을 엽니다.
2. 3초 대기 → `screenshot`
3. Phase 2와 동일한 분석 실행 → siteB.*
4. Bash로 `curl -sI -L "<url>"` 실행 → siteB.headers

### Phase 4: 비교 리포트 작성

Write 도구로 `reports/compare-<domainA>-vs-<domainB>-<timestamp>.md` 파일을 생성합니다.

```markdown
# 웹사이트 비교 분석: <siteA> vs <siteB>

> 분석 일시: <날짜>

## 한눈에 보기

| 항목 | <siteA> | <siteB> | 비교 |
| --- | --- | --- | --- |
| 프레임워크 | ... | ... | ... |
| CSS 프레임워크 | ... | ... | ... |
| 총 리소스 수 | ... | ... | 🏆 적은 쪽 표시 |
| 총 리소스 크기 | ... | ... | 🏆 작은 쪽 표시 |
| DOMContentLoaded | ... | ... | 🏆 빠른 쪽 표시 |
| FCP | ... | ... | 🏆 빠른 쪽 표시 |
| 보안 헤더 설정 수 | .../9 | .../9 | 🏆 많은 쪽 표시 |
| 이미지 레이지 로딩 | ... | ... | ... |
| SEO 메타태그 완성도 | ... | ... | ... |
| 접근성 랜드마크 | ... | ... | ... |

## 기술스택 비교
(각 사이트의 기술 선택과 차이점 분석)

## 성능 비교
(리소스 크기/수, 로딩 시간, 최적화 수준 비교)

## 보안 비교
(보안 헤더 설정 차이)

## SEO 비교
(메타태그, 구조화 데이터 차이)

## 접근성 비교
(시맨틱 마크업, ARIA 사용 차이)

## 종합 평가
(각 사이트의 강점/약점, 승자 판정)
```

### Phase 5: 사용자에게 요약 출력

주요 비교 결과를 간결하게 보여줍니다.

## 에러 처리 & Playwright 폴백

### Chrome MCP 실패 시 → Playwright로 재시도

Phase 2 또는 Phase 3에서 Chrome MCP가 실패하면, 각 사이트에 대해 **Playwright 폴백**을 실행합니다:

```
node playwright-runner.mjs "<siteA-url>" --screenshot reports/compare-screenshots/siteA.png
node playwright-runner.mjs "<siteB-url>" --screenshot reports/compare-screenshots/siteB.png
```

각 명령어의 JSON 출력(techStack, css, seo, accessibility, performance)을 파싱하여 Phase 4 비교 리포트에 사용합니다.

**Playwright가 설치되지 않은 경우:**
```
cd <project-root> && pnpm install && npx playwright install chromium
```

### 기타 에러 처리
- 한쪽 사이트 분석 실패 시: 성공한 사이트만 리포트하고 실패한 사이트는 "분석 불가"로 표시
- 네비게이션 실패 시: Playwright 폴백 시도
