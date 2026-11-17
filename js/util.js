// Kleine Helfer für DOM, Text und Dialoge

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Mini-Markdown: Überschriften (###), Listen (- / 1.), **fett**, *kursiv*, Absätze
export function md(src) {
  if (!src) return '';
  const lines = String(src).replace(/\r/g, '').split('\n');
  let out = '', list = null, para = [];
  const inline = t => esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
  const flushPara = () => { if (para.length) { out += `<p>${inline(para.join(' '))}</p>`; para = []; } };
  const flushList = () => { if (list) { out += `</${list}>`; list = null; } };
  for (const raw of lines) {
    const line = raw.trim();
    let m;
    if (!line) { flushPara(); flushList(); continue; }
    if ((m = line.match(/^(#{2,4})\s+(.*)$/))) {
      flushPara(); flushList();
      const lvl = Math.min(4, m[1].length + 1);
      out += `<h${lvl}>${inline(m[2])}</h${lvl}>`;
    } else if ((m = line.match(/^[-*]\s+(.*)$/))) {
      flushPara();
      if (list !== 'ul') { flushList(); out += '<ul>'; list = 'ul'; }
      out += `<li>${inline(m[1])}</li>`;
    } else if ((m = line.match(/^\d+\.\s+(.*)$/))) {
      flushPara();
      if (list !== 'ol') { flushList(); out += '<ol>'; list = 'ol'; }
      out += `<li>${inline(m[1])}</li>`;
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara(); flushList();
  return out;
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function slug(s) {
  return String(s).toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function datum(ts) {
  try { return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return String(ts); }
}

let toastTimer;
export function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = el(`<div class="toast" role="status">${esc(msg)}</div>`);
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2600);
}

// Modaler Dialog. Gibt {close, root} zurück.
export function dialog({ titel, body, buttons = [], onClose }) {
  const ov = el(`<div class="overlay" role="dialog" aria-modal="true" aria-label="${esc(titel)}">
    <div class="dialog">
      <header><h2>${esc(titel)}</h2><button class="btn-ghost" data-x aria-label="Schließen">${icon('x')}</button></header>
      <div class="body"></div>
      <footer></footer>
    </div></div>`);
  const bodyEl = ov.querySelector('.body');
  if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
  const foot = ov.querySelector('footer');
  if (!buttons.length) foot.remove();
  const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); onClose && onClose(); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  for (const b of buttons) {
    const btn = el(`<button class="${b.primary ? 'btn-primary' : ''}">${esc(b.text)}</button>`);
    btn.addEventListener('click', () => { if (b.onClick) b.onClick(close); else close(); });
    foot.appendChild(btn);
  }
  ov.querySelector('[data-x]').addEventListener('click', close);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(ov);
  const first = ov.querySelector('footer button.btn-primary, footer button, [data-x]');
  first && first.focus();
  return { close, root: ov };
}

// Einfache Linien-Icons als Inline-SVG
const P = {
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 15A8 8 0 1 1 9 4a7 7 0 0 0 11 11z"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',
  logout: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  explode: '<path d="M4 9h16M4 15h16"/><path d="M12 3v3M12 18v3"/>',
  home: '<path d="M3 11l9-8 9 8v10H3z"/><path d="M9 21v-6h6v6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  repeat: '<path d="M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2"/><path d="M20 4v5h-5M4 20v-5h5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.5"/>',
  cut: '<path d="M3 12h18" stroke-dasharray="3 3"/><rect x="5" y="4" width="14" height="16" rx="1"/>',
  ruler: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  down: '<path d="M12 5v14M5 12l7 7 7-7"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
};
export function icon(name, cls = 'icon') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}

export function stufeBadge(stufe) {
  const map = { norm: 'Norm/Gesetz', regel: 'Fachregel/Hersteller', faust: 'Faustregel', ungeprueft: 'ungeprüft' };
  const k = map[stufe] ? stufe : 'ungeprueft';
  return `<span class="stufe stufe-${k}" title="Verlässlichkeit">${map[k]}</span>`;
}

// "neu"-Markierung: Datum der Änderung, 30 Tage sichtbar
export function neuBadge(datumStr) {
  if (!datumStr) return '';
  const t = Date.parse(datumStr);
  if (isNaN(t)) return '';
  const tage = (Date.now() - t) / 86400000;
  return tage >= 0 && tage <= 30 ? ' <span class="pill neu">neu</span>' : '';
}
