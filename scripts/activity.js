// Genera assets/activity-{dark,light}.svg con datos reales de GitHub (GraphQL).
// Uso: GITHUB_TOKEN=... node activity.js ../assets [usuario]
//      node activity.js ../assets --mock      (datos de prueba, solo para revisar el diseño)
const fs = require('fs');
const path = require('path');
const OUT = path.resolve(process.argv[2] || 'out/assets');
const MOCK = process.argv.includes('--mock');
const LOGIN = process.argv.slice(3).find((a) => !a.startsWith('--')) || process.env.GH_USER || 'Israelfas';
const g = require('./gen.js');
const { Doc, THEMES, measure, r, svg, baseCSS, licon } = g;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmtDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MESES[m - 1]} ${y}`; };

async function fetchData() {
  const token = process.env.PERFIL_TOKEN || process.env.GITHUB_TOKEN; // PERFIL_TOKEN (PAT) incluye contribuciones privadas
  if (!token) throw new Error('Falta GITHUB_TOKEN');
  const query = `query($login:String!){ user(login:$login){
    repositories(ownerAffiliations:OWNER, isFork:false, privacy:PUBLIC, first:100){ totalCount nodes{ name stargazerCount
      languages(first:10, orderBy:{field:SIZE, direction:DESC}){ edges{ size node{ name color } } } } }
    contributionsCollection{ totalCommitContributions totalPullRequestContributions totalPullRequestReviewContributions totalIssueContributions restrictedContributionsCount
      contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount contributionLevel weekday } } } } } }`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'perfil-activity' },
    body: JSON.stringify({ query, variables: { login: LOGIN } }),
  });
  const json = await res.json();
  if (json.errors || !json.data?.user) throw new Error(JSON.stringify(json.errors || json));
  return json.data.user;
}

function mockData() {
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const weeks = []; const end = new Date('2026-10-17T12:00:00Z'); const start = new Date(end); start.setUTCDate(start.getUTCDate() - 364 - start.getUTCDay());
  const d = new Date(start); let wk = [];
  const LV = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];
  while (d <= end) {
    const busy = d.getUTCMonth() >= 3 ? 0.55 : 0.2; const c = rnd() < busy ? Math.ceil(rnd() ** 2 * 12) : 0;
    wk.push({ date: d.toISOString().slice(0, 10), contributionCount: c, contributionLevel: LV[c === 0 ? 0 : Math.min(4, Math.ceil(c / 3))], weekday: d.getUTCDay() });
    if (d.getUTCDay() === 6) { weeks.push({ contributionDays: wk }); wk = []; }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  if (wk.length) weeks.push({ contributionDays: wk });
  const total = weeks.flatMap((w) => w.contributionDays).reduce((a, b) => a + b.contributionCount, 0);
  return {
    repositories: { totalCount: 18, nodes: [
      { name: 'a', stargazerCount: 2, languages: { edges: [{ size: 90000, node: { name: 'TypeScript', color: '#3178c6' } }, { size: 8000, node: { name: 'CSS', color: '#663399' } }] } },
      { name: 'b', stargazerCount: 1, languages: { edges: [{ size: 30000, node: { name: 'JavaScript', color: '#f1e05a' } }, { size: 20000, node: { name: 'HTML', color: '#e34c26' } }] } },
      { name: 'c', stargazerCount: 0, languages: { edges: [{ size: 12000, node: { name: 'Python', color: '#3572A5' } }, { size: 4000, node: { name: 'Dart', color: '#00B4AB' } }] } },
    ] },
    contributionsCollection: { totalCommitContributions: 300, totalPullRequestContributions: 14, totalPullRequestReviewContributions: 3, totalIssueContributions: 2, restrictedContributionsCount: 120, contributionCalendar: { totalContributions: total, weeks } },
  };
}

function analyze(u) {
  const cal = u.contributionsCollection.contributionCalendar;
  const days = cal.weeks.flatMap((w) => w.contributionDays);
  const today = days[days.length - 1];
  // racha actual (si hoy va en 0, se cuenta desde ayer)
  let i = days.length - 1; if (days[i].contributionCount === 0) i--;
  let cur = 0; while (i >= 0 && days[i].contributionCount > 0) { cur++; i--; }
  let best = 0, run = 0; for (const d of days) { run = d.contributionCount > 0 ? run + 1 : 0; best = Math.max(best, run); }
  const top = days.reduce((a, b) => (b.contributionCount > a.contributionCount ? b : a), days[0]);
  const weekday = [0, 0, 0, 0, 0, 0, 0]; for (const d of days) weekday[d.weekday] += d.contributionCount;
  const active = days.filter((d) => d.contributionCount > 0).length;
  // lenguajes (repos públicos propios, sin el repo del perfil)
  const langs = {};
  for (const repo of u.repositories.nodes) {
    if (repo.name.toLowerCase() === LOGIN.toLowerCase()) continue;
    for (const e of repo.languages.edges) { (langs[e.node.name] ||= { size: 0, color: e.node.color || '#8b8b8b' }).size += e.size; }
  }
  const totalSize = Object.values(langs).reduce((a, b) => a + b.size, 0) || 1;
  let langList = Object.entries(langs).map(([name, v]) => ({ name, color: v.color, pct: v.size / totalSize })).sort((a, b) => b.pct - a.pct);
  if (langList.length > 6) { const rest = langList.slice(5).reduce((a, b) => a + b.pct, 0); langList = [...langList.slice(0, 5), { name: 'Otros', color: '#6E6690', pct: rest }]; }
  return {
    months: (() => { const m = {}; for (const d of days) { const k = d.date.slice(0, 7); m[k] = (m[k] || 0) + d.contributionCount; } return Object.entries(m).slice(-12).map(([k, v]) => ({ k, v })); })(),
    weeks: cal.weeks, total: cal.totalContributions, cur, best, top, weekday, active, days: days.length, today: today.date,
    commits: u.contributionsCollection.totalCommitContributions + u.contributionsCollection.restrictedContributionsCount,
    prs: u.contributionsCollection.totalPullRequestContributions,
    repos: u.repositories.totalCount, stars: u.repositories.nodes.reduce((a, b) => a + b.stargazerCount, 0), langList,
  };
}

// 800 de ancho como el resto de tarjetas con texto (legible en el móvil)
function render(mode, a) {
  const th = THEMES[mode]; const d = new Doc(); const W = 800, H = 900, P = 36;
  const LV = mode === 'dark'
    ? { NONE: '#1D1735', FIRST_QUARTILE: '#3B2A6B', SECOND_QUARTILE: '#5B3FA8', THIRD_QUARTILE: '#8B5CF6', FOURTH_QUARTILE: '#D8B4FE' }
    : { NONE: '#F1EEF9', FIRST_QUARTILE: '#DDD6FE', SECOND_QUARTILE: '#A78BFA', THIRD_QUARTILE: '#7C3AED', FOURTH_QUARTILE: '#4C1D95' };
  let b = '';
  // fondo
  b += `<defs><clipPath id="cc"><rect width="${W}" height="${H}" rx="20"/></clipPath>
