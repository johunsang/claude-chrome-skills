(() => {
  const result = {
    resources: {
      total: { count: 0, size: 0 },
      byType: {},
    },
    lazyLoadedImages: 0,
    totalImages: 0,
    preloadLinks: [],
    preconnectLinks: [],
    timing: {},
  };

  // ====== Resource tracking via PerformanceResourceTiming API ======
  const resources = performance.getEntriesByType('resource');

  function classifyResource(entry) {
    const url = entry.name.toLowerCase();
    const initiator = entry.initiatorType;

    // initiatorType-based classification
    if (initiator === 'script' || url.endsWith('.js') || url.endsWith('.mjs')) return 'script';
    if (initiator === 'css' || initiator === 'link' && url.endsWith('.css')) return 'stylesheet';
    if (initiator === 'img' || initiator === 'image' || /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp)(\?|$)/i.test(url)) return 'image';
    if (/\.(woff2?|ttf|otf|eot)(\?|$)/i.test(url)) return 'font';
    if (initiator === 'video' || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) return 'video';
    if (initiator === 'audio' || /\.(mp3|wav|ogg|aac)(\?|$)/i.test(url)) return 'audio';
    if (initiator === 'xmlhttprequest' || initiator === 'fetch') return 'xhr/fetch';
    if (url.endsWith('.json')) return 'json';
    if (url.endsWith('.xml') || url.endsWith('.rss')) return 'xml';
    if (url.endsWith('.wasm')) return 'wasm';
    return 'other';
  }

  for (const entry of resources) {
    const size = entry.transferSize || entry.encodedBodySize || 0;
    const type = classifyResource(entry);

    result.resources.total.count++;
    result.resources.total.size += size;

    if (!result.resources.byType[type]) {
      result.resources.byType[type] = { count: 0, size: 0 };
    }
    result.resources.byType[type].count++;
    result.resources.byType[type].size += size;
  }

  // ====== Image counts ======
  const images = document.querySelectorAll('img');
  result.totalImages = images.length;
  images.forEach(img => {
    if (img.loading === 'lazy') result.lazyLoadedImages++;
  });

  // ====== Preload and preconnect links ======
  document.querySelectorAll('link[rel="preload"]').forEach(link => {
    const href = link.getAttribute('href');
    if (href) result.preloadLinks.push(href);
  });
  document.querySelectorAll('link[rel="preconnect"]').forEach(link => {
    const href = link.getAttribute('href');
    if (href) result.preconnectLinks.push(href);
  });

  // ====== Performance timing ======
  const entries = performance.getEntriesByType('navigation');
  if (entries.length > 0) {
    const nav = entries[0];
    result.timing.domContentLoaded = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
    result.timing.load = Math.round(nav.loadEventEnd - nav.startTime);
  }

  // Paint timing
  const paintEntries = performance.getEntriesByType('paint');
  for (const entry of paintEntries) {
    if (entry.name === 'first-paint') {
      result.timing.firstPaint = Math.round(entry.startTime);
    }
    if (entry.name === 'first-contentful-paint') {
      result.timing.firstContentfulPaint = Math.round(entry.startTime);
    }
  }

  return JSON.stringify(result);
})()
