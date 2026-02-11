웹사이트의 SEO 상태를 빠르게 점검하고 개선점을 제안합니다.

대상 URL: $ARGUMENTS

---

## 실행 절차

### Phase 1: Setup

1. URL 파싱 (`https://` 자동 추가)
2. `tabs_context_mcp` → `tabs_create_mcp` → `navigate`
3. 3초 대기 → `screenshot`

### Phase 2: SEO 데이터 수집

1. `analyzers/seo-analyzer.js`를 Read → `javascript_tool`로 실행 → seoData
2. `analyzers/tech-detector.js`를 Read → `javascript_tool`로 실행 → techData (서버/프레임워크 정보)
3. Bash로 보안/서버 헤더 확인:
   ```
   curl -sI -L "<url>"
   ```

### Phase 3: 추가 SEO 체크 (javascript_tool)

다음 JavaScript를 `javascript_tool`로 실행하여 추가 SEO 정보를 수집합니다:

```javascript
(() => {
  const result = {
    totalLinks: document.querySelectorAll('a[href]').length,
    externalLinks: Array.from(document.querySelectorAll('a[href]')).filter(a => {
      try { return new URL(a.href).hostname !== location.hostname; } catch { return false; }
    }).length,
    internalLinks: 0,
    brokenImages: Array.from(document.querySelectorAll('img')).filter(img => !img.naturalWidth && !img.loading).length,
    hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
    viewportContent: document.querySelector('meta[name="viewport"]')?.getAttribute('content') || null,
    hasFavicon: !!document.querySelector('link[rel*="icon"]'),
    hasManifest: !!document.querySelector('link[rel="manifest"]'),
    hasAmpVersion: !!document.querySelector('link[rel="amphtml"]'),
    hasAlternateLanguage: document.querySelectorAll('link[rel="alternate"][hreflang]').length,
    wordCount: document.body?.innerText?.split(/\s+/).filter(w => w.length > 0).length || 0,
    hasH1: document.querySelectorAll('h1').length,
    duplicateH1: document.querySelectorAll('h1').length > 1,
    titleLength: document.title?.length || 0,
    descriptionLength: document.querySelector('meta[name="description"]')?.getAttribute('content')?.length || 0,
  };
  result.internalLinks = result.totalLinks - result.externalLinks;
  return JSON.stringify(result);
})()
```

### Phase 4: SEO 점수 계산 & 리포트

수집한 데이터를 기반으로 SEO 점수를 항목별로 계산합니다:

**필수 항목 (각 10점, 총 50점)**:
- ✅ 타이틀 존재 + 적정 길이(10-70자)
- ✅ 메타 설명 존재 + 적정 길이(50-160자)
- ✅ H1 태그 존재 + 1개만 있음
- ✅ Canonical URL 설정
- ✅ 뷰포트 메타 태그

**권장 항목 (각 5점, 총 30점)**:
- OG 태그 설정 (og:title, og:description, og:image)
- Twitter 카드 설정
- 구조화 데이터 (JSON-LD)
- lang 속성 설정
- Favicon 설정
- HTTPS 사용

**추가 항목 (각 2-3점, 총 20점)**:
- robots.txt 설정
- 시맨틱 헤딩 구조
- 이미지 alt 텍스트
- 내부/외부 링크 비율
- 단어 수 (300자 이상)
- 로딩 속도

Write 도구로 리포트 파일 생성: `reports/<domain>/seo-<timestamp>.md`

```markdown
# 📊 SEO 분석: <url>

> 분석 일시: <날짜>

## SEO 점수: XX/100
████████████████░░░░ XX%

## 체크리스트

### 필수 항목
- ✅/❌ 타이틀: "<title>" (XX자) — 권장 10-70자
- ✅/❌ 메타 설명: "<desc>" (XX자) — 권장 50-160자
- ✅/❌ H1 태그: n개 — 권장 1개
- ✅/❌ Canonical URL: <url 또는 미설정>
- ✅/❌ 뷰포트 메타 태그

### 권장 항목
- ✅/❌ Open Graph 태그 (n개)
- ✅/❌ Twitter 카드 태그 (n개)
- ✅/❌ 구조화 데이터 (n개)
- ✅/❌ lang 속성: <값>
- ✅/❌ Favicon
- ✅/❌ HTTPS

### 추가 항목
- 헤딩 구조: h1(n) h2(n) h3(n) ...
- 내부 링크: n개 / 외부 링크: n개
- 단어 수: n개
- 이미지: alt 있음 n개 / alt 없음 n개

## Open Graph 태그
| 속성 | 값 |
| --- | --- |

## Twitter 카드 태그
| 속성 | 값 |
| --- | --- |

## 구조화 데이터
(JSON-LD 타입과 간단한 요약)

## 개선 권장사항
(우선순위별 SEO 개선 항목)
```

### Phase 5: 사용자에게 요약

SEO 점수와 가장 시급한 개선 항목 3개를 간결하게 출력합니다.

## 에러 처리 & Playwright 폴백

### Chrome MCP 실패 시 → Playwright로 재시도

Phase 2에서 Chrome MCP가 실패하면, **Playwright 폴백**을 실행합니다:

```
node playwright-runner.mjs "<url>" --only seo,techStack
```

Playwright 결과에서 `seo`와 `techStack` 데이터를 파싱하여 Phase 3의 추가 SEO 체크를 `--eval` 옵션으로 실행합니다:

```
node playwright-runner.mjs "<url>" --only seo,techStack --eval "(위 Phase 3의 JavaScript 코드)"
```

결과를 받은 후 Phase 4 (점수 계산 & 리포트)부터 동일하게 진행합니다.

**Playwright가 설치되지 않은 경우:**
```
cd <project-root> && pnpm install && npx playwright install chromium
```