<radialGradient id="ag" cx="0.08" cy="0" r="0.7"><stop offset="0" stop-color="${th.teal}" stop-opacity="${mode === 'dark' ? 0.18 : 0.08}"/><stop offset="1" stop-color="${th.teal}" stop-opacity="0"/></radialGradient>
<radialGradient id="ag2" cx="1" cy="1" r="0.6"><stop offset="0" stop-color="${th.sky}" stop-opacity="${mode === 'dark' ? 0.12 : 0.06}"/><stop offset="1" stop-color="${th.sky}" stop-opacity="0"/></radialGradient>
<linearGradient id="sweep" x1="0" x2="1"><stop offset="0" stop-color="${th.sky}" stop-opacity="0"/><stop offset=".5" stop-color="${th.sky}" stop-opacity="${mode === 'dark' ? 0.16 : 0.1}"/><stop offset="1" stop-color="${th.sky}" stop-opacity="0"/></linearGradient>
<linearGradient id="kv" x1="0" x2="1"><stop offset="0" stop-color="${th.text}"/><stop offset="1" stop-color="${th.teal}"/></linearGradient></defs>
<g clip-path="url(#cc)"><rect width="${W}" height="${H}" fill="${th.surface}"/><rect width="${W}" height="${H}" fill="url(#ag)"/><rect width="${W}" height="${H}" fill="url(#ag2)"/></g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="20" fill="none" stroke="${th.border}"/>`;
  // cabecera
  b += licon('activity', P, 30, 24, th.teal);
  b += d.text('d7', 'Últimos 12 meses', P + 34, 51, 27, th.text, 'letter-spacing="-0.4"');
  const upd = `actualizado ${fmtDate(a.today)}`;
  const updX = W - P - measure('m4', upd, 15) - 16;
  b += `<circle cx="${r(updX)}" cy="45" r="4.5" fill="${th.teal}"/>${g.ring(updX, 45, th.teal)}`;
  b += d.text('m4', upd, W - P, 50, 15, th.dim, 'text-anchor="end"');

  // KPIs en 2×2
  const kpis = [
    { label: 'CONTRIBUCIONES', value: a.total.toLocaleString('es-EC'), sub: `${a.active} días activos`, c: th.teal, icon: 'git-commit-horizontal' },
    { label: 'RACHA ACTUAL', value: `${a.cur}`, unit: a.cur === 1 ? 'día' : 'días', sub: a.cur ? 'y contando' : 'hoy se retoma', c: th.sky, icon: 'flame' },
    { label: 'RACHA MÁS LARGA', value: `${a.best}`, unit: a.best === 1 ? 'día' : 'días', sub: 'en el último año', c: th.coral, icon: 'trophy' },
    { label: 'MEJOR DÍA', value: `${a.top.contributionCount}`, unit: 'aportes', sub: fmtDate(a.top.date), c: th.amber, icon: 'calendar-check' },
  ];
  const kw = (W - P * 2 - 16) / 2, kh = 112;
  kpis.forEach((k, i) => {
    const x = P + (i % 2) * (kw + 16), ky = 82 + Math.floor(i / 2) * (kh + 16);
    b += `<rect x="${r(x)}" y="${ky}" width="${r(kw)}" height="${kh}" rx="14" fill="${th.surface2}" stroke="${th.border}"/>`;
    b += `<rect x="${r(x)}" y="${ky + 24}" width="3" height="24" rx="1.5" fill="${k.c}"/>`;
    b += d.text('m6', k.label, x + 20, ky + 42, 14, th.dim, 'letter-spacing="1.5"');
    b += licon(k.icon, x + kw - 44, ky + 22, 22, k.c);
    b += d.text('d8', k.value, x + 20, ky + 94, 44, th.text, 'letter-spacing="-1"');
    const vw = measure('d8', k.value, 44, -1);
    if (k.unit) b += d.text('d5', k.unit, x + 27 + vw, ky + 94, 19, th.muted);
    b += d.text('m4', k.sub, x + kw - 20, ky + 94, 15, th.dim, 'text-anchor="end"');
  });

  // Contribuciones por mes
  const cy0 = 362, cTop = 404, cBase = 540, cH = cBase - cTop;
  b += d.text('m6', 'CONTRIBUCIONES POR MES', P, cy0, 14, th.dim, 'letter-spacing="1.5"');
  b += d.text('m4', `${a.commits} commits · ${a.prs} PRs · ${a.repos} repos públicos`, W - P, cy0, 15, th.muted, 'text-anchor="end"');
  const mmax = Math.max(...a.months.map((m) => m.v), 1);
  const nice = Math.ceil(mmax / 10) * 10 || 10;
  for (let k = 0; k <= 2; k++) {
    const y = cBase - (cH * k) / 2;
    b += `<path d="M${P + 34} ${r(y)}H${W - P}" stroke="${th.border}" ${k ? 'stroke-dasharray="3 5"' : ''}/>`;
    b += d.text('m4', String(Math.round((nice * k) / 2)), P + 24, y + 5, 14, th.dim, 'text-anchor="end"');
  }
  b += `<defs><linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${th.sky}"/><stop offset="1" stop-color="${th.teal}" stop-opacity=".55"/></linearGradient>
