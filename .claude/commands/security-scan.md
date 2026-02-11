웹사이트 보안 헤더와 클라이언트 보안 설정을 스캔합니다.

대상 URL: $ARGUMENTS

---

## 실행 절차

### Phase 1: Setup

1. URL 파싱 (`https://` 자동 추가)
2. `tabs_context_mcp` → `tabs_create_mcp` → `navigate`
3. 3초 대기 → `screenshot`

### Phase 2: 서버 보안 헤더 수집

Bash로 보안 헤더 수집:
```
curl -sI -L "<url>"
```

파싱할 헤더:
- `strict-transport-security` → HSTS (max-age, includeSubDomains, preload)
- `content-security-policy` → CSP (각 디렉티브 파싱)
- `access-control-allow-origin` → CORS
- `x-frame-options` → 클릭재킹 방어
- `x-content-type-options` → MIME 스니핑 방지
- `x-xss-protection` → XSS 필터
- `referrer-policy` → 리퍼러 정책
- `permissions-policy` → 기능 권한 정책
- `server` → 서버 정보 노출
- `x-powered-by` → 기술스택 노출
- `set-cookie` → 쿠키 보안 속성

### Phase 3: 클라이언트 보안 체크 (javascript_tool)

다음 JavaScript를 실행합니다:

```javascript
(() => {
  const result = {
    // Mixed content
    mixedContent: {
      scripts: Array.from(document.querySelectorAll('script[src^="http:"]')).map(s => s.src),
      stylesheets: Array.from(document.querySelectorAll('link[href^="http:"]')).map(l => l.href),
      images: Array.from(document.querySelectorAll('img[src^="http:"]')).length,
      iframes: Array.from(document.querySelectorAll('iframe[src^="http:"]')).map(f => f.src),
    },
    // 외부 스크립트 도메인
    externalScriptDomains: [...new Set(
      Array.from(document.querySelectorAll('script[src]')).map(s => {
        try { return new URL(s.src).hostname; } catch { return null; }
      }).filter(Boolean)
    )],
    // SRI (Subresource Integrity)
    scriptsWithSRI: document.querySelectorAll('script[integrity]').length,
    scriptsWithoutSRI: document.querySelectorAll('script[src]:not([integrity])').length,
    stylesWithSRI: document.querySelectorAll('link[rel="stylesheet"][integrity]').length,
    stylesWithoutSRI: document.querySelectorAll('link[rel="stylesheet"][href]:not([integrity])').length,
    // form 보안
    formsWithoutAction: document.querySelectorAll('form:not([action])').length,
    formsHttpAction: Array.from(document.querySelectorAll('form[action^="http:"]')).map(f => f.action),
    formsWithAutocomplete: document.querySelectorAll('input[autocomplete="off"]').length,
    passwordFieldsCount: document.querySelectorAll('input[type="password"]').length,
    // iframe 보안
    iframesWithoutSandbox: document.querySelectorAll('iframe:not([sandbox])').length,
    iframesTotal: document.querySelectorAll('iframe').length,
    // target blank 보안
    linksTargetBlankNoRel: Array.from(document.querySelectorAll('a[target="_blank"]'))
      .filter(a => !a.rel || (!a.rel.includes('noopener') && !a.rel.includes('noreferrer'))).length,
    linksTargetBlankTotal: document.querySelectorAll('a[target="_blank"]').length,
  };
  return JSON.stringify(result);
})()
```

### Phase 4: 보안 점수 계산 & 리포트

**보안 등급 기준 (A-F)**:
- A (90-100): 모든 주요 헤더 설정, SRI 사용, Mixed content 없음
- B (70-89): 대부분의 헤더 설정
- C (50-69): 기본 보안 헤더 일부 누락
- D (30-49): 다수의 보안 이슈
- F (0-29): 심각한 보안 문제

**점수 항목 (100점 만점)**:
- HTTPS (15점)
- HSTS (10점)
- CSP (15점)
- X-Frame-Options (5점)
- X-Content-Type-Options (5점)
- Referrer-Policy (5점)
- Permissions-Policy (5점)
- 쿠키 보안 (10점)
- Mixed Content 없음 (10점)
- SRI 사용 (5점)
- 서버 정보 미노출 (5점)
- target=_blank 보안 (5점)
- iframe sandbox (5점)

Write 도구로 `reports/<domain>/security-<timestamp>.md` 생성:

```markdown
# 🔒 보안 분석: <url>

> 분석 일시: <날짜>

## 보안 등급: X (XX/100점)
████████████████████ XX%

## 서버 보안 헤더

| 헤더 | 상태 | 값 | 설명 |
| --- | --- | --- | --- |
| HTTPS | ✅/❌ | | |
| HSTS | ✅/❌ | (max-age, sub, preload) | 강제 HTTPS |
| CSP | ✅/❌ | (요약) | 콘텐츠 보안 정책 |
| X-Frame-Options | ✅/❌ | | 클릭재킹 방어 |
| X-Content-Type-Options | ✅/❌ | | MIME 스니핑 방지 |
| X-XSS-Protection | ✅/❌ | | XSS 필터 (레거시) |
| Referrer-Policy | ✅/❌ | | 리퍼러 정보 제어 |
| Permissions-Policy | ✅/❌ | | 기능 권한 제어 |

### 서버 정보 노출
- Server: (값 또는 미노출)
- X-Powered-By: (값 또는 미노출)

## 쿠키 보안

| 이름 | Secure | HttpOnly | SameSite |
| --- | --- | --- | --- |

## 클라이언트 보안

### Mixed Content
(HTTP로 로드되는 리소스 목록)

### Subresource Integrity (SRI)
- 스크립트: N/N개 SRI 적용
- 스타일시트: N/N개 SRI 적용

### 외부 스크립트 도메인
(신뢰할 수 있는 도메인 여부 판단)

### iframe 보안
- sandbox 적용: N/N개

### target="_blank" 보안
- noopener/noreferrer 누락: N/N개

## 취약점 요약
(발견된 취약점을 심각도별로 분류: 🔴 Critical, 🟠 High, 🟡 Medium, 🔵 Low)

## 개선 권장사항
(우선순위별 보안 개선 항목, 구현 방법 포함)
```

### Phase 5: 사용자에게 요약

보안 등급과 가장 시급한 보안 이슈 3개를 간결하게 출력합니다.

## 에러 처리 & Playwright 폴백

### Chrome MCP 실패 시 → Playwright로 재시도

Phase 3에서 Chrome MCP의 `javascript_tool`이 실패하면, **Playwright 폴백**으로 클라이언트 보안 체크를 실행합니다:

```
node playwright-runner.mjs "<url>" --eval "(위 Phase 3의 클라이언트 보안 체크 JavaScript 코드)"
```

Playwright 결과에서 `_eval` 데이터를 파싱하여 Phase 4 (점수 계산 & 리포트)에 사용합니다.

curl을 사용한 서버 보안 헤더 수집(Phase 2)은 Chrome MCP 실패와 무관하게 항상 실행합니다.

**Playwright가 설치되지 않은 경우:**
```
cd <project-root> && pnpm install && npx playwright install chromium
```
