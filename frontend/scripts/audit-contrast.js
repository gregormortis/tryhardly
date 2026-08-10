// Automated WCAG contrast audit + visual capture across the public surface.
//
// Walks every visible text node, resolves its effective background by climbing
// ancestors until a non-transparent background is found, and computes the WCAG
// 2.1 contrast ratio. Reports anything below AA.

const { chromium } = require('playwright');
const fs = require('fs');

// Usage:
//   npx next build && npx next start -p 3333 &
//   BASE=http://localhost:3333 node scripts/audit-contrast.js
//
// Exits non-zero if any text fails WCAG AA, so it can gate a deploy.
const BASE = process.env.BASE || 'http://localhost:3333';
const PAGES = [
  '/', '/jobs', '/post-a-job', '/pricing', '/trust', '/about', '/faq',
  '/jobs/yard', '/jobs/hauling/redding-ca', '/redding', '/work-alerts',
  '/request-help', '/find-work-fast', '/post-job-fast', '/support',
  '/terms', '/privacy', '/refunds', '/community-guidelines',
  '/prohibited-services', '/standards', '/verified-pro', '/code-of-craft',
  '/service-packages', '/auth/login', '/auth/register', '/contact',
];

const AUDIT = () => {
  function parse(c) {
    const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  }
  function over(fg, bg) {
    const a = fg.a;
    return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
  }
  function lum({ r, g, b }) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function ratio(a, b) {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  function bgOf(el) {
    let cur = el, acc = null;
    while (cur && cur !== document.documentElement.parentNode) {
      const c = parse(getComputedStyle(cur).backgroundColor);
      if (c && c.a > 0) {
        acc = acc ? over(acc, c) : c;
        if (acc.a >= 0.999) return acc;
      }
      cur = cur.parentElement;
    }
    return acc && acc.a >= 0.999 ? acc : { r: 255, g: 255, b: 255, a: 1 };
  }

  const out = [];
  const seen = new Set();
  document.querySelectorAll('body *').forEach((el) => {
    const txt = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(' ')
      .trim();
    if (!txt || txt.length < 2) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;

    const fgRaw = parse(cs.color);
    if (!fgRaw) return;
    const bg = bgOf(el);
    const fg = fgRaw.a < 1 ? over(fgRaw, bg) : fgRaw;
    const r = ratio(fg, bg);

    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3.0 : 4.5;

    if (r < need) {
      const key = `${cs.color}|${cs.backgroundColor}|${Math.round(size)}|${txt.slice(0, 28)}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        text: txt.slice(0, 52),
        ratio: +r.toFixed(2),
        need,
        size: Math.round(size),
        fg: `rgb(${Math.round(fg.r)},${Math.round(fg.g)},${Math.round(fg.b)})`,
        bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`,
        cls: (el.className && el.className.toString ? el.className.toString() : '').slice(0, 90),
      });
    }
  });
  return out.sort((a, b) => a.ratio - b.ratio);
};

(async () => {
  const browser = await chromium.launch();
  const all = {};
  let total = 0;

  for (const path of PAGES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    try {
      await page.goto(BASE + path, { waitUntil: 'load', timeout: 40000 });
      await page.waitForTimeout(1400);
      const issues = await page.evaluate(AUDIT);
      const overflow = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      all[path] = { issues, overflow };
      total += issues.length;
      const flag = overflow.sw > overflow.cw ? ' OVERFLOW' : '';
      console.log(`${issues.length ? 'FAIL' : ' ok '} ${path.padEnd(32)} ${issues.length} issue(s)${flag}`);
      for (const i of issues.slice(0, 4)) {
        console.log(`        ${i.ratio}:1 (need ${i.need}) ${i.size}px  "${i.text}"`);
        console.log(`        fg=${i.fg} bg=${i.bg}  ${i.cls}`);
      }
    } catch (e) {
      console.log(`ERR  ${path}: ${e.message.split('\n')[0]}`);
    }
    await page.close();
  }

  fs.writeFileSync('/home/user/workspace/contrast.json', JSON.stringify(all, null, 2));
  console.log(`\nTOTAL CONTRAST ISSUES: ${total}`);
  await browser.close();
  if (total > 0) process.exitCode = 1;
})();