<linearGradient id="barM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mode === 'dark' ? '#F5D0FE' : th.sky}"/><stop offset="1" stop-color="${th.sky}"/></linearGradient></defs>`;
  const slot = (W - P * 2 - 40) / a.months.length, mbw = 34;
  const maxK = a.months.reduce((x, m) => (m.v > x.v ? m : x), a.months[0]).k;
  const pts = [];
  a.months.forEach((m, i) => {
    const h = Math.max(3, (m.v / nice) * cH); const x = P + 40 + i * slot + (slot - mbw) / 2;
    const isMax = m.k === maxK, isNow = i === a.months.length - 1;
    b += `<rect x="${r(x)}" y="${r(cBase - h)}" width="${mbw}" height="${r(h)}" rx="8" fill="url(#${isMax ? 'barM' : 'bar'})" opacity="${isMax ? 1 : 0.8}"/>`;
    if (isNow) b += `<rect x="${r(x - 3)}" y="${r(cBase - h - 3)}" width="${mbw + 6}" height="${r(h + 6)}" rx="10" fill="none" stroke="${th.sky}" stroke-width="1.5" stroke-dasharray="4 4"><animate attributeName="stroke-dashoffset" values="0;16" dur="1.2s" repeatCount="indefinite"/></rect>`;
    b += d.text(isMax ? 'm7' : 'm4', String(m.v), x + mbw / 2, cBase - h - 10, 15, isMax ? th.text : th.muted, 'text-anchor="middle"');
    const mi = Number(m.k.slice(5)) - 1;
    b += d.text('m4', MESES[mi], x + mbw / 2, cBase + 25, 15, isMax ? th.sky : th.dim, 'text-anchor="middle"');
    pts.push([x + mbw / 2, cBase - h]);
  });
  b += `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + r(p[0]) + ' ' + r(p[1])).join(' ')}" fill="none" stroke="${th.text}" stroke-opacity=".25" stroke-width="1.5" stroke-dasharray="2 4"/>`;
  b += `<rect x="${P}" y="${cTop - 20}" width="140" height="${cH + 20}" fill="url(#sweep)"><animate attributeName="x" values="${P - 140};${W - P}" dur="7s" repeatCount="indefinite"/></rect>`;

  // Paneles inferiores: lenguajes y ritmo semanal, lado a lado
  const py = cBase + 56, ph = H - py - P, pw = (W - P * 2 - 16) / 2;
  b += `<rect x="${P}" y="${py}" width="${r(pw)}" height="${ph}" rx="14" fill="${th.surface2}" stroke="${th.border}"/>`;
  b += d.text('m6', 'LENGUAJES', P + 20, py + 34, 14, th.dim, 'letter-spacing="1.5"');
  const bx = P + 20, bw = pw - 40, by = py + 50;
  b += `<clipPath id="lb"><rect x="${bx}" y="${by}" width="${r(bw)}" height="12" rx="6"/></clipPath><g clip-path="url(#lb)">`;
  let acc = 0;
  a.langList.forEach((l) => { const w = l.pct * bw; b += `<rect x="${r(bx + acc)}" y="${by}" width="${r(Math.max(w - 2, 0))}" height="12" fill="${l.color}"/>`; acc += w; });
  b += '</g>';
  a.langList.forEach((l, i) => {
    const y = by + 46 + i * 31;
    b += `<circle cx="${r(bx + 6)}" cy="${y - 6}" r="6" fill="${l.color}"/>`;
    b += d.text('d5', l.name, bx + 22, y, 18, th.text);
    b += d.text('m4', `${(l.pct * 100).toFixed(1)}%`, bx + bw, y, 15, th.dim, 'text-anchor="end"');
  });

  const rx = P + pw + 16, rw = pw;
  b += `<rect x="${r(rx)}" y="${py}" width="${r(rw)}" height="${ph}" rx="14" fill="${th.surface2}" stroke="${th.border}"/>`;
  b += d.text('m6', 'RITMO SEMANAL', rx + 20, py + 34, 14, th.dim, 'letter-spacing="1.5"');
  const order = [1, 2, 3, 4, 5, 6, 0]; const labels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const mx = Math.max(...a.weekday, 1); const maxIdx = a.weekday.indexOf(mx);
  const barArea = rw - 40, bwid = 28, bstep = barArea / 7; const baseY = py + ph - 38, maxH = ph - 118;
  order.forEach((wd, i) => {
    const h = Math.max(4, (a.weekday[wd] / mx) * maxH); const x = rx + 20 + i * bstep + (bstep - bwid) / 2;
    const c = wd === maxIdx ? th.sky : th.teal;
    b += `<rect x="${r(x)}" y="${r(baseY - maxH)}" width="${bwid}" height="${r(maxH)}" rx="8" fill="${th.border}" opacity=".45"/>`;
    b += `<rect x="${r(x)}" y="${r(baseY - h)}" width="${bwid}" height="${r(h)}" rx="8" fill="${c}" opacity="${wd === maxIdx ? 1 : 0.75}"/>`;
    b += d.text('m6', labels[i], x + bwid / 2, baseY + 24, 15, wd === maxIdx ? th.sky : th.dim, 'text-anchor="middle"');
  });
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  b += d.text('m4', `más activo: ${DIAS[maxIdx]}`, rx + 20, py + 60, 15, th.muted);

  return svg(d, W, H, b, baseCSS, `Actividad en GitHub: ${a.total} contribuciones en el último año, racha actual de ${a.cur} días, racha más larga de ${a.best} días.`);
}

function placeholder(mode) {
  const th = THEMES[mode]; const d = new Doc(); const W = 800, H = 200;
  const b = `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="20" fill="${th.surface}" stroke="${th.border}"/>
${licon('loader', W / 2 - 16, 46, 32, th.teal)}
${d.text('d6', 'Generando tu actividad…', W / 2, 120, 28, th.text, 'text-anchor="middle"')}
${d.text('m4', 'se actualiza sola cada día con GitHub Actions', W / 2, 154, 16, th.dim, 'text-anchor="middle"')}`;
  return svg(d, W, H, b, baseCSS, 'Generando actividad');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  if (process.argv.includes('--placeholder')) { for (const m of ['dark', 'light']) fs.writeFileSync(path.join(OUT, `activity-${m}.svg`), placeholder(m)); return; }
  const data = MOCK ? mockData() : await fetchData();
  const a = analyze(data);
  for (const m of ['dark', 'light']) fs.writeFileSync(path.join(OUT, `activity-${m}.svg`), render(m, a));
  console.log(`activity listo: ${a.total} contribuciones, racha ${a.cur}/${a.best}`);
})().catch((e) => { console.error(e); process.exit(1); });
