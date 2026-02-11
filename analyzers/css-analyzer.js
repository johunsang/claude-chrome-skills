(() => {
  const result = {
    framework: null,
    customProperties: [],
    mediaQueries: [],
    animations: [],
    layouts: [],
    totalStylesheets: 0,
    totalRules: 0,
    externalStylesheets: [],
    corsBlockedUrls: [],
    inlineStyleCount: 0,
  };

  // CSS framework detection via class name patterns
  const html = document.documentElement.outerHTML;

  // Tailwind detection
  if (html.includes('tailwind') || document.querySelector('[class*="tw-"]') || document.querySelector('[class*="bg-"]')) {
    const twClasses = document.querySelectorAll('[class*="flex"], [class*="grid"], [class*="p-"], [class*="m-"], [class*="text-"]');
    if (twClasses.length > 10) result.framework = 'Tailwind CSS';
  }

  // Bootstrap detection
  if (document.querySelector('.bootstrap, [class*="col-md-"], [class*="col-lg-"], .container-fluid')) {
    result.framework = 'Bootstrap';
  }

  // Chakra UI detection
  if (document.querySelector('[class*="chakra-"]')) {
    result.framework = 'Chakra UI';
  }

  // Material UI detection
  if (document.querySelector('[class*="MuiBox"], [class*="MuiButton"], [class*="css-"]')) {
    result.framework = 'Material UI';
  }

  // Ant Design detection
  if (document.querySelector('[class*="ant-"]')) {
    result.framework = 'Ant Design';
  }

  // Emotion / styled-components detection
  if (document.querySelector('[class*="css-"][class*="e"]') || document.querySelector('style[data-emotion]')) {
    if (!result.framework) result.framework = 'Emotion (CSS-in-JS)';
  }
  if (document.querySelector('style[data-styled]') || document.querySelector('[class*="sc-"]')) {
    if (!result.framework) result.framework = 'styled-components';
  }

  // StyleSheets traversal
  const mediaQuerySet = new Set();
  const animationSet = new Set();

  try {
    for (const sheet of Array.from(document.styleSheets)) {
      result.totalStylesheets++;
      if (sheet.href) result.externalStylesheets.push(sheet.href);

      try {
        const rules = sheet.cssRules || sheet.rules;
        result.totalRules += rules.length;

        for (const rule of Array.from(rules)) {
          if (rule instanceof CSSMediaRule) {
            mediaQuerySet.add(rule.conditionText);
          }
          if (rule instanceof CSSKeyframesRule) {
            animationSet.add(rule.name);
          }
        }
      } catch (e) {
        // CORS restricted external stylesheets
        if (sheet.href) result.corsBlockedUrls.push(sheet.href);
      }
    }
  } catch (e) {}

  result.mediaQueries = [...mediaQuerySet];
  result.animations = [...animationSet].map(name => ({ name, type: 'animation' }));

  // Custom properties from :root
  const allProps = Array.from(document.styleSheets).flatMap(sheet => {
    try {
      return Array.from(sheet.cssRules || []).flatMap(rule => {
        if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
          return Array.from(rule.style).filter(p => p.startsWith('--')).map(p => ({
            name: p,
            value: rule.style.getPropertyValue(p).trim(),
          }));
        }
        return [];
      });
    } catch (e) {
      return [];
    }
  });
  result.customProperties = allProps.slice(0, 50);

  // Layout detection
  const allElements = document.querySelectorAll('*');
  let gridCount = 0;
  let flexCount = 0;
  allElements.forEach(el => {
    const style = getComputedStyle(el);
    if (style.display === 'grid' || style.display === 'inline-grid') gridCount++;
    if (style.display === 'flex' || style.display === 'inline-flex') flexCount++;
  });
  if (gridCount > 0) result.layouts.push({ type: 'grid', count: gridCount });
  if (flexCount > 0) result.layouts.push({ type: 'flexbox', count: flexCount });

  // Inline styles count
  result.inlineStyleCount = document.querySelectorAll('[style]').length;

  return JSON.stringify(result);
})()
