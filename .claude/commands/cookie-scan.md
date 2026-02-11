웹사이트의 쿠키 사용 현황과 개인정보 보호 준수 여부를 분석합니다.

대상 URL: $ARGUMENTS

---

## 실행 절차

### Phase 1: Setup

1. URL 파싱 (`https://` 자동 추가)
2. `tabs_context_mcp` → `tabs_create_mcp` → `navigate`
3. 3초 대기

### Phase 2: 쿠키 수집 (javascript_tool)

```javascript
(() => {
  const cookies = document.cookie.split(';').filter(c => c.trim()).map(c => {
    const [name, ...rest] = c.trim().split('=');
    return { name: name.trim(), value: rest.join('=').substring(0, 50) };
  });

  // 쿠키 분류
  const categories = {
    essential: [],    // 세션, CSRF, 인증
    analytics: [],    // GA, 분석
    advertising: [],  // 광고, 트래킹
    functional: [],   // 설정, 언어
    unknown: [],
  };

  const patterns = {
    essential: /session|csrf|token|auth|login|jsessionid|phpsessid|asp\.net/i,
    analytics: /^_ga|^_gid|^_gat|analytics|amplitude|mixpanel|hotjar|_hj|__utm/i,
    advertising: /^_fb|doubleclick|adsense|adwords|^_gcl|^_fbp|criteo|taboola/i,
    functional: /lang|locale|theme|preference|consent|cookie_notice|gdpr/i,
  };

  for (const cookie of cookies) {
    let categorized = false;
    for (const [cat, pattern] of Object.entries(patterns)) {
      if (pattern.test(cookie.name)) {
        categories[cat].push(cookie);
        categorized = true;
        break;
      }
    }
    if (!categorized) categories.unknown.push(cookie);
  }

  // 쿠키 동의 배너 탐지
  const consentSelectors = [
    '[class*="cookie-consent"]', '[class*="cookie-banner"]', '[class*="cookie-notice"]',
    '[class*="consent-banner"]', '[class*="gdpr"]', '[class*="privacy-banner"]',
    '[id*="cookie-consent"]', '[id*="cookie-banner"]', '[id*="consent"]',
    '[class*="cc-banner"]', '[class*="cmp-"]',
  ];
  const consentBanner = consentSelectors.some(sel => {
    const el = document.querySelector(sel);
    return el && el.offsetParent !== null;
  });

  // Third-party 쿠키 관련 스크립트
  const trackingScripts = Array.from(document.querySelectorAll('script[src]')).filter(s => {
    const src = s.src.toLowerCase();
    return /google-analytics|googletagmanager|facebook.*pixel|hotjar|amplitude|segment|mixpanel|sentry/.test(src);
  }).map(s => {
    try { return new URL(s.src).hostname; } catch { return s.src.substring(0, 80); }
  });

  // localStorage/sessionStorage 사용
  let localStorageKeys = [];
  let sessionStorageKeys = [];
  try { localStorageKeys = Object.keys(localStorage).slice(0, 30); } catch {}
  try { sessionStorageKeys = Object.keys(sessionStorage).slice(0, 30); } catch {}

  return JSON.stringify({
    totalCookies: cookies.length,
    categories,
    consentBanner,
    trackingScripts: [...new Set(trackingScripts)],
    localStorageKeys,
    sessionStorageKeys,
    localStorageCount: localStorageKeys.length,
    sessionStorageCount: sessionStorageKeys.length,
  });
})()
```

### Phase 3: 서버 Set-Cookie 분석 (Bash)

```
curl -sI -L "<url>"
```

`set-cookie` 헤더에서 각 쿠키의 속성 파싱:
- `Secure` — HTTPS 전용
- `HttpOnly` — JavaScript 접근 불가
- `SameSite` — 크로스사이트 전송 제한
- `Domain` — 도메인 범위
- `Path` — 경로 범위
- `Max-Age` / `Expires` — 유효기간

### Phase 4: 리포트 생성

Write 도구로 `reports/<domain>/cookies-<timestamp>.md` 생성:

```markdown
# 🍪 쿠키 분석: <url>

> 분석 일시: <날짜>

## 요약

| 항목 | 값 |
| --- | --- |
| 총 쿠키 수 | N개 |
| 필수 쿠키 | N개 |
| 분석 쿠키 | N개 |
| 광고 쿠키 | N개 |
| 기능 쿠키 | N개 |
| 미분류 | N개 |
| 쿠키 동의 배너 | ✅/❌ |
| 트래킹 스크립트 | N개 |

## 쿠키 상세

### 필수 쿠키 (Essential)
| 이름 | Secure | HttpOnly | SameSite | 만료 |
| --- | --- | --- | --- | --- |

### 분석 쿠키 (Analytics)
| 이름 | Secure | HttpOnly | SameSite | 만료 |
| --- | --- | --- | --- | --- |

### 광고 쿠키 (Advertising)
(동일 테이블)

### 기능 쿠키 (Functional)
(동일 테이블)

### 미분류
(동일 테이블)

## 트래킹 스크립트
| 도메인 | 용도 |
| --- | --- |

## 웹 스토리지
- localStorage: N개 키
- sessionStorage: N개 키

## 개인정보 보호 준수 체크

- ✅/❌ 쿠키 동의 배너 존재
- ✅/❌ 쿠키 거부 옵션 제공
- ✅/❌ 필수 쿠키만 사전 동의 없이 설정
- ✅/❌ 모든 쿠키에 Secure 플래그
- ✅/❌ 세션 쿠키에 HttpOnly
- ✅/❌ SameSite 속성 설정

## 개선 권장사항
(GDPR/개인정보보호법 준수 관련 개선 항목)
```

### Phase 5: 사용자에게 요약

쿠키 현황과 개인정보 보호 이슈를 간결하게 출력합니다.

## 에러 처리 & Playwright 폴백

### Chrome MCP 실패 시 → Playwright로 재시도

Phase 2에서 Chrome MCP가 실패하면, **Playwright 폴백**을 실행합니다:

```
node playwright-runner.mjs "<url>" --eval "(위 Phase 2의 쿠키 수집 JavaScript 코드)"
```

Playwright 결과에서 `_eval` 데이터를 파싱하여 Phase 4 (리포트 생성)부터 동일하게 진행합니다.

**Playwright가 설치되지 않은 경우:**
```
cd <project-root> && pnpm install && npx playwright install chromium
```
