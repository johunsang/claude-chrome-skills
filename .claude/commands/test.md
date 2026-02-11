분석기 6개의 단위 테스트를 실행하여 정상 동작 여부를 확인합니다.

테스트 대상 URL (선택): $ARGUMENTS

---

## 실행 절차

### Phase 1: 테스트 URL 결정

- `$ARGUMENTS`가 있으면 해당 URL 사용
- 없으면 `https://example.com` 사용 (가볍고 안정적인 테스트 대상)

### Phase 2: Chrome MCP 테스트

1. `tabs_context_mcp` → `tabs_create_mcp` → `navigate`로 테스트 URL 이동
2. 3초 대기

6개 분석기를 순차 실행하며 각각의 성공/실패를 기록합니다:

| # | 분석기 | 파일 | 검증 항목 |
|---|--------|------|-----------|
| 1 | techStack | `analyzers/tech-detector.js` | JSON 파싱 가능, `frameworks` 키 존재 |
| 2 | css | `analyzers/css-analyzer.js` | JSON 파싱 가능, `cssFramework` 키 존재 |
| 3 | seo | `analyzers/seo-analyzer.js` | JSON 파싱 가능, `title` 키 존재 |
| 4 | accessibility | `analyzers/accessibility-analyzer.js` | JSON 파싱 가능, `semanticElements` 키 존재 |
| 5 | designTokens | `analyzers/design-token-analyzer.js` | JSON 파싱 가능, `colors` 키 존재 |
| 6 | performance | `analyzers/performance-analyzer.js` | JSON 파싱 가능, `resources` 키 존재 |

각 분석기 실행 후:
- `javascript_tool` 결과가 유효한 JSON 문자열인지 확인
- 필수 키가 존재하는지 확인
- 결과 데이터가 비어있지 않은지 확인

### Phase 3: Playwright 폴백 테스트

Bash로 Playwright 폴백도 테스트합니다:

```
node playwright-runner.mjs "<test-url>"
```

결과에서:
- 6개 분석기 모두 JSON 출력에 포함되는지 확인
- 각 키가 null이 아닌지 확인

### Phase 4: 결과 보고

```
🧪 Claude Chrome Skills 단위 테스트

테스트 URL: <url>

Chrome MCP:
  ✅ tech-detector.js     — frameworks: [...], libraries: [...]
  ✅ css-analyzer.js       — cssFramework: "...", layouts: {...}
  ✅ seo-analyzer.js       — title: "...", meta: {...}
  ❌ accessibility-analyzer.js — Error: <에러 메시지>
  ✅ design-token-analyzer.js — colors: [...], typography: [...]
  ✅ performance-analyzer.js  — resources: [...], timing: {...}

Playwright 폴백:
  ✅ techStack    — OK
  ✅ css          — OK
  ✅ seo          — OK
  ✅ accessibility — OK
  ✅ designTokens — OK
  ✅ performance  — OK

결과: 11/12 통과 (1개 실패)
```

실패한 항목이 있으면 에러 메시지와 가능한 원인을 분석합니다.

## 에러 처리

- Chrome MCP 미연결 시: Playwright 테스트만 실행
- Playwright 미설치 시: `pnpm install && npx playwright install chromium` 안내
- 테스트 URL 접속 불가 시: `https://example.com`으로 재시도
