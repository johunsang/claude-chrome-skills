#!/usr/bin/env node
import { cpSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const targetDir = process.cwd();

const dirs = [
  { src: '.claude/commands', dest: '.claude/commands' },
  { src: 'analyzers', dest: 'analyzers' },
];

const files = [
  { src: 'playwright-runner.mjs', dest: 'playwright-runner.mjs' },
];

console.log('🔧 Claude Chrome Skills 설치\n');

// Copy directories
for (const { src, dest } of dirs) {
  const srcPath = join(__dirname, src);
  const destPath = join(targetDir, dest);

  if (!existsSync(srcPath)) {
    console.log(`⚠️  소스 없음: ${src}`);
    continue;
  }

  mkdirSync(dirname(destPath), { recursive: true });
  cpSync(srcPath, destPath, { recursive: true });
  console.log(`✅ ${dest}/`);
}

// Copy files
for (const { src, dest } of files) {
  const srcPath = join(__dirname, src);
  const destPath = join(targetDir, dest);

  if (!existsSync(srcPath)) {
    console.log(`⚠️  소스 없음: ${src}`);
    continue;
  }

  cpSync(srcPath, destPath);
  console.log(`✅ ${dest}`);
}

console.log(`
✨ 설치 완료!

사용법:
  Claude Code에서 슬래시 커맨드로 실행하세요:
    /analyze <url>        종합 분석
    /perf <url>           성능 분석
    /security-scan <url>  보안 스캔
    /check-seo <url>      SEO 점검
    /audit-a11y <url>     접근성 감사
    /tech-detect <url>    기술스택 탐지
    ... 외 10개 커맨드

Playwright 폴백 설치 (선택):
  pnpm add playwright && npx playwright install chromium
`);
