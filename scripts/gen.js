// Generador de assets SVG para el README de perfil de Israelfas
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const fontkit = require('fontkit');
const si = require('simple-icons');

const OUT = path.resolve(process.argv[2] || 'out/assets');
fs.mkdirSync(OUT, { recursive: true });

// ---------- Fuentes ----------
const FD = 'node_modules/@fontsource';
const FONTS = {
  d4: { fam: 'BG', w: 400, file: `${FD}/bricolage-grotesque/files/bricolage-grotesque-latin-400-normal.woff2` },
  d5: { fam: 'BG', w: 500, file: `${FD}/bricolage-grotesque/files/bricolage-grotesque-latin-500-normal.woff2` },
  d6: { fam: 'BG', w: 600, file: `${FD}/bricolage-grotesque/files/bricolage-grotesque-latin-600-normal.woff2` },
  d7: { fam: 'BG', w: 700, file: `${FD}/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff2` },
  d8: { fam: 'BG', w: 800, file: `${FD}/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff2` },
  m4: { fam: 'JB', w: 400, file: `${FD}/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2` },
  m6: { fam: 'JB', w: 600, file: `${FD}/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff2` },
  m7: { fam: 'JB', w: 700, file: `${FD}/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2` },
};
const fk = {};
for (const k in FONTS) fk[k] = fontkit.openSync(FONTS[k].file);
const measure = (f, text, size, ls = 0) =>
  (fk[f].layout(text).advanceWidth / fk[f].unitsPerEm) * size + ls * Math.max(0, [...text].length - 1);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Cada SVG registra el texto que usa para subsetear la fuente embebida
