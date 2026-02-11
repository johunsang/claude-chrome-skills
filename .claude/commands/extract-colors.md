웹사이트에서 색상 팔레트를 추출하고 디자인 토큰을 분석합니다.

대상 URL: $ARGUMENTS

---

## 실행 절차

### Phase 1: Setup

1. URL 파싱 (`https://` 자동 추가)
2. `tabs_context_mcp` → `tabs_create_mcp` → `navigate`
3. 3초 대기 → `screenshot`

### Phase 2: 색상 & 디자인 토큰 추출

1. `analyzers/design-token-analyzer.js`를 Read → `javascript_tool`로 실행
2. `analyzers/css-analyzer.js`를 Read → `javascript_tool`로 실행 (커스텀 프로퍼티 추출용)

### Phase 3: 색상 분석

추출된 데이터를 기반으로 다음을 분석합니다:

1. **색상 분류**:
   - Primary: 채도가 높고 사용 빈도가 높은 브랜드 색상
   - Neutral: 회색 계열 (채도 낮음, 밝기로 구분)
   - Semantic: 성공(green), 경고(yellow/orange), 에러(red), 정보(blue)
   - Accent: 강조용 색상

2. **CSS 변수 매핑**: `--color-*`, `--bg-*` 등 색상 관련 변수와 실제 값

3. **대비 분석**: 주요 텍스트/배경 색상 조합의 WCAG 대비율 추정

### Phase 4: 리포트 생성

Write 도구로 `reports/<domain>/colors-<timestamp>.md` 파일 생성:

```markdown
# 🎨 색상 팔레트 분석: <url>

> 분석 일시: <날짜>

## 색상 요약
- 고유 색상 수: n개
- CSS 변수 기반: n개
- Computed 기반: n개

## 브랜드 색상 (Primary)
| 색상 | Hex/RGB | CSS 변수 | 사용 횟수 |
| --- | --- | --- | --- |
(채도 높은 색상을 추출, 사용 빈도 순)

## 중립 색상 (Neutral)
| 색상 | Hex/RGB | CSS 변수 | 사용 횟수 |
| --- | --- | --- | --- |
(회색 계열)

## 시맨틱 색상
- ✅ Success: `색상`
- ⚠️ Warning: `색상`
- ❌ Error: `색상`
- ℹ️ Info: `색상`

## CSS 커스텀 프로퍼티 (색상 관련)
| 변수 이름 | 값 |
| --- | --- |
(--color-*, --bg-* 등)

## 타이포그래피
| 폰트 패밀리 | 사용 비중 | Weights |
| --- | --- | --- |

## 간격 시스템
(사용 빈도 높은 간격 값을 스케일 순으로)
`4px` → `8px` → `16px` → `24px` → `32px`

## 그림자 & 보더 라디우스
(고유 그림자 값, 보더 라디우스 값)

## 디자인 시스템 평가
(일관성 평가, CSS 변수 활용도, 개선 제안)
```

### Phase 5: 사용자에게 요약 출력

핵심 색상 3-5개와 디자인 일관성 평가를 간결하게 보여줍니다.

## 에러 처리 & Playwright 폴백

### Chrome MCP 실패 시 → Playwright로 재시도

Phase 2에서 Chrome MCP가 실패하면, **Playwright 폴백**을 실행합니다:

```
node playwright-runner.mjs "<url>" --only designTokens,css
```

Playwright 결과에서 `designTokens`와 `css` 데이터를 파싱하여 Phase 3 (색상 분석)부터 동일하게 진행합니다.

**Playwright가 설치되지 않은 경우:**
```
cd <project-root> && pnpm install && npx playwright install chromium
```
