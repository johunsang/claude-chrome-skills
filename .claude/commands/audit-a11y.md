웹사이트의 접근성(Accessibility)을 WCAG 2.1 기준으로 상세 감사합니다.

대상 URL: $ARGUMENTS

---

## 실행 절차

### Phase 1: Setup

1. URL 파싱 (`https://` 자동 추가)
2. `tabs_context_mcp` → `tabs_create_mcp` → `navigate`
3. 3초 대기 → `screenshot`

### Phase 2: 접근성 데이터 수집

1. `analyzers/accessibility-analyzer.js`를 Read → `javascript_tool` 실행 → a11yData
2. `analyzers/seo-analyzer.js`를 Read → `javascript_tool` 실행 → seoData (lang, 헤딩 구조)

3. 추가 접근성 체크 (javascript_tool):

```javascript
(() => {
  const result = {
    // 색상 대비 (샘플)
    lowContrastElements: 0,
    // 포커스 관리
    focusableElements: document.querySelectorAll('a, button, input, select, textarea, [tabindex]').length,
    outlineNone: Array.from(document.querySelectorAll('a, button, input, [tabindex]')).filter(el => {
      const style = getComputedStyle(el);
      return style.outlineStyle === 'none' || style.outline === '0' || style.outline === 'none';
    }).length,
    // 터치 타겟 크기
    smallTouchTargets: Array.from(document.querySelectorAll('a, button, input[type="checkbox"], input[type="radio"]')).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    }).length,
    totalTouchTargets: document.querySelectorAll('a, button, input[type="checkbox"], input[type="radio"]').length,
    // 텍스트 크기
    smallTextElements: Array.from(document.querySelectorAll('p, span, li, td, a, label')).filter(el => {
      const size = parseFloat(getComputedStyle(el).fontSize);
      return size < 12 && el.textContent.trim().length > 0;
    }).length,
    // 자동재생 미디어
    autoplayMedia: document.querySelectorAll('video[autoplay], audio[autoplay]').length,
    // 페이지 lang
    htmlLang: document.documentElement.lang || null,
    // role 사용
    roleUsage: {},
    // 빈 링크/버튼
    emptyLinks: Array.from(document.querySelectorAll('a')).filter(a =>
      !a.textContent.trim() && !a.querySelector('img[alt]') && !a.getAttribute('aria-label')
    ).length,
    emptyButtons: Array.from(document.querySelectorAll('button')).filter(b =>
      !b.textContent.trim() && !b.querySelector('img[alt]') && !b.getAttribute('aria-label')
    ).length,
    // 표 접근성
    tablesWithoutHeaders: document.querySelectorAll('table:not(:has(th))').length,
    tablesTotal: document.querySelectorAll('table').length,
    // 색상에만 의존하는 요소 (placeholder 색상)
    inputsPlaceholderOnly: Array.from(document.querySelectorAll('input[placeholder]:not([aria-label]):not([id])')).filter(el =>
      !el.closest('label') && !document.querySelector('label[for="' + el.id + '"]')
    ).length,
  };

  // role 사용 현황
  const roleMap = {};
  document.querySelectorAll('[role]').forEach(el => {
    const role = el.getAttribute('role');
    roleMap[role] = (roleMap[role] || 0) + 1;
  });
  result.roleUsage = roleMap;

  return JSON.stringify(result);
})()
```

### Phase 3: WCAG 체크리스트 평가

데이터를 기반으로 WCAG 2.1 Level AA 기준 체크:

**인식의 용이성 (Perceivable)**:
- 1.1.1 텍스트가 아닌 콘텐츠: 이미지 alt 텍스트
- 1.3.1 정보와 관계: 시맨틱 마크업, 헤딩 구조
- 1.3.5 입력 목적: 자동완성 속성
- 1.4.3 최소 대비: 텍스트/배경 대비
- 1.4.4 텍스트 크기 조절: 상대 단위 사용
- 1.4.10 리플로우: 뷰포트 메타

**운용의 용이성 (Operable)**:
- 2.1.1 키보드: 포커스 가능 요소
- 2.4.1 블록 건너뛰기: Skip links
- 2.4.2 페이지 제목: title 태그
- 2.4.4 링크 목적: 빈 링크 없음
- 2.4.6 헤딩과 레이블: 적절한 헤딩 구조
- 2.5.5 터치 타겟 크기: 최소 44x44px

**이해의 용이성 (Understandable)**:
- 3.1.1 페이지 언어: lang 속성
- 3.3.2 레이블/지시문: 폼 라벨

**견고성 (Robust)**:
- 4.1.2 이름/역할/값: ARIA 사용

### Phase 4: 리포트 생성

Write 도구로 `reports/<domain>/a11y-<timestamp>.md` 생성:

```markdown
# ♿ 접근성 감사: <url>

> 분석 일시: <날짜>
> 기준: WCAG 2.1 Level AA

## 접근성 점수: XX/100
████████████████████ XX%

## WCAG 체크리스트

### 인식의 용이성 (Perceivable)
| 항목 | 상태 | 세부사항 |
| --- | --- | --- |
| 1.1.1 이미지 alt | ✅/❌ | N/N개 alt 있음 |
| 1.3.1 시맨틱 마크업 | ✅/❌ | header, nav, main, footer 사용 |
| 1.4.3 색상 대비 | ✅/⚠️/❌ | ... |
| ... | | |

### 운용의 용이성 (Operable)
| 항목 | 상태 | 세부사항 |
| --- | --- | --- |
| 2.1.1 키보드 접근 | ✅/❌ | 포커스 요소 N개, outline 제거 N개 |
| 2.4.1 Skip Links | ✅/❌ | |
| 2.5.5 터치 타겟 | ✅/⚠️/❌ | N/N개 44px 미만 |
| ... | | |

### 이해의 용이성 (Understandable)
| 항목 | 상태 | 세부사항 |
| --- | --- | --- |

### 견고성 (Robust)
| 항목 | 상태 | 세부사항 |
| --- | --- | --- |

## 시맨틱 구조
| 요소 | 사용 횟수 |
| --- | --- |

## ARIA 사용 현황
| 속성/역할 | 사용 횟수 |
| --- | --- |

## 이미지 접근성
- alt 있음: N개
- alt 없음: N개
- 비율: ████████████████░░░░ XX%

## 폼 접근성
- 라벨 있음: N개
- 라벨 없음: N개

## 키보드 접근성
- 포커스 가능 요소: N개
- outline 제거된 요소: N개 ⚠️
- 빈 링크: N개
- 빈 버튼: N개

## Landmarks
(landmark 목록)

## 발견된 문제 (심각도별)
🔴 Critical: ...
🟠 Major: ...
🟡 Minor: ...

## 개선 권장사항
(우선순위별, 구현 코드 예시 포함)
```

### Phase 5: 사용자에게 요약

접근성 점수와 가장 시급한 이슈 3개를 간결하게 출력합니다.

## 에러 처리 & Playwright 폴백

### Chrome MCP 실패 시 → Playwright로 재시도

Phase 2에서 Chrome MCP가 실패하면, **Playwright 폴백**을 실행합니다:

```
node playwright-runner.mjs "<url>" --only accessibility,seo --eval "(위 Phase 2의 추가 접근성 체크 JavaScript 코드)"
```

Playwright 결과에서 `accessibility`, `seo`, `_eval` 데이터를 파싱하여 Phase 3 (WCAG 체크리스트 평가)부터 동일하게 진행합니다.

**Playwright가 설치되지 않은 경우:**
```
cd <project-root> && pnpm install && npx playwright install chromium
```
