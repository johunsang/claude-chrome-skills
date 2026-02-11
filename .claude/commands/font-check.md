웹사이트에서 사용 중인 폰트를 분석하고 최적화 상태를 점검합니다.

대상 URL: $ARGUMENTS

---

## 실행 절차

### Phase 1: Setup

1. URL 파싱 (`https://` 자동 추가)
2. `tabs_context_mcp` → `tabs_create_mcp` → `navigate`
3. 3초 대기

### Phase 2: 폰트 데이터 수집 (javascript_tool)

```javascript
(() => {
  // 1) @font-face 정의
  const fontFaces = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSFontFaceRule) {
          fontFaces.push({
            family: rule.style.getPropertyValue('font-family').replace(/['"]/g, ''),
            src: rule.style.getPropertyValue('src').substring(0, 200),
            weight: rule.style.getPropertyValue('font-weight') || 'normal',
            style: rule.style.getPropertyValue('font-style') || 'normal',
            display: rule.style.getPropertyValue('font-display') || null,
            unicodeRange: rule.style.getPropertyValue('unicode-range') || null,
          });
        }
      }
    } catch {}
  }

  // 2) 실제 사용 중인 폰트 패밀리 (샘플링)
  const usageMap = {};
  const textEls = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a, li, td, th, label, button, input, textarea, div');
  const sample = Array.from(textEls).slice(0, 300);
  for (const el of sample) {
    if (!el.textContent.trim()) continue;
    const family = getComputedStyle(el).fontFamily;
    const weight = getComputedStyle(el).fontWeight;
    const size = getComputedStyle(el).fontSize;
    const key = family.split(',')[0].replace(/['"]/g, '').trim();
    if (!usageMap[key]) usageMap[key] = { count: 0, weights: new Set(), sizes: new Set() };
    usageMap[key].count++;
    usageMap[key].weights.add(weight);
    usageMap[key].sizes.add(size);
  }

  const usedFonts = Object.entries(usageMap).map(([family, data]) => ({
    family,
    count: data.count,
    weights: [...data.weights],
    sizes: [...data.sizes].slice(0, 10),
  })).sort((a, b) => b.count - a.count);

  // 3) 폰트 리소스 (네트워크)
  const fontResources = performance.getEntriesByType('resource')
    .filter(r => /\.(woff2?|ttf|otf|eot)(\?|$)/i.test(r.name))
    .map(r => ({
      url: r.name.substring(0, 200),
      size: r.transferSize || r.encodedBodySize || 0,
      duration: Math.round(r.duration),
      format: r.name.match(/\.(woff2?|ttf|otf|eot)/i)?.[1] || 'unknown',
    }));

  // 4) preload 폰트
  const preloadFonts = Array.from(document.querySelectorAll('link[rel="preload"][as="font"]')).map(l => ({
    href: l.href.substring(0, 200),
    crossorigin: l.hasAttribute('crossorigin'),
    type: l.type || null,
  }));

  // 5) Google Fonts / CDN 폰트
  const googleFonts = Array.from(document.querySelectorAll('link[href*="fonts.googleapis.com"]')).map(l => l.href);
  const adobeFonts = Array.from(document.querySelectorAll('link[href*="use.typekit.net"]')).map(l => l.href);

  const totalFontSize = fontResources.reduce((sum, r) => sum + r.size, 0);

  return JSON.stringify({
    fontFaces,
    usedFonts,
    fontResources,
    preloadFonts,
    googleFonts,
    adobeFonts,
    totalFontSize,
    totalFontFiles: fontResources.length,
    hasWoff2: fontResources.some(r => r.format === 'woff2'),
    hasFontDisplay: fontFaces.every(f => f.display),
  });
})()
```

### Phase 3: 리포트 생성

Write 도구로 `reports/<domain>/fonts-<timestamp>.md` 생성:

```markdown
# 🔤 폰트 분석: <url>

> 분석 일시: <날짜>

## 요약

| 항목 | 값 |
| --- | --- |
| 사용 폰트 패밀리 | N개 |
| 폰트 파일 수 | N개 |
| 총 폰트 크기 | XX KB |
| woff2 사용 | ✅/❌ |
| font-display 설정 | ✅/❌ |
| Google Fonts | ✅/❌ |

## 사용 중인 폰트

| 폰트 | 사용 비중 | Weights | 크기 범위 |
| --- | --- | --- | --- |
| (사용 빈도 순으로) | | | |

## 폰트 파일

| 파일 | 포맷 | 크기 | 로딩 시간 |
| --- | --- | --- | --- |
| (각 폰트 파일) | woff2/woff/ttf | XX KB | XXms |

## @font-face 정의

| 패밀리 | Weight | Style | Display | Unicode Range |
| --- | --- | --- | --- | --- |

## 최적화 체크리스트

- ✅/❌ woff2 포맷 사용 (최적 압축)
- ✅/❌ font-display 속성 설정 (FOIT 방지)
- ✅/❌ 폰트 preload (주요 폰트)
- ✅/❌ unicode-range로 서브셋
- ✅/❌ 사용하지 않는 weight 미로드
- ✅/❌ 총 폰트 크기 200KB 이하

## CDN 폰트

### Google Fonts
(사용 중인 Google Fonts 목록)

### Adobe Fonts
(사용 중인 Adobe Fonts)

## 개선 권장사항

(폰트 최적화 항목: woff2 전환, preload, font-display, 서브셋 등)
```

### Phase 4: 사용자에게 요약

사용 폰트 목록과 최적화 이슈를 간결하게 출력합니다.

## 에러 처리 & Playwright 폴백

### Chrome MCP 실패 시 → Playwright로 재시도

Phase 2에서 Chrome MCP가 실패하면, **Playwright 폴백**을 실행합니다:

```
node playwright-runner.mjs "<url>" --eval "(위 Phase 2의 폰트 수집 JavaScript 코드)"
```

Playwright 결과에서 `_eval` 데이터를 파싱하여 Phase 3 (리포트 생성)부터 동일하게 진행합니다.

**Playwright가 설치되지 않은 경우:**
```
cd <project-root> && pnpm install && npx playwright install chromium
```
