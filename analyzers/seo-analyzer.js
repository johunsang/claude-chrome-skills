(() => {
  const result = {
    title: document.title || null,
    description: null,
    keywords: null,
    canonical: null,
    robots: null,
    ogTags: {},
    twitterTags: {},
    structuredData: [],
    headings: [],
    lang: document.documentElement.lang || null,
  };

  // Meta description
  const descMeta = document.querySelector('meta[name="description"]');
  if (descMeta) result.description = descMeta.getAttribute('content');

  // Meta keywords
  const keywordsMeta = document.querySelector('meta[name="keywords"]');
  if (keywordsMeta) result.keywords = keywordsMeta.getAttribute('content');

  // Canonical URL
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink) result.canonical = canonicalLink.getAttribute('href');

  // Robots meta
  const robotsMeta = document.querySelector('meta[name="robots"]');
  if (robotsMeta) result.robots = robotsMeta.getAttribute('content');

  // Open Graph tags
  document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
    const property = meta.getAttribute('property');
    const content = meta.getAttribute('content');
    if (property && content) {
      result.ogTags[property] = content;
    }
  });

  // Twitter Card tags
  document.querySelectorAll('meta[name^="twitter:"]').forEach(meta => {
    const name = meta.getAttribute('name');
    const content = meta.getAttribute('content');
    if (name && content) {
      result.twitterTags[name] = content;
    }
  });

  // Structured data (JSON-LD)
  document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    try {
      const data = JSON.parse(script.textContent || '');
      result.structuredData.push(data);
    } catch (e) {}
  });

  // Headings hierarchy
  for (let level = 1; level <= 6; level++) {
    document.querySelectorAll('h' + level).forEach(heading => {
      result.headings.push({
        level,
        text: (heading.textContent || '').trim().substring(0, 200),
      });
    });
  }

  return JSON.stringify(result);
})()
