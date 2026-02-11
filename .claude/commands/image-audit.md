웹사이트의 이미지 사용 현황과 최적화 상태를 분석합니다.

대상 URL: $ARGUMENTS

---

## 실행 절차

### Phase 1: Setup

1. URL 파싱 (`https://` 자동 추가)
2. `tabs_context_mcp` → `tabs_create_mcp` → `navigate`
3. 3초 대기

### Phase 2: 이미지 데이터 수집 (javascript_tool)

```javascript
(() => {
  const imgs = Array.from(document.querySelectorAll('img'));
  const bgImages = [];

  // 1) <img> 태그 분석
  const imageData = imgs.map(img => {
    const rect = img.getBoundingClientRect();
    return {
      src: (img.currentSrc || img.src || '').substring(0, 200),
      alt: img.alt || null,
      hasAlt: img.hasAttribute('alt'),
      width: img.naturalWidth,
      height: img.naturalHeight,
      displayWidth: Math.round(rect.width),
      displayHeight: Math.round(rect.height),
      loading: img.loading || null,
      decoding: img.decoding || null,
      fetchpriority: img.getAttribute('fetchpriority') || null,
      srcset: img.srcset ? true : false,
      sizes: img.sizes || null,
      isVisible: rect.width > 0 && rect.height > 0,
      isLCP: false,
      format: null,
    };
  });

  // 포맷 감지
  for (const img of imageData) {
    if (!img.src) continue;
    if (/\.webp/i.test(img.src)) img.format = 'webp';
    else if (/\.avif/i.test(img.src)) img.format = 'avif';
    else if (/\.svg/i.test(img.src)) img.format = 'svg';
    else if (/\.png/i.test(img.src)) img.format = 'png';
    else if (/\.jpe?g/i.test(img.src)) img.format = 'jpeg';
    else if (/\.gif/i.test(img.src)) img.format = 'gif';
    else if (/\.ico/i.test(img.src)) img.format = 'ico';
    else img.format = 'unknown';
  }

  // 2) <picture> + <source> 분석
  const pictures = document.querySelectorAll('picture');
  const pictureCount = pictures.length;
  const hasModernFormats = Array.from(document.querySelectorAll('source[type="image/webp"], source[type="image/avif"]')).length;

  // 3) 배경 이미지 (샘플)
  const allEls = document.querySelectorAll('*');
  const bgSample = Array.from(allEls).slice(0, 500);
  for (const el of bgSample) {
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none' && bg.includes('url(')) {
      const match = bg.match(/url\(["']?(.+?)["']?\)/);
      if (match) bgImages.push(match[1].substring(0, 200));
    }
  }

  // 4) 이미지 리소스 크기 (Performance API)
  const imgResources = performance.getEntriesByType('resource')
    .filter(r => r.initiatorType === 'img' || /\.(jpe?g|png|gif|webp|avif|svg|ico)(\?|$)/i.test(r.name))
    .map(r => ({
      url: r.name.substring(0, 200),
      size: r.transferSize || r.encodedBodySize || 0,
      duration: Math.round(r.duration),
    }));

  const totalImageSize = imgResources.reduce((sum, r) => sum + r.size, 0);

  // 5) 오버사이즈 이미지 (자연 크기가 표시 크기의 2배 이상)
  const oversizedImages = imageData.filter(img =>
    img.isVisible && img.width > 0 && img.displayWidth > 0 &&
    img.width > img.displayWidth * 2
  );

  // 포맷 통계
  const formatStats = {};
  for (const img of imageData) {
    const f = img.format || 'unknown';
    formatStats[f] = (formatStats[f] || 0) + 1;
  }

  return JSON.stringify({
    totalImages: imgs.length,
    visibleImages: imageData.filter(i => i.isVisible).length,
    totalImageSize,
    images: imageData.slice(0, 50),
    backgroundImages: bgImages.length,
    pictureElements: pictureCount,
    modernFormatSources: hasModernFormats,
    oversizedCount: oversizedImages.length,
    oversizedImages: oversizedImages.slice(0, 10).map(i => ({ src: i.src, natural: `${i.width}x${i.height}`, display: `${i.displayWidth}x${i.displayHeight}` })),
    formatStats,
    lazyLoaded: imageData.filter(i => i.loading === 'lazy').length,
    withSrcset: imageData.filter(i => i.srcset).length,
    withAlt: imageData.filter(i => i.hasAlt).length,
    withoutAlt: imageData.filter(i => !i.hasAlt).length,
    imgResources: imgResources.slice(0, 30),
  });
})()
```

### Phase 3: 리포트 생성

Write 도구로 `reports/<domain>/images-<timestamp>.md` 생성:

```markdown
# 🖼️ 이미지 분석: <url>

> 분석 일시: <날짜>

## 요약

| 항목 | 값 |
| --- | --- |
| 총 이미지 | N개 |
| 총 이미지 크기 | XX KB |
| 배경 이미지 | N개 |
| Lazy Loading | N/N개 |
| 모던 포맷 (WebP/AVIF) | N개 |
| srcset 사용 | N/N개 |
| alt 텍스트 | N/N개 |
| 오버사이즈 이미지 | N개 |

## 포맷 분포

| 포맷 | 개수 | 비율 |
| --- | --- | --- |
| jpeg | N개 | ██████░░░░ XX% |
| png | N개 | ████░░░░░░ XX% |
| webp | N개 | ██░░░░░░░░ XX% |
| svg | N개 | █░░░░░░░░░ XX% |

## 큰 이미지 (상위 10개)

| 파일 | 크기 | 로딩 시간 |
| --- | --- | --- |

## 오버사이즈 이미지

| 파일 | 원본 크기 | 표시 크기 | 낭비 비율 |
| --- | --- | --- | --- |
(자연 크기가 표시 크기의 2배 이상인 이미지)

## 최적화 체크리스트

- ✅/❌ Lazy Loading 적용 (뷰포트 밖 이미지)
- ✅/❌ 모던 포맷 사용 (WebP/AVIF)
- ✅/❌ srcset으로 반응형 이미지
- ✅/❌ <picture> 요소 활용
- ✅/❌ 적절한 이미지 크기 (오버사이즈 없음)
- ✅/❌ alt 텍스트 100% 적용
- ✅/❌ 총 이미지 크기 1MB 이하

## 개선 권장사항

(이미지 최적화 우선순위별 항목)
```

### Phase 4: 사용자에게 요약

이미지 현황과 주요 최적화 이슈를 간결하게 출력합니다.

## 에러 처리 & Playwright 폴백

### Chrome MCP 실패 시 → Playwright로 재시도

Phase 2에서 Chrome MCP가 실패하면, **Playwright 폴백**을 실행합니다:

```
node playwright-runner.mjs "<url>" --eval "(위 Phase 2의 이미지 수집 JavaScript 코드)"
```

Playwright 결과에서 `_eval` 데이터를 파싱하여 Phase 3 (리포트 생성)부터 동일하게 진행합니다.

**Playwright가 설치되지 않은 경우:**
```
cd <project-root> && pnpm install && npx playwright install chromium
```
