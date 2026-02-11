웹사이트의 로그인/인증 페이지 보안과 UX를 분석합니다.

대상 URL: $ARGUMENTS

---

## 실행 절차

### Phase 1: Setup

1. URL 파싱 (`https://` 자동 추가)
2. `tabs_context_mcp` → `tabs_create_mcp` → `navigate`
3. 3초 대기 → `screenshot`

### Phase 2: 로그인 폼 탐지 (javascript_tool)

```javascript
(() => {
  const forms = Array.from(document.querySelectorAll('form'));
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  const loginForms = [];

  for (const form of forms) {
    const hasPassword = form.querySelector('input[type="password"]');
    const hasEmail = form.querySelector('input[type="email"], input[name*="email"], input[name*="user"], input[name*="login"], input[name*="id"]');
    if (hasPassword || hasEmail) {
      const inputs = Array.from(form.querySelectorAll('input')).map(inp => ({
        type: inp.type,
        name: inp.name || null,
        id: inp.id || null,
        autocomplete: inp.getAttribute('autocomplete') || null,
        placeholder: inp.placeholder || null,
        required: inp.required,
        maxlength: inp.maxLength > 0 ? inp.maxLength : null,
        pattern: inp.pattern || null,
        ariaLabel: inp.getAttribute('aria-label') || null,
      }));
      loginForms.push({
        action: form.action || null,
        method: form.method || 'get',
        isHTTPS: form.action ? form.action.startsWith('https') : location.protocol === 'https:',
        inputs,
        hasCSRFToken: !!form.querySelector('input[name*="csrf"], input[name*="token"], input[name*="_token"]'),
        hasCaptcha: !!form.querySelector('[class*="captcha"], [class*="recaptcha"], [id*="captcha"], iframe[src*="recaptcha"], iframe[src*="hcaptcha"]'),
        hasRememberMe: !!form.querySelector('input[name*="remember"], input[type="checkbox"]'),
        submitButton: form.querySelector('button[type="submit"], input[type="submit"]')?.textContent?.trim() || null,
      });
    }
  }

  // OAuth/소셜 로그인 탐지
  const socialLogins = [];
  const socialPatterns = [
    { name: 'Google', pattern: /google|gsi/i },
    { name: 'Facebook', pattern: /facebook|fb-login/i },
    { name: 'Apple', pattern: /apple.*sign/i },
    { name: 'GitHub', pattern: /github/i },
    { name: 'Kakao', pattern: /kakao/i },
    { name: 'Naver', pattern: /naver/i },
    { name: 'Twitter/X', pattern: /twitter|x\.com/i },
  ];

  const allLinks = Array.from(document.querySelectorAll('a, button'));
  for (const el of allLinks) {
    const text = (el.textContent + ' ' + (el.className || '') + ' ' + (el.href || '')).toLowerCase();
    for (const sp of socialPatterns) {
      if (sp.pattern.test(text)) {
        socialLogins.push(sp.name);
        break;
      }
    }
  }

  // 비밀번호 정책 힌트
  const passwordInput = document.querySelector('input[type="password"]');
  const passwordHints = {
    hasMinLength: passwordInput?.minLength > 0 ? passwordInput.minLength : null,
    hasMaxLength: passwordInput?.maxLength > 0 ? passwordInput.maxLength : null,
    hasPattern: passwordInput?.pattern || null,
    placeholder: passwordInput?.placeholder || null,
    autocomplete: passwordInput?.getAttribute('autocomplete') || null,
  };

  // 회원가입 링크
  const signupLink = document.querySelector('a[href*="signup"], a[href*="register"], a[href*="join"]');
  // 비밀번호 찾기
  const forgotLink = document.querySelector('a[href*="forgot"], a[href*="reset"], a[href*="recover"], a[href*="find"]');

  return JSON.stringify({
    loginForms,
    socialLogins: [...new Set(socialLogins)],
    passwordHints,
    hasSignupLink: !!signupLink,
    signupUrl: signupLink?.href || null,
    hasForgotPassword: !!forgotLink,
    forgotPasswordUrl: forgotLink?.href || null,
    totalPasswordFields: passwordInputs.length,
    pageTitle: document.title,
    isHTTPS: location.protocol === 'https:',
  });
})()
```

### Phase 3: 서버 보안 헤더 (Bash)

```
curl -sI -L "<url>"
```

로그인 관련 헤더 확인:
- `strict-transport-security` — HTTPS 강제
- `content-security-policy` — XSS 방어
- `x-frame-options` — 클릭재킹 방어 (로그인 페이지 iframe 삽입 방지)
- `set-cookie` — 세션 쿠키 보안 (Secure, HttpOnly, SameSite)

### Phase 4: 리포트 생성

Write 도구로 `reports/<domain>/login-<timestamp>.md` 생성:

```markdown
# 🔐 로그인/인증 분석: <url>

> 분석 일시: <날짜>

## 로그인 폼 요약

| 항목 | 값 |
| --- | --- |
| 로그인 폼 수 | N개 |
| 소셜 로그인 | Google, Kakao, ... |
| HTTPS | ✅/❌ |
| CSRF 토큰 | ✅/❌ |
| CAPTCHA | ✅/❌ |

## 폼 보안 체크리스트

- ✅/❌ HTTPS로 전송 (form action)
- ✅/❌ CSRF 토큰 존재
- ✅/❌ CAPTCHA/봇 방어
- ✅/❌ autocomplete 속성 적절한 설정
- ✅/❌ 비밀번호 필드에 pattern/minlength
- ✅/❌ 비밀번호 찾기 링크
- ✅/❌ 회원가입 링크

## 입력 필드 분석

| 필드 | Type | Autocomplete | Required | Placeholder |
| --- | --- | --- | --- | --- |
| ... | email | username | ✅ | "이메일" |
| ... | password | current-password | ✅ | "비밀번호" |

## 소셜/OAuth 로그인

(감지된 소셜 로그인 목록)

## 서버 보안 (로그인 관련)

| 헤더 | 상태 | 값 |
| --- | --- | --- |
| HSTS | ✅/❌ | |
| CSP | ✅/❌ | |
| X-Frame-Options | ✅/❌ | |
| 세션 쿠키 보안 | ✅/❌ | Secure, HttpOnly, SameSite |

## UX 평가

- 소셜 로그인 옵션 수
- 비밀번호 표시/숨기기 버튼
- Remember Me 옵션
- 에러 메시지 안내 (빈 폼 제출 시)

## 개선 권장사항

(보안 + UX 개선 항목)
```

### Phase 5: 사용자에게 요약

로그인 폼 보안 상태와 주요 이슈를 간결하게 출력합니다.

## 에러 처리 & Playwright 폴백

### Chrome MCP 실패 시 → Playwright로 재시도

Phase 2에서 Chrome MCP가 실패하면, **Playwright 폴백**을 실행합니다:

```
node playwright-runner.mjs "<url>" --eval "(위 Phase 2의 로그인 폼 탐지 JavaScript 코드)"
```

Playwright 결과에서 `_eval` 데이터를 파싱하여 Phase 4 (리포트 생성)부터 동일하게 진행합니다.

**Playwright가 설치되지 않은 경우:**
```
cd <project-root> && pnpm install && npx playwright install chromium
```
