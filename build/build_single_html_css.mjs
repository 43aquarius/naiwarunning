#!/usr/bin/env node
/* 单 HTML 版 CSS 编译：用 @tailwindcss/postcss 编译 globals.css。
 * Tailwind v4 自动扫描 git 根下的源文件，GameShell/NaiwaPet 的类都会收进来。 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';

const INPUT = '/home/z/my-project/src/app/globals.css';
const OUTPUT = '/home/z/my-project/build-single/game.css';

const css = await readFile(INPUT, 'utf8');
const result = await postcss([tailwindcss()]).process(css, { from: INPUT, to: OUTPUT });

/* 单 HTML 无 next/font，补齐字体变量回退 + 基础设定 */
const extra = `
:root {
  --font-geist-sans: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  --font-geist-mono: ui-monospace, 'SF Mono', Menlo, Consolas, 'Noto Sans Mono', monospace;
}
html, body { height: 100%; margin: 0; }
#root { height: 100%; }
`;

await mkdir('/home/z/my-project/build-single', { recursive: true });
await writeFile(OUTPUT, result.css + extra, 'utf8');
console.log('CSS 编译完成:', OUTPUT, (result.css.length / 1024).toFixed(1) + 'KB');
