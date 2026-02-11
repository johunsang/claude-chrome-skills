(() => {
  const result = {
    frameworks: [],
    libraries: [],
    cms: null,
    server: null,
    cdn: [],
    analytics: [],
    meta: {},
  };

  const win = window;
  const html = document.documentElement.outerHTML;

  // ====== Framework detection ======

  // Next.js
  if (win.__NEXT_DATA__ || document.querySelector('#__next') || document.querySelector('script[src*="/_next/"]')) {
    result.frameworks.push('Next.js');
  }
  // Nuxt
  if (win.__NUXT__ || win.__NUXT_DATA__ || document.querySelector('#__nuxt') || document.querySelector('script[src*="/_nuxt/"]')) {
    result.frameworks.push('Nuxt.js');
  }
  // Remix
  if (win.__remixContext || win.__remixManifest) result.frameworks.push('Remix');
  // Gatsby
  if (win.__GATSBY || document.querySelector('#___gatsby')) result.frameworks.push('Gatsby');
  // SvelteKit
  if (win.__SVELTEKIT_DATA__ || win.__SVELTE_HMR) result.frameworks.push('SvelteKit');
  // Astro
  if (document.querySelector('[data-astro-cid]') || document.querySelector('astro-island')) {
    result.frameworks.push('Astro');
  }
  // Qwik
  if (document.querySelector('[q\\:container]') || win.qwikevents) result.frameworks.push('Qwik');

  // ====== Library detection (production-safe) ======

  // React
  const reactDetected = (() => {
    if (win.React || win.ReactDOM || win.__REACT_DEVTOOLS_GLOBAL_HOOK__) return true;
    if (document.querySelector('[data-reactroot]') || document.querySelector('[data-reactid]')) return true;
    const testNodes = [document.getElementById('root'), document.getElementById('app'),
      document.getElementById('__next'), document.body.firstElementChild];
    for (const node of testNodes) {
      if (!node) continue;
      const keys = Object.keys(node);
      if (keys.some(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance') || k.startsWith('__reactProps'))) {
        return true;
      }
    }
    return false;
  })();
  if (reactDetected) result.libraries.push('React');

  // Vue
  const vueDetected = (() => {
    if (win.Vue || win.__VUE__) return true;
    if (document.querySelector('#__nuxt') || document.querySelector('[data-v-]')) return true;
    const testNodes = [document.getElementById('app'), document.getElementById('__nuxt'), document.body.firstElementChild];
    for (const node of testNodes) {
      if (!node) continue;
      if ('__vue_app__' in node || '__vue__' in node) return true;
    }
    const allEls = document.querySelectorAll('*');
    for (let i = 0; i < Math.min(allEls.length, 50); i++) {
      const attrs = allEls[i].getAttributeNames();
      if (attrs.some(a => /^data-v-[a-f0-9]+$/.test(a))) return true;
    }
    return false;
  })();
  if (vueDetected) result.libraries.push('Vue.js');

  // Angular
  if (win.ng || win.getAllAngularRootElements || document.querySelector('[ng-version]') ||
      document.querySelector('[_nghost-]') || document.querySelector('[_ngcontent-]') ||
      document.querySelector('app-root')) {
    result.libraries.push('Angular');
  }

  // Svelte
  if (document.querySelector('[class*="svelte-"]') || document.querySelector('.s-') ||
      html.includes('__svelte')) {
    result.libraries.push('Svelte');
  }

  // Solid
  if (win._$HY || document.querySelector('[data-hk]')) result.libraries.push('Solid.js');

  // Preact
  if (win.preact || win.__PREACT_DEVTOOLS__) result.libraries.push('Preact');

  // jQuery
  if (win.jQuery || (win.$ && win.$.fn && win.$.fn.jquery)) result.libraries.push('jQuery');

  // Alpine.js
  if (win.Alpine || document.querySelector('[x-data]')) result.libraries.push('Alpine.js');

  // htmx
  if (win.htmx || document.querySelector('[hx-get], [hx-post], [hx-trigger]')) result.libraries.push('htmx');

  // Lit / Web Components
  const customElements = new Set();
  document.querySelectorAll('*').forEach(el => {
    if (el.tagName.includes('-')) customElements.add(el.tagName.toLowerCase());
  });
  if (customElements.size > 0) {
    result.meta['webComponents'] = Array.from(customElements).slice(0, 15).join(', ');
    if (customElements.size >= 3) {
      result.libraries.push('Web Components (' + customElements.size + '개)');
    }
  }

  // Stimulus
  if (document.querySelector('[data-controller]')) result.libraries.push('Stimulus');

  // Turbo / Turbolinks
  if (win.Turbo || win.Turbolinks || document.querySelector('[data-turbo]')) result.libraries.push('Turbo');

  // GSAP
  if (win.gsap || win.TweenMax || win.TweenLite) result.libraries.push('GSAP');

  // Three.js
  if (win.THREE) result.libraries.push('Three.js');

  // D3
  if (win.d3) result.libraries.push('D3.js');

  // Lodash / Underscore
  if (win._ && (win._.VERSION || win._.each)) result.libraries.push('Lodash/Underscore');

  // ====== Build tool / bundler detection ======
  const scripts = Array.from(document.querySelectorAll('script[src]')).map(el => el.getAttribute('src') || '');
  const links = Array.from(document.querySelectorAll('link[href]')).map(el => el.getAttribute('href') || '');
  const allSources = [...scripts, ...links];

  const buildToolSet = new Set();

  for (const src of allSources) {
    if (/\/chunks?\//i.test(src) || /\.[a-f0-9]{8,}\.js$/i.test(src) || /bundle\.\w+\.js/i.test(src)) {
      buildToolSet.add('Webpack');
    }
    if (src.includes('/@vite/') || src.includes('/.vite/') || /assets\/[\w-]+\.[a-f0-9]{8}\.js$/i.test(src)) {
      buildToolSet.add('Vite');
    }
    if (src.includes('/_next/static/chunks/') && win.__NEXT_DATA__) {
      buildToolSet.add('Turbopack/Webpack (Next.js)');
    }
  }

  if (document.querySelector('script[type="module"][src]')) {
    result.meta['esModules'] = 'true';
  }

  if (buildToolSet.size > 0) {
    result.meta['buildTools'] = Array.from(buildToolSet).join(', ');
  }

  // ====== CMS detection ======
  const generator = document.querySelector('meta[name="generator"]');
  if (generator) {
    const content = generator.getAttribute('content') || '';
    result.meta['generator'] = content;
    const cmsMap = [
      ['WordPress', 'WordPress'], ['Drupal', 'Drupal'], ['Joomla', 'Joomla'],
      ['Shopify', 'Shopify'], ['Wix', 'Wix'], ['Squarespace', 'Squarespace'],
      ['Ghost', 'Ghost'], ['Hugo', 'Hugo'], ['Jekyll', 'Jekyll'],
      ['Webflow', 'Webflow'], ['Framer', 'Framer'],
    ];
    for (const [keyword, name] of cmsMap) {
      if (content.includes(keyword)) { result.cms = name; break; }
    }
  }

  if (win.Shopify || document.querySelector('link[href*="cdn.shopify.com"]')) {
    result.cms = result.cms || 'Shopify';
  }
  if (html.includes('data-wf-site') || document.querySelector('html.w-mod-js')) {
    result.cms = result.cms || 'Webflow';
  }

  // ====== CDN detection ======
  const cdnSet = new Set();
  const cdnPatterns = [
    [/cloudflare/i, 'Cloudflare'],
    [/cloudfront\.net/i, 'CloudFront'],
    [/fastly/i, 'Fastly'],
    [/akamai/i, 'Akamai'],
    [/cdn\.jsdelivr\.net/i, 'jsDelivr'],
    [/cdnjs\.cloudflare\.com/i, 'cdnjs'],
    [/unpkg\.com/i, 'unpkg'],
    [/googleapis\.com/i, 'Google CDN'],
    [/gstatic\.com/i, 'Google Static'],
    [/bootstrapcdn\.com/i, 'BootstrapCDN'],
    [/pstatic\.net/i, 'Naver pstatic'],
    [/githubassets\.com/i, 'GitHub Assets'],
    [/vercel/i, 'Vercel'],
    [/netlify/i, 'Netlify'],
    [/amazonaws\.com/i, 'AWS S3'],
    [/azureedge\.net/i, 'Azure CDN'],
    [/ctfassets\.net/i, 'Contentful'],
  ];

  for (const src of allSources) {
    for (const [pattern, name] of cdnPatterns) {
      if (pattern.test(src)) cdnSet.add(name);
    }
  }
  result.cdn = [...cdnSet];

  // ====== Analytics detection ======
  if (win.gtag || win.ga || win.dataLayer ||
      document.querySelector('script[src*="googletagmanager"]') ||
      document.querySelector('script[src*="google-analytics"]') ||
      document.querySelector('script[src*="gtag/js"]')) {
    result.analytics.push('Google Analytics');
  }
  if (win.fbq || document.querySelector('script[src*="facebook"]') || document.querySelector('script[src*="fbevents"]')) {
    result.analytics.push('Facebook Pixel');
  }
  if (win.hj || document.querySelector('script[src*="hotjar"]')) result.analytics.push('Hotjar');
  if (document.querySelector('script[src*="plausible"]')) result.analytics.push('Plausible');
  if (document.querySelector('script[src*="segment"]') || (win.analytics && win.analytics.identify)) result.analytics.push('Segment');
  if (document.querySelector('script[src*="mixpanel"]')) result.analytics.push('Mixpanel');
  if (document.querySelector('script[src*="clarity"]')) result.analytics.push('Microsoft Clarity');
  if (document.querySelector('script[src*="amplitude"]') || win.amplitude) result.analytics.push('Amplitude');
  if (document.querySelector('script[src*="sentry"]') || win.Sentry) result.analytics.push('Sentry');
  if (document.querySelector('script[src*="datadog"]') || win.DD_RUM) result.analytics.push('Datadog RUM');

  // ====== Server detection from meta ======
  const poweredBy = document.querySelector('meta[name="x-powered-by"]');
  if (poweredBy) result.server = poweredBy.getAttribute('content');

  return JSON.stringify(result);
})()
