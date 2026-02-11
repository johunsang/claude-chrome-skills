웹사이트의 반응형 디자인을 다양한 뷰포트에서 테스트하고 미디어 쿼리를 분석합니다.

대상 URL: $ARGUMENTS

---

## 실행 절차

### Phase 1: Setup

1. URL 파싱 (`https://` 자동 추가)
2. `tabs_context_mcp` → `tabs_create_mcp` → `navigate`
3. 3초 대기

### Phase 2: CSS 미디어 쿼리 분석

`analyzers/css-analyzer.js`를 Read → `javascript_tool` 실행 → cssData

미디어 쿼리에서 브레이크포인트를 추출합니다.

### Phase 3: 뷰포트별 레이아웃 테스트

다음 8개 뷰포트를 순차 테스트합니다:

| 이름 | 너비 | 높이 | 대표 디바이스 |
|------|------|------|--------------|
| Mobile S | 320 | 568 | iPhone SE |
| Mobile M | 375 | 667 | iPhone 8 |
| Mobile L | 428 | 926 | iPhone 14 Pro Max |
| Tablet Portrait | 768 | 1024 | iPad |
| Tablet Landscape | 1024 | 768 | iPad 가로 |
| Laptop | 1280 | 800 | 일반 노트북 |
| Desktop | 1440 | 900 | 와이드 모니터 |
| Wide | 1920 | 1080 | 풀HD |

각 뷰포트에서:
1. `resize_window`로 크기 변경
2. 1.5초 대기
3. `screenshot` 캡처
4. `javascript_tool`로 레이아웃 측정:

```javascript
(() => {
  const body = document.body;
  const html = document.documentElement;
  const result = {
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    bodyScrollWidth: body.scrollWidth,
    bodyScrollHeight: body.scrollHeight,
    hasHorizontalScroll: body.scrollWidth > window.innerWidth,
    // 네비게이션 상태
    navVisible: !!document.querySelector('nav:not([style*="display: none"])'),
    hamburgerVisible: false,
    // 주요 컨테이너 너비
    mainWidth: document.querySelector('main')?.getBoundingClientRect().width || null,
    // 그리드/플렉스 상태
    gridCols: [],
    // 가로 오버플로우 요소
    overflowElements: 0,
  };

  // 햄버거 메뉴 감지
  const hamburgerSelectors = ['[class*="hamburger"]', '[class*="menu-toggle"]', '[class*="burger"]', 'button[aria-label*="menu"]', '[class*="mobile-menu"]'];
  for (const sel of hamburgerSelectors) {
    const el = document.querySelector(sel);
    if (el && el.offsetParent !== null) {
      result.hamburgerVisible = true;
      break;
    }
  }

  // 가로 오버플로우 체크
  document.querySelectorAll('*').forEach(el => {
    if (el.scrollWidth > el.clientWidth + 1 && el !== body && el !== html) {
      result.overflowElements++;
    }
  });

  return JSON.stringify(result);
})()
```

### Phase 4: 리포트 생성

Write 도구로 `reports/<domain>/responsive-<timestamp>.md` 생성:

```markdown
# 📱 반응형 디자인 분석: <url>

> 분석 일시: <날짜>

## 미디어 쿼리 브레이크포인트
(CSS에서 추출한 브레이크포인트를 시각적으로)

```
320   375   428   768   1024  1280  1440  1920
 ├─────┼─────┼─────┼──────┼──────┼──────┼──────┤
 │ Mobile    │ Tablet    │ Desktop           │
```

감지된 미디어 쿼리:
- `(min-width: 768px)` — 태블릿 이상
- `(min-width: 1024px)` — 데스크탑
- ...

## 뷰포트별 테스트 결과

| 뷰포트 | 가로스크롤 | 네비게이션 | 오버플로우 | 상태 |
| --- | --- | --- | --- | --- |
| 320px (Mobile S) | ✅/❌ | 햄버거/풀 | N개 | 🟢/🟡/🔴 |
| 375px (Mobile M) | ... | ... | ... | ... |
| 428px (Mobile L) | ... | ... | ... | ... |
| 768px (Tablet P) | ... | ... | ... | ... |
| 1024px (Tablet L) | ... | ... | ... | ... |
| 1280px (Laptop) | ... | ... | ... | ... |
| 1440px (Desktop) | ... | ... | ... | ... |
| 1920px (Wide) | ... | ... | ... | ... |

## 레이아웃 변화 분석
(각 브레이크포인트에서의 레이아웃 변화를 스크린샷 기반으로 분석)

### Mobile (320-428px)
- 네비게이션: 햄버거 메뉴로 전환 여부
- 컨텐츠: 단일 컬럼 여부
- 이미지: 리사이즈 적절성
- 텍스트: 가독성

### Tablet (768-1024px)
- 네비게이션 상태 변화
- 그리드 컬럼 변화
- 사이드바 표시 여부

### Desktop (1280-1920px)
- 최대 너비 제한 여부
- 와이드 스크린에서의 레이아웃

## 문제점
🔴 가로 스크롤 발생 뷰포트
🟡 오버플로우 요소가 있는 뷰포트
⚠️ 터치 타겟이 작은 모바일 뷰포트

## 개선 권장사항
(반응형 디자인 개선 항목)
```

### Phase 5: 사용자에게 요약

핵심 결과 요약과 발견된 문제를 간결하게 출력합니다.
마지막에 원래 뷰포트 크기(1280x800)로 복원합니다.

## 에러 처리 & Playwright 폴백

### Chrome MCP 실패 시 → Playwright로 재시도

Phase 1에서 Chrome MCP가 실패하면, **Playwright 폴백**을 실행합니다:

```
node playwright-runner.mjs "<url>" --only css --viewports "320x568,375x667,428x926,768x1024,1024x768,1280x800,1440x900,1920x1080" --screenshot reports/<domain>/responsive/
```

Playwright 결과에서:
- `css` 데이터의 미디어 쿼리 브레이크포인트를 분석합니다
- `_viewports` 배열의 각 뷰포트 레이아웃 정보(가로 스크롤, 네비게이션 상태 등)를 사용합니다
- 스크린샷은 `reports/<domain>/responsive/` 디렉토리에 `<width>x<height>.png` 형식으로 저장됩니다

Phase 4 (리포트 생성)부터 동일하게 진행합니다.

**Playwright가 설치되지 않은 경우:**
```
cd <project-root> && pnpm install && npx playwright install chromium
```
