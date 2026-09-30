import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, 'bee3ly-investor-brief-ar.html');
const pdfPath = join(__dirname, 'bee3ly-investor-brief-ar.pdf');

const puppeteer = await import('puppeteer');

const browser = await puppeteer.default.launch({
  headless: true,
  args: ['--font-render-hinting=none'],
});
const page = await browser.newPage();
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle0' });
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '16mm', right: '14mm', bottom: '18mm', left: '14mm' },
});
await browser.close();
console.log('Wrote', pdfPath);