class Doc {
  constructor() { this.used = {}; }
  t(f, s) { (this.used[f] ||= new Set()); for (const c of String(s)) this.used[f].add(c); return esc(s); }
  // <text> helper
  text(f, s, x, y, size, fill, extra = '') {
    const fo = FONTS[f];
    return `<text x="${r(x)}" y="${r(y)}" font-family="${fo.fam}" font-weight="${fo.w}" font-size="${size}" fill="${fill}" ${extra}>${this.t(f, s)}</text>`;
  }
  fontCSS() {
    let css = '';
    for (const f in this.used) {
      const chars = [...this.used[f], ' '].join('');
      const tmpTxt = path.join(os.tmpdir(), `chars-${f}.txt`);
      const tmpOut = path.join(os.tmpdir(), `sub-${f}.woff2`);
      fs.writeFileSync(tmpTxt, chars);
      execFileSync('pyftsubset', [FONTS[f].file, `--text-file=${tmpTxt}`, '--flavor=woff2', `--output-file=${tmpOut}`, '--layout-features=*']);
      const b64 = fs.readFileSync(tmpOut).toString('base64');
      css += `@font-face{font-family:${FONTS[f].fam};font-weight:${FONTS[f].w};src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
    }
    return css;
  }
}
const r = (n) => Math.round(n * 100) / 100;

// ---------- Temas ----------
const THEMES = {
  // "teal" = color principal (violeta), "sky" = secundario (fucsia), "violet" = índigo de apoyo
  dark: {
    bg: '#0D0A1A', surface: '#130F24', surface2: '#1A1530', border: '#2A2342', border2: '#3A3058',
    text: '#ECE8F7', muted: '#A49CBF', dim: '#6E6690', grid: '#C4B5FD', gridOp: 0.07,
    teal: '#A78BFA', sky: '#E879F9', coral: '#FB7185', amber: '#FBBF24', violet: '#818CF8',
    kw: '#F0ABFC', prop: '#A5B4FC', str: '#F9A8D4', punc: '#6E6690', tint: 0.16,
  },
  light: {
    bg: '#FFFFFF', surface: '#FFFFFF', surface2: '#F7F5FD', border: '#E9E5F5', border2: '#D6CFEA',
    text: '#1E1433', muted: '#5B5275', dim: '#9C94B5', grid: '#4C1D95', gridOp: 0.06,
    teal: '#7C3AED', sky: '#C026D3', coral: '#E11D48', amber: '#D97706', violet: '#4F46E5',
    kw: '#A21CAF', prop: '#6D28D9', str: '#BE185D', punc: '#9C94B5', tint: 0.1,
  },
};

// ---------- Íconos ----------
const lucide = (name) => {
  const raw = fs.readFileSync(`node_modules/lucide-static/icons/${name}.svg`, 'utf8');
  return raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s+/g, ' ').trim();
};
const licon = (name, x, y, size, color, sw = 2) =>
  `<g transform="translate(${r(x)} ${r(y)}) scale(${r(size / 24)})" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${lucide(name)}</g>`;

const lum = (hex) => {
  const n = parseInt(hex, 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const brand = (key, th) => {
  const ic = si[key]; if (!ic) throw new Error('icon ' + key);
  const L = lum(ic.hex);
  let color = '#' + ic.hex;
  if (th === THEMES.dark && L < 0.06) color = th.text;      // marcas negras en tema oscuro
  if (th === THEMES.light && L > 0.75) color = th.text;      // marcas muy claras en tema claro
  return { path: ic.path, color };
};
const bicon = (key, x, y, size, th, override) => {
  const b = brand(key, th);
  return `<g transform="translate(${r(x)} ${r(y)}) scale(${r(size / 24)})"><path d="${b.path}" fill="${override || b.color}"/></g>`;
};

// ---------- Utilidades ----------
const ring = (x, y, c) => `<circle cx="${r(x)}" cy="${r(y)}" r="4" fill="none" stroke="${c}" stroke-width="2"><animate attributeName="r" values="4;13" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;0" dur="1.8s" repeatCount="indefinite"/></circle>`;
const wrap = (f, text, size, maxW) => {
  const words = text.split(' '); const lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (measure(f, t, size) > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
};
const fit = (f, text, size, maxW, min = 10) => { while (size > min && measure(f, text, size) > maxW) size -= 0.5; return size; };
const wavePath = (y, amp, len, width, height, phase = 0) => {
  let d = `M0 ${r(y + amp * Math.sin(phase))}`;
  for (let x = 10; x <= width; x += 10) d += ` L${x} ${r(y + amp * Math.sin((x / len) * Math.PI * 2 + phase))}`;
  return d + (height != null ? ` L${width} ${height} L0 ${height} Z` : '');
};

const svg = (doc, w, h, body, css = '', title = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><style>${doc.fontCSS()}${css}</style>${body}</svg>`;

const baseCSS = `
@keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes drift{from{transform:translateX(0)}to{transform:translateX(-1200px)}}
.up{animation:up .8s cubic-bezier(.2,.7,.2,1) both}
.blink{animation:blink 1.05s steps(1) infinite}
`;

// Solo el hero tiene animación de entrada: el resto debe verse completo desde el primer frame
const write = (name, content) => {
  if (!name.startsWith('hero')) content = content.replace(/ class="up"/g, '').replace(/ style="animation-delay:[^"]*"/g, '');
  fs.writeFileSync(path.join(OUT, name), content);
};

// ================= HERO =================
function hero(mode) {
  const th = THEMES[mode]; const d = new Doc(); const W = 1200, H = 440;
  const lx = 64;
  // Frases que se escriben
  const phrases = ['construyo APIs con NestJS y PostgreSQL', 'diseño bases de datos que aguantan', 'hago interfaces con Vue, React y Next.js', 'llevo ideas a producción'];
  const fs_ = 19, cw = 0.6 * fs_, slot = 5, T = slot * phrases.length;
  const px = lx + 28; const py = 300;
  const ev = [[0, 0]];
  phrases.forEach((p, i) => {
    const t0 = i * slot, n = [...p].length;
    for (let k = 0; k <= n; k++) ev.push([t0 + 0.25 + k * 0.055, k * cw]);
    const del = t0 + slot - 0.35 - n * 0.022;
    for (let k = n; k >= 0; k--) ev.push([del + (n - k) * 0.022, k * cw]);
  });
  ev.push([T, 0]);
  const kt = ev.map((e) => r(e[0] / T).toFixed(4)).join(';');
  const wv = ev.map((e) => r(e[1] + 0.5)).join(';');
  const xv = ev.map((e) => r(px + e[1] + 2)).join(';');
  const phraseEls = phrases.map((p, i) => {
    const a = i / phrases.length, b = (i + 1) / phrases.length;
    const keyTimes = i === 0 ? `0;${b.toFixed(4)};1` : `0;${a.toFixed(4)};${b.toFixed(4)};1`;
    const vals = i === 0 ? '1;0;0' : (i === phrases.length - 1 ? '0;1;1;1' : '0;1;0;0');
    return `<g opacity="${i === 0 ? 1 : 0}">${d.text('m4', p, px, py, fs_, th.text)}<animate attributeName="opacity" values="${vals}" keyTimes="${keyTimes}" dur="${T}s" calcMode="discrete" repeatCount="indefinite"/></g>`;
  }).join('');

  // Info chips
  let cx = lx; const chipY = 336; const chips = [];
  const chip = (icon, label, color, pulse) => {
    const tw = measure('d5', label, 15); const w = 42 + tw + 16;
    let s = `<g class="up" style="animation-delay:${0.9 + chips.length * 0.12}s"><rect x="${cx}" y="${chipY}" width="${r(w)}" height="38" rx="19" fill="${th.surface2}" stroke="${th.border2}"/>`;
    if (pulse) s += `${ring(cx + 22, chipY + 19, color)}<circle cx="${cx + 22}" cy="${chipY + 19}" r="4.5" fill="${color}"/>`;
    else s += licon(icon, cx + 13, chipY + 10, 18, color);
    s += d.text('d5', label, cx + 38, chipY + 24.5, 15, th.muted) + '</g>';
    chips.push(s); cx += w + 8;
  };
  chip('map-pin', 'Manta, Ecuador', th.coral);
  chip('graduation-cap', 'Ing. Software · ULEAM', th.sky);
  chip(null, 'Abierto a colaborar', th.teal, true);

  // Editor
  const ex = 724, ey = 64, ew = 412, eh = 312;
  const C = (c, s) => ({ c, s });
  const code = [
    [C('kw', 'const '), C('text', 'israel'), C('punc', ' = {')],
    [C('prop', '  rol'), C('punc', ': '), C('str', '"Full-Stack Dev"'), C('punc', ',')],
    [C('prop', '  base'), C('punc', ': '), C('str', '"Manta, EC"'), C('punc', ',')],
    [C('prop', '  backend'), C('punc', ': ['), C('str', '"NestJS"'), C('punc', ', '), C('str', '"Postgres"'), C('punc', '],')],
    [C('prop', '  frontend'), C('punc', ': ['), C('str', '"Vue"'), C('punc', ', '), C('str', '"Next.js"'), C('punc', '],')],
    [C('prop', '  movil'), C('punc', ': ['), C('str', '"RN"'), C('punc', ', '), C('str', '"Flutter"'), C('punc', '],')],
    [C('prop', '  ahora'), C('punc', ': '), C('str', '"KontaGo"'), C('punc', ',')],
    [C('punc', '};')],
    [],
    [C('kw', 'export default '), C('text', 'israel'), C('punc', ';')],
  ];
  const cfs = 15, ccw = 0.6 * cfs, lh = 24;
  let codeEls = '';
  code.forEach((line, i) => {
    const y = ey + 76 + i * lh;
    let x = ex + 56;
    let s = `<g class="up" style="animation-delay:${0.5 + i * 0.09}s">`;
    s += d.text('m4', String(i + 1).padStart(2, ' '), ex + 18, y, cfs, th.dim, 'opacity=".7" xml:space="preserve"');
    for (const tok of line) {
      const col = { kw: th.kw, prop: th.prop, str: th.str, punc: th.punc, text: th.text }[tok.c];
      s += `<text x="${r(x)}" y="${y}" font-family="JB" font-weight="400" font-size="${cfs}" fill="${col}" xml:space="preserve">${d.t('m4', tok.s)}</text>`;
      x += [...tok.s].length * ccw;
    }
    if (i === code.length - 1) s += `<rect class="blink" x="${r(x + 3)}" y="${y - 14}" width="9" height="18" fill="${th.teal}"/>`;
    codeEls += s + '</g>';
  });

  const waves = [
    { y: 392, a: 10, l: 300, op: mode === 'dark' ? 0.12 : 0.08, c: th.sky, dur: 26 },
    { y: 404, a: 8, l: 240, op: mode === 'dark' ? 0.16 : 0.1, c: th.teal, dur: 18 },
    { y: 418, a: 6, l: 400, op: mode === 'dark' ? 0.22 : 0.14, c: th.teal, dur: 34 },
  ].map((w) => `<g style="animation:drift ${w.dur}s linear infinite"><path d="${wavePath(w.y, w.a, w.l, 2400, H)}" fill="${w.c}" opacity="${w.op}"/></g>`).join('');

  const body = `
<defs>
  <clipPath id="clip"><rect width="${W}" height="${H}" rx="24"/></clipPath>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${th.grid}" stroke-opacity="${th.gridOp}"/></pattern>
  <radialGradient id="g1" cx="0.12" cy="0.1" r="0.6"><stop offset="0" stop-color="${th.teal}" stop-opacity="${mode === 'dark' ? 0.32 : 0.14}"/><stop offset="1" stop-color="${th.teal}" stop-opacity="0"/></radialGradient>
  <radialGradient id="g2" cx="0.92" cy="0.95" r="0.55"><stop offset="0" stop-color="${th.coral}" stop-opacity="${mode === 'dark' ? 0.16 : 0.08}"/><stop offset="1" stop-color="${th.coral}" stop-opacity="0"/></radialGradient>
  <linearGradient id="role" x1="0" x2="1"><stop offset="0" stop-color="${th.teal}"/><stop offset="1" stop-color="${th.sky}"/></linearGradient>
  <radialGradient id="gm" cx="0.25" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <mask id="gridmask"><rect width="${W}" height="${H}" fill="url(#gm)"/></mask>
  <clipPath id="type"><rect x="${px}" y="${py - 20}" width="0" height="28"><animate attributeName="width" values="${wv}" keyTimes="${kt}" dur="${T}s" calcMode="discrete" repeatCount="indefinite"/></rect></clipPath>
</defs>
<g clip-path="url(#clip)">
  <rect width="${W}" height="${H}" fill="${th.bg}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)" mask="url(#gridmask)"/>
  <rect width="${W}" height="${H}" fill="url(#g1)"/>
  <rect width="${W}" height="${H}" fill="url(#g2)"/>
  ${waves}
</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="24" fill="none" stroke="${th.border}"/>

<g class="up" style="animation-delay:.05s">
  ${d.text('m4', '~/manta-ec', lx, 92, 16, th.teal)}
  ${d.text('m4', '$ whoami', lx + measure('m4', '~/manta-ec ', 16), 92, 16, th.muted)}
  <rect class="blink" x="${r(lx + measure('m4', '~/manta-ec $ whoami ', 16))}" y="78" width="9" height="18" fill="${th.muted}"/>
</g>
<g class="up" style="animation-delay:.2s">${d.text('d8', 'Israel Mejía', lx - 3, 180, 80, th.text, 'letter-spacing="-2"')}</g>
<g class="up" style="animation-delay:.35s">${d.text('d6', 'Full-Stack Developer', lx, 234, 34, 'url(#role)', 'letter-spacing="-0.5"')}</g>
<g class="up" style="animation-delay:.6s">
  ${d.text('m7', '>', lx, py, fs_, th.coral)}
  <g clip-path="url(#type)">${phraseEls}</g>
  <rect x="${px + 2}" y="${py - 17}" width="10" height="22" fill="${th.coral}" class="blink"><animate attributeName="x" values="${xv}" keyTimes="${kt}" dur="${T}s" calcMode="discrete" repeatCount="indefinite"/></rect>
</g>
${chips.join('')}

<g class="up" style="animation-delay:.3s">
  <rect x="${ex}" y="${ey}" width="${ew}" height="${eh}" rx="16" fill="${th.surface2}" stroke="${th.border2}"/>
  <path d="M${ex} ${ey + 42}H${ex + ew}" stroke="${th.border2}"/>
  <circle cx="${ex + 22}" cy="${ey + 21}" r="6" fill="${th.coral}"/><circle cx="${ex + 42}" cy="${ey + 21}" r="6" fill="${th.amber}"/><circle cx="${ex + 62}" cy="${ey + 21}" r="6" fill="${th.teal}"/>
  ${d.text('m4', 'israel.ts', ex + ew / 2, ey + 26, 13, th.dim, 'text-anchor="middle"')}
  ${codeEls}
</g>`;
  write(`hero-${mode}.svg`, svg(d, W, H, body, baseCSS, 'Israel Mejía · Full-Stack Developer'));
}

// ================= TÍTULOS DE SECCIÓN =================
function title(mode, num, label, slug) {
  const th = THEMES[mode]; const d = new Doc(); const W = 1200, H = 80;
  const tx = 64, tw = measure('d7', label, 36, -0.5);
  const lx = tx + tw + 28;
  const body = `
<defs><linearGradient id="ln" x1="0" x2="1"><stop offset="0" stop-color="${th.teal}" stop-opacity=".7"/><stop offset="1" stop-color="${th.teal}" stop-opacity="0"/></linearGradient>
<linearGradient id="spark" x1="0" x2="1"><stop offset="0" stop-color="${th.sky}" stop-opacity="0"/><stop offset=".5" stop-color="${th.sky}"/><stop offset="1" stop-color="${th.sky}" stop-opacity="0"/></linearGradient></defs>
<g class="up">
  <rect x="1" y="24" width="46" height="32" rx="9" fill="none" stroke="${th.teal}" stroke-opacity=".5"/>
  ${d.text('m6', num, 24, 46, 15, th.teal, 'text-anchor="middle"')}
  ${d.text('d7', label, tx, 53, 36, th.text, 'letter-spacing="-0.5"')}
</g>
<rect x="${r(lx)}" y="39.5" width="${r(W - lx)}" height="1.5" fill="url(#ln)"/>
<rect x="${r(lx)}" y="38.5" width="120" height="3.5" rx="2" fill="url(#spark)"><animate attributeName="x" values="${r(lx - 120)};${W}" dur="4.5s" repeatCount="indefinite"/></rect>`;
  write(`title-${slug}-${mode}.svg`, svg(d, W, H, body, baseCSS, label));
}

// ================= FRANJA "AHORA" =================
function now(mode) {
  const th = THEMES[mode]; const d = new Doc(); const W = 1200, H = 120;
  const items = [
    { icon: 'map-pin', label: 'BASE', value: 'Manta, Ecuador', c: th.coral },
    { icon: 'graduation-cap', label: 'ESTUDIO', value: 'Ing. Software · ULEAM', c: th.sky },
    { icon: 'hammer', label: 'CONSTRUYENDO', value: 'KontaGo', c: th.amber },
    { icon: 'sparkles', label: 'APRENDIENDO', value: 'Docker · Clean Arch', c: th.violet },
  ];
  const gap = 16, tw = (W - gap * 3) / 4;
  let body = '';
  items.forEach((it, i) => {
    const x = i * (tw + gap);
    const vs = fit('d6', it.value, 22, tw - 40);
    body += `<g class="up" style="animation-delay:${i * 0.1}s">
<rect x="${r(x + 0.5)}" y=".5" width="${r(tw - 1)}" height="${H - 1}" rx="16" fill="${th.surface}" stroke="${th.border}"/>
<rect x="${r(x + 20)}" y="22" width="34" height="34" rx="10" fill="${it.c}" fill-opacity="${th.tint}"/>
${licon(it.icon, x + 28, 30, 18, it.c)}
${d.text('m6', it.label, x + 66, 44, 12, th.dim, 'letter-spacing="1.6"')}
${d.text('d6', it.value, x + 20, 94, vs, th.text, 'letter-spacing="-0.3"')}
</g>`;
  });
  write(`now-${mode}.svg`, svg(d, W, H, body, baseCSS, 'Base: Manta, Ecuador · Estudio: Ingeniería en Software, ULEAM · Construyendo: KontaGo · Aprendiendo: Docker y Clean Architecture'));
}

// ================= TARJETAS DE PROYECTO =================
const PROJECTS = [
  {
    slug: 'bachillero', name: 'Bachillero', icon: 'recycle', accent: 'teal', tag: 'EN PRODUCCIÓN',
    repo: 'UleamEPTI/App-Coins-BackEnd',
    desc: 'Backend de un sistema de recompensas por reciclaje para colegios: los estudiantes reciclan, suman puntos y los canjean por premios.',
    hl: ['16 módulos', 'JWT + roles', 'reportes PDF', 'backups'],
    tech: [['siNestjs', 'NestJS'], ['siPostgresql', 'PostgreSQL'], ['siTypeorm', 'TypeORM'], ['siSwagger', 'Swagger']],
  },
  {
    slug: 'bufete', name: 'Bufete Jurídico', icon: 'scale', accent: 'amber', tag: 'CLIENTE REAL',
    repo: 'Israelfas/bufete-juridico',
    desc: 'Plataforma para un bufete de abogados con portales para admin, abogado y cliente: casos, mensajería y avisos por correo.',
    hl: ['3 portales', 'emails', 'PDF + Excel', 'consulta SATJE'],
    tech: [['siNextdotjs', 'Next.js'], ['siSupabase', 'Supabase'], ['siTailwindcss', 'Tailwind'], ['siTypescript', 'TS']],
  },
  {
    slug: 'kontago', name: 'KontaGo', icon: 'package', accent: 'sky', tag: 'EN DESARROLLO', pulse: true,
    repo: null,
    desc: 'App híbrida web + móvil de inventario para tiendas de Latinoamérica, pensada tanto para el negocio de barrio como para cadenas.',
    hl: ['monorepo', 'colas BullMQ', 'web + móvil'],
    tech: [['siNestjs', 'NestJS'], ['siPostgresql', 'PostgreSQL'], ['siRedis', 'Redis'], ['siReact', 'React Native']],
  },
  {
    slug: 'coursehub', name: 'CourseHub API', icon: 'graduation-cap', accent: 'violet', tag: 'ACADÉMICO',
    repo: 'Israelfas/coursehub-api',
    desc: 'API REST para gestionar cursos, estudiantes e inscripciones, con DTOs validados, filtros de errores y pruebas automatizadas.',
    hl: ['REST', 'DTO + validación', 'tests e2e'],
    tech: [['siNestjs', 'NestJS'], ['siTypeorm', 'TypeORM'], ['siPostgresql', 'PostgreSQL'], ['siVitest', 'Vitest']],
  },
];

function card(mode, p) {
  const th = THEMES[mode]; const d = new Doc(); const W = 600, H = 400; const P = 34;
  const ac = th[p.accent];
  // etiqueta
  const tagW = measure('m7', p.tag, 12, 1.2) + 42;
  const tagX = W - P - tagW;
  // descripción
  const lines = wrap('d4', p.desc, 18, W - P * 2).slice(0, 3);
  // highlights
  let hx = P, hls = '';
  p.hl.forEach((h, i) => {
    if (i) { hls += `<circle cx="${r(hx + 9)}" cy="292" r="2.2" fill="${th.dim}"/>`; hx += 18; }
    hls += d.text('m4', h, hx, 297, 14, th.muted); hx += measure('m4', h, 14);
  });
  // chips
  let cx = P, chips = '';
  p.tech.forEach(([k, n]) => {
    const w = 36 + measure('m4', n, 13) + 12;
    chips += `<rect x="${r(cx)}" y="330" width="${r(w)}" height="34" rx="9" fill="${th.surface2}" stroke="${th.border}"/>${bicon(k, cx + 11, 339, 16, th)}${d.text('m4', n, cx + 35, 352, 13, th.text)}`;
    cx += w + 8;
  });
  const cornerIcon = p.repo ? 'arrow-up-right' : 'lock';
  const body = `
<defs>
  <clipPath id="c"><rect width="${W}" height="${H}" rx="20"/></clipPath>
  <radialGradient id="glow" cx="0" cy="0" r="0.9"><stop offset="0" stop-color="${ac}" stop-opacity="${mode === 'dark' ? 0.2 : 0.1}"/><stop offset="1" stop-color="${ac}" stop-opacity="0"/></radialGradient>
  <linearGradient id="top" x1="0" x2="1"><stop offset="0" stop-color="${ac}" stop-opacity="0"/><stop offset=".5" stop-color="${ac}"/><stop offset="1" stop-color="${ac}" stop-opacity="0"/></linearGradient>
</defs>
<g clip-path="url(#c)">
  <rect width="${W}" height="${H}" fill="${th.surface}"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="-240" y="0" width="240" height="2" fill="url(#top)"><animate attributeName="x" values="-240;${W}" dur="5s" repeatCount="indefinite"/></rect>
</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="20" fill="none" stroke="${th.border}"/>
<g class="up">
  <rect x="${P}" y="${P}" width="56" height="56" rx="15" fill="${ac}" fill-opacity="${th.tint}" stroke="${ac}" stroke-opacity=".35"/>
  ${licon(p.icon, P + 14, P + 14, 28, ac)}
  <rect x="${r(tagX)}" y="${P + 14}" width="${r(tagW)}" height="28" rx="14" fill="${ac}" fill-opacity="${th.tint}"/>
  ${p.pulse ? ring(tagX + 16, P + 28, ac) : ''}
  <circle cx="${r(tagX + 16)}" cy="${P + 28}" r="4" fill="${ac}"/>
  ${d.text('m7', p.tag, tagX + 28, P + 32.5, 12, ac, 'letter-spacing="1.2"')}
</g>
<g class="up" style="animation-delay:.12s">
  ${d.text('d7', p.name, P, 140, 32, th.text, 'letter-spacing="-0.6"')}
  ${p.repo ? bicon('siGithub', P, 156, 14, th, th.dim) : licon('lock', P, 156, 14, th.dim)}
  ${d.text('m4', p.repo || 'repositorio privado · pronto', P + 22, 168, 13, th.dim)}
</g>
<g class="up" style="animation-delay:.22s">
  ${lines.map((l, i) => d.text('d4', l, P, 210 + i * 27, 18, th.muted)).join('')}
</g>
<g class="up" style="animation-delay:.32s">${hls}</g>
<path d="M${P} 314H${W - P}" stroke="${th.border}"/>
<g class="up" style="animation-delay:.4s">
  ${chips}
  <circle cx="${W - P - 17}" cy="347" r="17" fill="${p.repo ? ac : th.surface2}" fill-opacity="${p.repo ? th.tint : 1}" stroke="${p.repo ? ac : th.border}" stroke-opacity="${p.repo ? 0.4 : 1}"/>
  ${licon(cornerIcon, W - P - 26, 338, 18, p.repo ? ac : th.dim)}
</g>`;
  write(`project-${p.slug}-${mode}.svg`, svg(d, W, H + 14, body, baseCSS, `${p.name}: ${p.desc}`));
}

// ================= STACK =================
const STACK = [
  ['BACKEND', 'teal', [['siNodedotjs', 'Node.js'], ['siNestjs', 'NestJS'], ['siExpress', 'Express'], ['siTypescript', 'TypeScript'], ['siPython', 'Python'], ['siDjango', 'Django']]],
  ['FRONTEND', 'sky', [['siVuedotjs', 'Vue 3'], ['siReact', 'React'], ['siNextdotjs', 'Next.js'], ['siTailwindcss', 'Tailwind'], ['siVite', 'Vite'], ['siHtml5', 'HTML'], ['siCss', 'CSS']]],
  ['MÓVIL', 'coral', [['siReact', 'React Native'], ['siFlutter', 'Flutter'], ['siDart', 'Dart']]],
  ['DATOS', 'amber', [['siPostgresql', 'PostgreSQL'], ['siTypeorm', 'TypeORM'], ['siRedis', 'Redis'], ['siSupabase', 'Supabase'], ['siMongodb', 'MongoDB'], ['siFirebase', 'Firebase']]],
  ['DEVOPS', 'violet', [['siDocker', 'Docker'], ['siGit', 'Git'], ['siGithub', 'GitHub'], ['siLinux', 'Linux'], ['siPostman', 'Postman'], ['siSwagger', 'Swagger']]],
];
function stack(mode) {
  const th = THEMES[mode]; const d = new Doc(); const W = 1200; const rowH = 64, top = 30;
  const H = top * 2 + STACK.length * rowH - 18;
  let body = `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="20" fill="${th.surface}" stroke="${th.border}"/>`;
  let n = 0;
  STACK.forEach(([label, acc, items], ri) => {
    const y = top + ri * rowH;
    const c = th[acc];
    body += `<g class="up" style="animation-delay:${ri * 0.08}s"><rect x="34" y="${y + 13}" width="3" height="20" rx="1.5" fill="${c}"/>${d.text('m6', label, 50, y + 28, 13, th.dim, 'letter-spacing="2"')}</g>`;
    let x = 190;
    items.forEach(([k, name]) => {
      const w = 44 + measure('d5', name, 17) + 16;
      body += `<g class="up" style="animation-delay:${0.15 + n * 0.035}s"><rect x="${r(x)}" y="${y}" width="${r(w)}" height="46" rx="12" fill="${th.surface2}" stroke="${th.border}"/>${bicon(k, x + 14, y + 12, 22, th)}${d.text('d5', name, x + 44, y + 29, 17, th.text)}</g>`;
      x += w + 10; n++;
    });
    if (x > W - 20) console.warn('stack row overflow', label, x);
  });
  write(`stack-${mode}.svg`, svg(d, W, H, body, baseCSS, 'Stack: ' + STACK.map((s) => s[0] + ': ' + s[2].map((i) => i[1]).join(', ')).join(' · ')));
}

// ================= DIVISOR =================
function divider(mode) {
  const th = THEMES[mode]; const d = new Doc(); const W = 1200, H = 40;
  const body = `<defs><linearGradient id="dg" x1="0" x2="1"><stop offset="0" stop-color="${th.teal}" stop-opacity="0"/><stop offset=".15" stop-color="${th.teal}"/><stop offset=".5" stop-color="${th.sky}"/><stop offset=".85" stop-color="${th.coral}"/><stop offset="1" stop-color="${th.coral}" stop-opacity="0"/></linearGradient>
<clipPath id="dc"><rect width="${W}" height="${H}"/></clipPath></defs>
<mask id="wm"><g style="animation:drift 14s linear infinite"><path d="${wavePath(20, 5, 150, 2400)}" fill="none" stroke="#fff" stroke-width="2"/></g></mask>
<g clip-path="url(#dc)" opacity=".85"><rect width="${W}" height="${H}" fill="url(#dg)" mask="url(#wm)"/></g>`;
  // el gradiente debe cubrir el ancho visible: usamos userSpaceOnUse
  write(`divider-${mode}.svg`, svg(d, W, H, body.replace('id="dg" x1="0" x2="1"', `id="dg" gradientUnits="userSpaceOnUse" x1="0" x2="${W}"`), baseCSS, 'divisor'));
}

// ================= BOTONES DE CONTACTO =================
const CONTACT = [
  { slug: 'email', icon: 'siGmail', label: 'Email', sub: 'fired1297@gmail.com' },
  { slug: 'instagram', icon: 'siInstagram', label: 'Instagram', sub: '@israel_mejk' },
  { slug: 'github', icon: 'siGithub', label: 'GitHub', sub: '@Israelfas' },
];
function button(mode, b) {
  const th = THEMES[mode]; const d = new Doc(); const W = 380, H = 92;
  const br = brand(b.icon, th);
  const body = `
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="18" fill="${th.surface}" stroke="${th.border}"/>
<circle cx="50" cy="46" r="26" fill="${br.color}" fill-opacity="${th.tint}"/>
${bicon(b.icon, 37, 33, 26, th)}
${d.text('d6', b.label, 94, 42, 22, th.text, 'letter-spacing="-0.3"')}
${d.text('m4', b.sub, 94, 66, 14, th.muted)}
<g style="animation:fade 1s ease both">${licon('arrow-up-right', W - 50, 34, 24, th.teal)}</g>`;
  write(`btn-${b.slug}-${mode}.svg`, svg(d, W, H, body, baseCSS, `${b.label}: ${b.sub}`));
}

// ================= FOOTER =================
function footer(mode) {
  const th = THEMES[mode]; const d = new Doc(); const W = 1200, H = 210;
  const waves = [
    { y: 120, a: 12, l: 300, op: 0.18, c: th.sky, dur: 30 },
    { y: 138, a: 10, l: 240, op: 0.24, c: th.teal, dur: 20 },
    { y: 158, a: 8, l: 400, op: 0.35, c: th.teal, dur: 38 },
  ].map((w) => `<g style="animation:drift ${w.dur}s linear infinite"><path d="${wavePath(w.y, w.a, w.l, 2400, H)}" fill="${w.c}" opacity="${mode === 'dark' ? w.op : w.op * 0.6}"/></g>`).join('');
  const body = `<defs><clipPath id="fc"><rect width="${W}" height="${H}" rx="24"/></clipPath>
<linearGradient id="ff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${th.bg}" stop-opacity="0"/><stop offset="1" stop-color="${th.bg}"/></linearGradient></defs>
<g clip-path="url(#fc)">${waves}</g>
${d.text('d6', 'Gracias por pasar.', W / 2, 52, 26, th.text, 'text-anchor="middle" letter-spacing="-0.4"')}
${d.text('m4', 'código escrito frente al Pacífico · Manta, Ecuador', W / 2, 84, 14, th.muted, 'text-anchor="middle"')}`;
  write(`footer-${mode}.svg`, svg(d, W, H, body, baseCSS, 'Gracias por pasar · Manta, Ecuador'));
}

// ---------- Generar todo ----------
const SECTIONS = [['01', 'Sobre mí', 'about'], ['02', 'Proyectos', 'projects'], ['03', 'Stack', 'stack'], ['04', 'Actividad', 'activity'], ['05', 'Contacto', 'contact']];
for (const m of ['dark', 'light']) {
  hero(m); now(m); stack(m); divider(m); footer(m);
  SECTIONS.forEach(([n, l, s]) => title(m, n, l, s));
  PROJECTS.forEach((p) => card(m, p));
  CONTACT.forEach((b) => button(m, b));
}
console.log('ok', fs.readdirSync(OUT).length, 'archivos');
