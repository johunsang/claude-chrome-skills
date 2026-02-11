웹사이트를 여러 뷰포트 크기로 스크린샷을 캡처하여 반응형 디자인을 확인합니다.

대상 URL: $ARGUMENTS

---

## 실행 절차

### Phase 1: Setup

1. `$ARGUMENTS`에서 URL을 파싱합니다. `https://`가 없으면 자동 추가합니다.
2. `tabs_context_mcp` → `tabs_create_mcp` → `navigate`로 페이지를 엽니다.
3. 3초 대기 후 페이지 로드 확인.

### Phase 2: 멀티 뷰포트 스크린샷

다음 5개 뷰포트로 순차적으로 리사이즈하며 스크린샷을 캡처합니다:

| 이름 | 너비 | 높이 | 대상 디바이스 |
|------|------|------|--------------|
| Mobile S | 320 | 568 | iPhone SE |
| Mobile L | 428 | 926 | iPhone 14 Pro Max |
| Tablet | 768 | 1024 | iPad |
| Laptop | 1280 | 800 | 일반 노트북 |
| Desktop | 1920 | 1080 | 풀HD 모니터 |

각 뷰포트에서:
1. `resize_window`로 크기 변경
2. 1초 대기 (레이아웃 재조정)
3. `screenshot` 캡처

### Phase 3: 결과 보고

사용자에게 다음을 보고합니다:
1. 각 뷰포트에서의 레이아웃 변화 관찰 (네비게이션 변화, 컬럼 레이아웃, 이미지 크기 등)
2. 반응형 브레이크포인트 동작 여부
3. 모바일에서의 사용성 문제 (텍스트 크기, 터치 타겟 등)
4. 개선 권장사항

## 에러 처리 & Playwright 폴백

### Chrome MCP 실패 시 → Playwright로 재시도

Phase 1에서 Chrome MCP가 실패하면, **Playwright 폴백**을 실행합니다:

```
node playwright-runner.mjs "<url>" --viewports "320x568,428x926,768x1024,1280x800,1920x1080" --screenshot reports/<domain>/screenshots/
```

Playwright 결과에서 `_viewports` 배열을 읽어 각 뷰포트의 레이아웃 정보를 사용자에게 보고합니다.

**Playwright가 설치되지 않은 경우:**
```
cd <project-root> && pnpm install && npx playwright install chromium
```

### 기타 에러 처리
- 리사이즈 실패 시: 해당 뷰포트를 스킵하고 다음으로 진행
- 페이지 로드 실패 시: URL 확인 요청
- 네비게이션 실패 시: Playwright 폴백 시도
