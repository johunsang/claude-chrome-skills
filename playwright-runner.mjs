#!/usr/bin/env node
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const analyzersDir = join(__dirname, 'analyzers');

// --- CLI args parsing ---
const args = process.argv.slice(2);
const flags = {};
const positional = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--only') { flags.only = args[++i]; }
  else if (args[i] === '--screenshot') { flags.screenshot = args[++i]; }
  else if (args[i] === '--viewports') { flags.viewports = args[++i]; }
  else if (args[i] === '--eval') { flags.evalCode = args[++i]; }
  else if (args[i] === '--eval-file') { flags.evalFile = args[++i]; }
  else { positional.push(args[i]); }
}

const url = positional[0];
if (!url) {
  console.error(`Usage: node playwright-runner.mjs <url> [options]

Options:
  --only <names>          Run specific analyzers (comma-separated)
                          Names: techStack,css,seo,accessibility,designTokens,performance
  --screenshot <path>     Save screenshot to path
  --viewports <specs>     Multi-viewport screenshots (e.g. "320x568,768x1024,1920x1080")
  --eval <js-code>        Execute custom JavaScript and include result
  --eval-file <path>      Execute JavaScript from file and include result

Examples:
  node playwright-runner.mjs https://example.com
  node playwright-runner.mjs https://example.com --only techStack,css
  node playwright-runner.mjs https://example.com --screenshot shot.png
  node playwright-runner.mjs https://example.com --viewports "320x568,768x1024,1920x1080" --screenshot shots/
  node playwright-runner.mjs https://example.com --eval "document.title"
`);
  process.exit(1);
}

const targetUrl = url.startsWith('http') ? url : `https://${url}`;

const ALL_ANALYZERS = [
  { name: 'techStack', file: 'tech-detector.js' },
  { name: 'css', file: 'css-analyzer.js' },
  { name: 'seo', file: 'seo-analyzer.js' },
  { name: 'accessibility', file: 'accessibility-analyzer.js' },
  { name: 'designTokens', file: 'design-token-analyzer.js' },
  { name: 'performance', file: 'performance-analyzer.js' },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    console.error(`[pw] Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    console.error(`[pw] Page loaded.`);

    const results = {};

    // --- Analyzers ---
    const selectedNames = flags.only ? flags.only.split(',').map(s => s.trim()) : null;
    const analyzers = selectedNames
      ? ALL_ANALYZERS.filter(a => selectedNames.includes(a.name))
      : ALL_ANALYZERS;

    for (const { name, file } of analyzers) {
      try {
        const script = readFileSync(join(analyzersDir, file), 'utf-8');
        const json = await page.evaluate(script);
        results[name] = JSON.parse(json);
        console.error(`[pw] ${name}: OK`);
      } catch (err) {
        console.error(`[pw] ${name}: FAILED - ${err.message}`);
        results[name] = null;
      }
    }

    // --- Custom eval ---
    if (flags.evalCode) {
      try {
        const evalResult = await page.evaluate(flags.evalCode);
        results._eval = typeof evalResult === 'string' ? JSON.parse(evalResult) : evalResult;
        console.error(`[pw] eval: OK`);
      } catch (err) {
        console.error(`[pw] eval: FAILED - ${err.message}`);
        results._eval = null;
      }
    }

    if (flags.evalFile) {
      try {
        const code = readFileSync(flags.evalFile, 'utf-8');
        const evalResult = await page.evaluate(code);
        results._eval = typeof evalResult === 'string' ? JSON.parse(evalResult) : evalResult;
        console.error(`[pw] eval-file: OK`);
      } catch (err) {
        console.error(`[pw] eval-file: FAILED - ${err.message}`);
        results._eval = null;
      }
    }

    // --- Screenshot ---
    if (flags.screenshot && !flags.viewports) {
      await page.screenshot({ path: flags.screenshot, fullPage: false });
      console.error(`[pw] screenshot: ${flags.screenshot}`);
    }

    // --- Multi-viewport screenshots ---
    if (flags.viewports) {
      const specs = flags.viewports.split(',').map(s => {
        const [w, h] = s.trim().split('x').map(Number);
        return { width: w, height: h };
      });
      const screenshotDir = flags.screenshot || 'screenshots';
      mkdirSync(screenshotDir, { recursive: true });

      const viewportResults = [];
      for (const vp of specs) {
        await page.setViewportSize(vp);
        await page.waitForTimeout(1000);
        const filename = join(screenshotDir, `${vp.width}x${vp.height}.png`);
        await page.screenshot({ path: filename, fullPage: false });

        // Collect layout info at this viewport
        const layoutInfo = await page.evaluate(() => {
          const body = document.body;
          return JSON.stringify({
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            bodyScrollWidth: body.scrollWidth,
            hasHorizontalScroll: body.scrollWidth > window.innerWidth,
            navVisible: !!document.querySelector('nav:not([style*="display: none"])'),
          });
        });

        viewportResults.push({ ...vp, filename, layout: JSON.parse(layoutInfo) });
        console.error(`[pw] viewport ${vp.width}x${vp.height}: OK`);
      }
      results._viewports = viewportResults;
    }

    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error(`[pw] Navigation failed: ${err.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
