웹사이트 성능을 빠르게 측정하고 병목점을 분석합니다.

대상 URL: $ARGUMENTS

---

## 실행 절차

### Phase 1: Setup

1. URL 파싱 (`https://` 자동 추가)
2. `tabs_context_mcp` → `tabs_create_mcp` → `navigate`
3. 3초 대기

### Phase 2: 성능 데이터 수집

1. `analyzers/performance-analyzer.js`를 Read → `javascript_tool` 실행 → perfData

2. 추가 성능 메트릭 수집 (javascript_tool):

```javascript
(() => {
  const result = {
    // Core Web Vitals 관련
    lcp: null,
    cls: 0,
    // DOM 크기
    domNodes: document.querySelectorAll('*').length,
    domDepth: 0,
    // 스크립트 분석
    syncScripts: document.querySelectorAll('script[src]:not([async]):not([defer])').length,
    asyncScripts: document.querySelectorAll('script[async]').length,
    deferScripts: document.querySelectorAll('script[defer]').length,
    inlineScripts: document.querySelectorAll('script:not([src])').length,
    // 리소스 힌트
    dnsPrefetch: document.querySelectorAll('link[rel="dns-prefetch"]').length,
    preload: document.querySelectorAll('link[rel="preload"]').length,
    prefetch: document.querySelectorAll('link[rel="prefetch"]').length,
    preconnect: document.querySelectorAll('link[rel="preconnect"]').length,
    // 이미지 최적화
    modernImages: document.querySelectorAll('img[src$=".webp"], img[src$=".avif"], source[type="image/webp"], source[type="image/avif"]').length,
    totalImages: document.querySelectorAll('img').length,
    lazyImages: document.querySelectorAll('img[loading="lazy"]').length,
    // 렌더 블로킹
    blockingStylesheets: document.querySelectorAll('link[rel="stylesheet"]:not([media="print"])').length,
    // Third-party
    thirdPartyScripts: Array.from(document.querySelectorAll('script[src]')).filter(s => {
      try { return new URL(s.src).hostname !== location.hostname; } catch { return false; }
    }).length,
  };

  // DOM 깊이 계산
  function getDepth(el, d) {
    if (!el.children.length) return d;
    return Math.max(...Array.from(el.children).map(c => getDepth(c, d + 1)));
  }
  result.domDepth = getDepth(document.body, 0);

  // LCP (PerformanceObserver 결과)
  const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
  if (lcpEntries.length > 0) {
    result.lcp = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
  }

  // CLS (PerformanceObserver 결과)
  const clsEntries = performance.getEntriesByType('layout-shift');
  for (const entry of clsEntries) {
    if (!entry.hadRecentInput) result.cls += entry.value;
  }
  result.cls = Math.round(result.cls * 1000) / 1000;

  return JSON.stringify(result);
})()
```

3. 서버 응답 시간 측정 (Bash):
```
curl -sI -w "time_connect: %{time_connect}\ntime_ttfb: %{time_starttransfer}\ntime_total: %{time_total}\nhttp_code: %{http_code}\nsize_header: %{size_header}\n" -o /dev/null -L "<url>"
```

### Phase 3: 성능 점수 계산 & 리포트

**성능 등급 기준**:
- FCP < 1.8s = Good, < 3s = Needs Improvement, >= 3s = Poor
- LCP < 2.5s = Good, < 4s = Needs Improvement, >= 4s = Poor
- CLS < 0.1 = Good, < 0.25 = Needs Improvement, >= 0.25 = Poor
- TTFB < 0.8s = Good, < 1.8s = Needs Improvement, >= 1.8s = Poor

Write 도구로 `reports/<domain>/perf-<timestamp>.md` 생성:

```markdown
# ⚡ 성능 분석: <url>

> 분석 일시: <날짜>

## 핵심 지표

| 지표 | 값 | 등급 |
| --- | --- | --- |
| TTFB (서버 응답) | XXms | 🟢/🟡/🔴 |
| First Paint | XXms | 🟢/🟡/🔴 |
| First Contentful Paint | XXms | 🟢/🟡/🔴 |
| Largest Contentful Paint | XXms | 🟢/🟡/🔴 |
| DOMContentLoaded | XXms | |
| Load | XXms | |
| CLS | X.XXX | 🟢/🟡/🔴 |

## 리소스 현황

### 총계
- 총 리소스: **N개** / **XX KB**

### 유형별
| 유형 | 개수 | 크기 | 비중 |
| --- | --- | --- | --- |
(각 유형별 정보. 비중은 크기 기준 퍼센트와 프로그래스바)

## 최적화 체크리스트

### 이미지 (X/X)
- ✅/❌ 레이지 로딩: N/N개
- ✅/❌ 모던 포맷 (WebP/AVIF): N개 사용
- ✅/❌ 적절한 크기

### 스크립트 (X/X)
- ✅/❌ 동기 스크립트 최소화: N개 (권장 0)
- ✅/❌ async/defer 사용: N개
- ✅/❌ 서드파티 스크립트: N개

### 리소스 힌트 (X/X)
- Preload: N개
- Prefetch: N개
- Preconnect: N개
- DNS-Prefetch: N개

### DOM
- 노드 수: N개 (권장 < 1500)
- 최대 깊이: N (권장 < 32)

### 렌더 블로킹
- 블로킹 스타일시트: N개
- 동기 스크립트: N개

## 병목점 분석
(Claude가 데이터를 종합하여 가장 큰 병목 3개를 분석)

## 개선 권장사항
(우선순위별 성능 개선 항목, 예상 개선 효과 포함)
```

### Phase 4: 사용자에게 요약

핵심 지표 등급과 가장 시급한 개선 항목 3개를 간결하게 출력합니다.

## 에러 처리 & Playwright 폴백

### Chrome MCP 실패 시 → Playwright로 재시도

Phase 2에서 Chrome MCP가 실패하면, **Playwright 폴백**을 실행합니다:

```
node playwright-runner.mjs "<url>" --only performance --eval "(위 Phase 2의 추가 성능 메트릭 JavaScript 코드)"
```

Playwright 결과에서 `performance` 데이터와 `_eval` 데이터를 파싱하여 Phase 3 (점수 계산 & 리포트)부터 동일하게 진행합니다.

curl을 사용한 서버 응답 시간 측정(Phase 2-3)은 Chrome MCP 실패와 무관하게 항상 실행합니다.

**Playwright가 설치되지 않은 경우:**
```
cd <project-root> && pnpm install && npx playwright install chromium
```
