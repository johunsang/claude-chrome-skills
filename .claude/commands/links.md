웹사이트의 링크를 검사하고 깨진 링크를 찾습니다.

대상 URL: $ARGUMENTS

---

## 실행 절차

### Phase 1: Setup

1. URL 파싱 (`https://` 자동 추가)
2. `tabs_context_mcp` → `tabs_create_mcp` → `navigate`
3. 3초 대기

### Phase 2: 링크 수집 (javascript_tool)

```javascript
(() => {
  const baseHost = location.hostname;
  const links = Array.from(document.querySelectorAll('a[href]'));
  const result = {
    internal: [],
    external: [],
    anchor: [],
    mailto: [],
    tel: [],
    javascript: [],
    empty: [],
  };

  for (const a of links) {
    const href = a.getAttribute('href') || '';
    const text = (a.textContent || '').trim().substring(0, 100);

    if (!href || href === '#') {
      result.empty.push({ href, text });
    } else if (href.startsWith('mailto:')) {
      result.mailto.push({ href: href.replace('mailto:', ''), text });
    } else if (href.startsWith('tel:')) {
      result.tel.push({ href: href.replace('tel:', ''), text });
    } else if (href.startsWith('javascript:')) {
      result.javascript.push({ href: href.substring(0, 50), text });
    } else if (href.startsWith('#')) {
      const targetId = href.substring(1);
      const exists = !!document.getElementById(targetId);
      result.anchor.push({ href, text, exists });
    } else {
      try {
        const url = new URL(href, location.origin);
        const entry = { href: url.href, text, status: null };
        if (url.hostname === baseHost) {
          result.internal.push(entry);
        } else {
          result.external.push(entry);
        }
      } catch {
        result.empty.push({ href, text });
      }
    }
  }

  return JSON.stringify({
    total: links.length,
    internal: result.internal.slice(0, 100),
    external: result.external.slice(0, 50),
    anchor: result.anchor,
    mailto: result.mailto,
    tel: result.tel,
    javascript: result.javascript,
    empty: result.empty,
  });
})()
```

### Phase 3: 링크 상태 확인 (Bash)

내부 링크와 외부 링크에 대해 HTTP 상태 코드를 확인합니다.
성능을 위해 최대 30개까지만 확인합니다.

각 링크에 대해:
```
curl -sI -o /dev/null -w "%{http_code}" -L --max-time 5 "<url>"
```

결과를 분류합니다:
- 200-299: 정상
- 301, 302, 307, 308: 리디렉트
- 403: 접근 거부
- 404: 깨진 링크
- 500+: 서버 오류
- 0 또는 타임아웃: 접근 불가

### Phase 4: 리포트 생성

Write 도구로 `reports/<domain>/links-<timestamp>.md` 생성:

```markdown
# 🔗 링크 검사: <url>

> 분석 일시: <날짜>

## 요약
| 유형 | 개수 |
| --- | --- |
| 전체 링크 | N개 |
| 내부 링크 | N개 |
| 외부 링크 | N개 |
| 앵커 링크 | N개 |
| 이메일 링크 | N개 |
| 전화 링크 | N개 |
| 빈/무효 링크 | N개 |

## 깨진 링크 🔴
| URL | 텍스트 | 상태 코드 |
| --- | --- | --- |
(404, 500+ 등)

## 리디렉트 🟡
| URL | 텍스트 | 상태 코드 |
| --- | --- | --- |
(301, 302 등)

## 깨진 앵커 링크
| 앵커 | 텍스트 | 대상 존재 |
| --- | --- | --- |
(#id로 링크했지만 해당 id가 없는 경우)

## 빈/무효 링크 ⚠️
| href | 텍스트 |
| --- | --- |
(href가 비어있거나 javascript: 등)

## 정상 링크 ✅
- 내부: N개 정상
- 외부: N개 정상

## 개선 권장사항
(깨진 링크 수정, 리디렉트 업데이트 등)
```

### Phase 5: 사용자에게 요약

깨진 링크 수와 주요 문제를 간결하게 출력합니다.

## 에러 처리 & Playwright 폴백

### Chrome MCP 실패 시 → Playwright로 재시도

Phase 2에서 Chrome MCP의 `javascript_tool`이 실패하면, **Playwright 폴백**으로 링크를 수집합니다:

```
node playwright-runner.mjs "<url>" --eval "(위 Phase 2의 링크 수집 JavaScript 코드)"
```

Playwright 결과에서 `_eval` 데이터를 파싱하여 Phase 3 (링크 상태 확인)부터 동일하게 진행합니다.

**Playwright가 설치되지 않은 경우:**
```
cd <project-root> && pnpm install && npx playwright install chromium
```
