// Einstieg: Anmeldung, Begrüßung, Grundlayout, Routing
import * as S from './store.js';
import { pruefen, angemeldet, merkeAnmeldung, abmelden } from './auth.js';
import { ladeAlles, GEWERKE, gewerkMeta, hatInhalt, alleBegriffe, alleInhalte } from './daten.js';
import { PHASEN, BAUWEISEN, HAEUSER } from '../data/gewerke.js';
import { NEUIGKEITEN } from '../data/neuigkeiten.js';
import { esc, icon, dialog, toast, el } from './util.js';
import { renderGewerk } from './views/gewerk.js';
import { renderTest, renderWiederholen, faelligeIds } from './views/test.js';
import * as B from './views/bereiche.js';

const app = document.getElementById('app');
let aufraeumen = null;

const NAV = [
  ['start', 'Start'], ['gebaeude', '3D-Gebäude'], ['gewerke', 'Gewerke'], ['bauweisen', 'Bauweisen'], ['bauablauf', 'Bauablauf'],
  ['bauueberwachung', 'Bauüberwachung'], ['recht', 'Recht & Kosten'], ['lexikon', 'Lexikon'], ['wiederholen', 'Wiederholen'],
];

// ---------- Theme ----------
function themeAnwenden() {
  const t = S.get().theme;
  if (t === 'hell') document.documentElement.dataset.theme = 'light';
  else if (t === 'dunkel') document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  window.dispatchEvent(new Event('themechange'));
}

// ---------- Anmeldung ----------
function login() {
  app.innerHTML = `
    <div class="login-wrap"><form class="login-card" autocomplete="on">
      <h1>${hausLogo()} Gewerke lernen</h1>
      <p class="muted">Bitte anmelden.</p>
      <label for="lg-name">Benutzername</label>
      <input id="lg-name" name="username" type="text" autocomplete="username" required autofocus>
      <label for="lg-pw">Passwort</label>
      <input id="lg-pw" name="password" type="password" autocomplete="current-password" required>
      <button class="btn-primary" type="submit">Anmelden</button>
      <div class="login-error" role="alert"></div>
      <p class="login-note">Sichtschutz für zufällige Besucher. Fortschritt bleibt in diesem Browser gespeichert.</p>
    </form></div>`;
  const f = app.querySelector('form');
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const ok = await pruefen(f.username.value, f.password.value);
    if (!ok) { app.querySelector('.login-error').textContent = 'Benutzername oder Passwort falsch.'; f.password.select(); return; }
    merkeAnmeldung();
    begruessung();
  });
}

function hausLogo() {
  return `<svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true"><path d="M8 30 32 10l24 20v26H8z" fill="#e8890c"/><rect x="26" y="38" width="12" height="18" fill="#fff"/></svg>`;
}

// ---------- Begrüßung ----------
function begruessung() {
  app.innerHTML = `
    <div class="greet">
      <div>
        <h1>Hallo Görkem</h1>
        <p>Klick auf das Haus, um die Baustelle zu betreten.</p>
        <svg viewBox="0 0 620 340" role="img" aria-label="Animierte Baustelle mit Kran und Haus">
          <g class="wolke" opacity=".6"><ellipse cx="60" cy="40" rx="38" ry="12" fill="#cfd8e3"/><ellipse cx="85" cy="32" rx="24" ry="12" fill="#cfd8e3"/></g>
          <rect x="0" y="292" width="620" height="48" fill="#8a6a48"/>
          <rect x="0" y="286" width="620" height="8" fill="#6d9c4f"/>
          <!-- Kran -->
          <rect x="132" y="70" width="14" height="222" fill="#e8b10c"/>
          ${Array.from({ length: 10 }, (_, i) => `<path d="M132 ${80 + i * 21} l14 21 M146 ${80 + i * 21} l-14 21" stroke="#b58a07" stroke-width="2"/>`).join('')}
          <g class="kran-arm">
            <rect x="60" y="62" width="300" height="10" fill="#e8b10c"/>
            <rect x="60" y="72" width="30" height="16" fill="#555"/>
            <line x1="139" y1="40" x2="350" y2="64" stroke="#555" stroke-width="2"/>
            <line x1="139" y1="40" x2="70" y2="64" stroke="#555" stroke-width="2"/>
            <rect x="133" y="30" width="12" height="34" fill="#e8b10c"/>
            <g class="kran-last"><line x1="300" y1="72" x2="300" y2="150" stroke="#333" stroke-width="2"/>
              <rect x="276" y="150" width="48" height="16" fill="#c3c9cf" stroke="#8d959e"/></g>
          </g>
          <!-- Gerüst -->
          <g stroke="#8d959e" stroke-width="3"><line x1="470" y1="170" x2="470" y2="290"/><line x1="520" y1="170" x2="520" y2="290"/><line x1="470" y1="210" x2="520" y2="210"/><line x1="470" y1="250" x2="520" y2="250"/><line x1="470" y1="250" x2="520" y2="210"/></g>
          <rect x="480" y="230" width="18" height="20" fill="#d97706" class="blink"/>
          <!-- Haus (klickbar) -->
          <g class="haus-klick" tabindex="0" role="button" aria-label="Haus anklicken und Seite öffnen" data-haus>
            <path class="haus-koerper" d="M230 290 V200 L310 140 L390 200 V290 Z" fill="#d9d4c7" stroke="#6b6b6b" stroke-width="2"/>
            <path d="M216 206 L310 132 L404 206" fill="none" stroke="#9c3f2b" stroke-width="12" stroke-linejoin="round"/>
            <rect x="290" y="236" width="36" height="54" fill="#3d4247"/>
            <rect x="246" y="214" width="30" height="28" fill="#9fd3f0" stroke="#fff" stroke-width="3"/>
            <rect x="344" y="214" width="30" height="28" fill="#9fd3f0" stroke="#fff" stroke-width="3"/>
            <text x="310" y="320" text-anchor="middle" font-size="15" fill="currentColor" style="fill:var(--text)">Klick mich</text>
          </g>
          <!-- Schild -->
          <rect x="40" y="236" width="70" height="40" fill="#fff" stroke="#d62828" stroke-width="3"/><line x1="75" y1="276" x2="75" y2="292" stroke="#555" stroke-width="4"/>
          <text x="75" y="260" text-anchor="middle" font-size="10" font-weight="700" fill="#d62828">BAUSTELLE</text>
        </svg>
      </div>
    </div>`;
  const haus = app.querySelector('[data-haus]');
  const weiter = () => { try { sessionStorage.setItem('gewerke-lernen-begruesst', '1'); } catch { } shell(true); };
  haus.addEventListener('click', weiter);
  haus.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); weiter(); } });
}

const mobil = () => window.matchMedia('(max-width: 760px)').matches;

// ---------- Grundlayout ----------
function shell(nachBegruessung) {
  const st = S.get();
  app.innerHTML = `
    <header class="topbar">
      <div class="topbar-row">
        <button class="btn-ghost" data-menu aria-label="Gewerke-Leiste ein- oder ausblenden" title="Alle Gewerke">${icon('menu')}</button>
        <a class="brand" href="#/start">${hausLogo()} <span>Gewerke lernen</span></a>
        <span class="spacer"></span>
        <label class="ctrl-label">Gebäude<select data-haus aria-label="Gebäude-Schalter">${HAEUSER.map(h => `<option value="${h.id}">${esc(h.name)}</option>`).join('')}</select></label>
        <label class="ctrl-label">Bauweise<select data-bauweise aria-label="Bauweisen-Schalter">${BAUWEISEN.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></label>
        <div class="search">${icon('search')}<input type="search" placeholder="Suche" data-suche aria-label="Suche"><div class="search-results" data-treffer hidden></div></div>
        <button class="btn-ghost bell" data-bell aria-label="Neuigkeiten" title="Neuigkeiten">${icon('bell')}<span class="badge" data-bellzahl hidden></span></button>
        <button class="btn-ghost" data-theme title="Hell/Dunkel umschalten" aria-label="Hell/Dunkel umschalten">${icon('moon')}</button>
        <button class="btn-ghost" data-backup title="Fortschritt sichern/laden" aria-label="Fortschritt sichern oder laden">${icon('save')}</button>
        <button class="btn-ghost" data-logout title="Abmelden" aria-label="Abmelden">${icon('logout')}</button>
      </div>
      <nav class="mainnav" aria-label="Hauptbereiche">${NAV.map(([k, n]) => `<a href="#/${k}" data-nav="${k}">${n}${k === 'wiederholen' ? ' <span class="badge neutral" data-wdhzahl hidden></span>' : ''}</a>`).join('')}</nav>
    </header>
    <div class="layout ${st.sidebar && !mobil() ? 'sidebar-open' : ''}">
      <aside class="sidebar" aria-label="Gewerke"></aside>
      <main class="main" id="main" tabindex="-1"></main>
    </div>`;
  const q = s => app.querySelector(s);
  q('[data-haus]').value = st.haus || 'A';
  q('[data-bauweise]').value = st.bauweise || 'massiv';
  q('[data-haus]').addEventListener('change', e => { S.setze('haus', e.target.value); window.dispatchEvent(new Event('hauswechsel-extern')); toast(`Startseiten-Haus: ${HAEUSER.find(h => h.id === e.target.value).name}`); });
  window.addEventListener('hauswechsel', () => { q('[data-haus]').value = S.get().haus; });
  q('[data-bauweise]').addEventListener('change', e => { S.setze('bauweise', e.target.value); toast('Bauweise gespeichert. Der Bauweisen-Vergleich folgt mit den Gewerken.'); if (location.hash.startsWith('#/bauweisen')) route(); });
  q('[data-menu]').addEventListener('click', () => { const open = !q('.layout').classList.contains('sidebar-open'); S.setze('sidebar', open); q('.layout').classList.toggle('sidebar-open', open); });
  // Auf dem Handy liegt die Leiste über der Seite: Schließen-Knopf und Klick auf ein Gewerk schließen sie
  q('.sidebar').addEventListener('click', e => {
    if (e.target.closest('[data-sbzu]') || (mobil() && e.target.closest('a'))) { S.setze('sidebar', false); q('.layout').classList.remove('sidebar-open'); }
  });
  q('[data-theme]').addEventListener('click', () => {
    const naechst = { auto: 'hell', hell: 'dunkel', dunkel: 'auto' }[S.get().theme || 'auto'];
    S.setze('theme', naechst); themeAnwenden(); themeIcon();
    toast({ auto: 'Design: wie System', hell: 'Design: hell', dunkel: 'Design: dunkel' }[naechst]);
  });
  q('[data-backup]').addEventListener('click', backupDialog);
  q('[data-logout]').addEventListener('click', () => { abmelden(); location.hash = ''; login(); });
  q('[data-bell]').addEventListener('click', () => neuigkeiten(true));
  suche(q('[data-suche]'), q('[data-treffer]'));
  themeIcon();
  window.addEventListener('fortschritt', () => { leiste(); zaehler(); });
  window.onhashchange = route;
  if (!location.hash || location.hash === '#' || location.hash === '#/') history.replaceState(null, '', '#/start');
  route();
  zaehler();
  setTimeout(() => neuigkeiten(false), 300);
}

function themeIcon() {
  const b = app.querySelector('[data-theme]');
  if (!b) return;
  const t = S.get().theme || 'auto';
  b.innerHTML = icon(t === 'dunkel' ? 'moon' : 'sun');
  b.title = `Design: ${t === 'auto' ? 'wie System' : t} (klicken zum Wechseln)`;
}

function zaehler() {
  const n = faelligeIds().length;
  const z = app.querySelector('[data-wdhzahl]');
  if (z) { z.hidden = !n; z.textContent = n; }
  const ungelesen = NEUIGKEITEN.filter(x => !S.get().neuGelesen.includes(x.id)).length;
  const b = app.querySelector('[data-bellzahl]');
  if (b) { b.hidden = !ungelesen; b.textContent = ungelesen; }
}

function leiste(aktiv) {
  const sb = app.querySelector('.sidebar');
  if (!sb) return;
  const akt = aktiv ?? (location.hash.match(/^#\/gewerk\/([^/?]+)/) || [])[1];
  sb.innerHTML = `<button class="btn-small sb-zu" data-sbzu aria-label="Gewerke-Leiste schließen">${icon('x')} Schließen</button>` + PHASEN.map(p => `<h4>Phase ${p.nr} · ${esc(p.name)}</h4>` + GEWERKE.filter(g => g.phase === p.nr).map(g => {
    const f = S.fortschritt(g.id);
    return `<a href="#/gewerk/${g.id}" class="${g.id === akt ? 'active' : ''} ${hatInhalt(g.id) ? '' : 'leer'}">
      <div class="sb-name"><span>${esc(g.kurzname)}</span><span>${hatInhalt(g.id) ? f + ' %' : 'folgt'}</span></div>
      <div class="bar"><span style="width:${f}%"></span></div></a>`;
  }).join('')).join('');
}

// ---------- Router ----------
function parse() {
  const h = location.hash.replace(/^#\/?/, '');
  const [pfad, qs] = h.split('?');
  const teile = pfad.split('/').filter(Boolean).map(decodeURIComponent);
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  return { teile, params };
}

function route() {
  const main = app.querySelector('#main');
  if (!main) return;
  if (typeof aufraeumen === 'function') { try { aufraeumen(); } catch { } }
  aufraeumen = null;
  const { teile, params } = parse();
  const [a, b, c, d] = teile;
  app.querySelectorAll('[data-nav]').forEach(n => n.classList.toggle('active', n.dataset.nav === a || (a === 'gewerk' && n.dataset.nav === 'gewerke')));
  let r;
  try {
    switch (a) {
      case 'gebaeude': r = B.renderGebaeude(main); break;
      case 'gewerke': r = B.renderGewerke(main); break;
      case 'gewerk':
        if (c === 'test') r = renderTest(main, b, { neu: params.neu === '1' });
        else r = renderGewerk(main, b, params, c === 'schicht' ? d : undefined);
        break;
      case 'bauweisen': r = B.renderBauweisen(main); break;
      case 'bauablauf': r = B.renderBauablauf(main); break;
      case 'bauueberwachung': r = B.renderBauueberwachung(main); break;
      case 'recht': r = B.renderRecht(main); break;
      case 'lexikon': r = B.renderLexikon(main, b); break;
      case 'wiederholen': r = renderWiederholen(main, b, { neu: params.neu === '1', vorziehen: params.vorziehen === '1' }); break;
      case 'quellen': r = B.renderQuellen(main); break;
      case 'notizen': r = B.renderNotizen(main); break;
      default: r = B.renderStart(main);
    }
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="empty"><h2>Da ist etwas schiefgelaufen</h2><p>${esc(e.message)}</p><a class="btn" href="#/start">Zur Startseite</a></div>`;
  }
  aufraeumen = r && typeof r.dispose === 'function' ? () => r.dispose() : r;
  leiste();
  zaehler();
  if (!(a === 'gewerk' && params.tab)) window.scrollTo(0, 0);
}

// ---------- Suche ----------
function suchIndex() {
  const idx = [];
  for (const g of GEWERKE) idx.push({ typ: 'Gewerk', titel: g.kurzname, text: g.name + ' ' + g.atv, href: `#/gewerk/${g.id}` });
  for (const b of alleBegriffe()) idx.push({ typ: 'Begriff · ' + b.gewerkName, titel: b.begriff, text: b.erklaerung, href: `#/lexikon/${encodeURIComponent(b.begriff)}` });
  for (const d of alleInhalte()) {
    for (const m of d.modelle) for (const s of m.schichten) idx.push({ typ: `Schicht · ${m.name}`, titel: s.name, text: `${s.fachbegriff || ''} ${s.material || ''}`, href: `#/gewerk/${d.id}/schicht/${s.id}?modell=${m.id}` });
    for (const n of d.lesen?.normen || []) idx.push({ typ: `Norm/Regel · ${d.name}`, titel: n.regel, text: n.wert, href: `#/gewerk/${d.id}?tab=normen` });
  }
  for (const [k, n] of NAV) idx.push({ typ: 'Bereich', titel: n, text: '', href: `#/${k}` });
  idx.push({ typ: 'Bereich', titel: 'Quellenregister', text: 'Normen Stand Ausgabe', href: '#/quellen' });
  return idx;
}
function suche(input, box) {
  let idx = null, sel = 0, treffer = [];
  const zeigen = () => {
    const t = input.value.trim().toLowerCase();
    if (t.length < 2) { box.hidden = true; return; }
    idx = idx || suchIndex();
    treffer = idx.filter(x => (x.titel + ' ' + x.text).toLowerCase().includes(t))
      .sort((a, b) => (b.titel.toLowerCase().startsWith(t) ? 1 : 0) - (a.titel.toLowerCase().startsWith(t) ? 1 : 0)).slice(0, 12);
    sel = 0;
    box.innerHTML = treffer.length ? treffer.map((x, i) => `<a href="${x.href}" class="${i === sel ? 'sel' : ''}"><div>${esc(x.titel)}</div><div class="typ">${esc(x.typ)}</div></a>`).join('') : '<div style="padding:.6em .8em" class="muted">Nichts gefunden.</div>';
    box.hidden = false;
  };
  input.addEventListener('input', zeigen);
  input.addEventListener('focus', zeigen);
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      sel = Math.max(0, Math.min(treffer.length - 1, sel + (e.key === 'ArrowDown' ? 1 : -1)));
      box.querySelectorAll('a').forEach((a, i) => a.classList.toggle('sel', i === sel));
    } else if (e.key === 'Enter' && treffer[sel]) { location.hash = treffer[sel].href; input.value = ''; box.hidden = true; input.blur(); }
    else if (e.key === 'Escape') { box.hidden = true; input.blur(); }
  });
  box.addEventListener('click', e => { if (e.target.closest('a')) { input.value = ''; box.hidden = true; } });
  document.addEventListener('click', e => { if (!e.target.closest('.search')) box.hidden = true; });
}

// ---------- Neuigkeiten ----------
function neuigkeiten(alle) {
  const st = S.get();
  const liste = NEUIGKEITEN.filter(n => alle || !st.neuGelesen.includes(n.id));
  if (!liste.length) { if (alle) toast('Keine Neuigkeiten.'); return; }
  const sort = [...liste.filter(n => n.relevanz === 'relevant'), ...liste.filter(n => n.relevanz !== 'relevant')];
  const body = sort.map(n => `<div class="news-item ${n.relevanz === 'relevant' ? 'relevant' : 'info'}">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="pill ${n.relevanz === 'relevant' ? 'bad' : 'info'}">${n.relevanz === 'relevant' ? 'relevant' : 'zur Info'}</span>
        <span class="muted" style="font-size:.85rem">${esc(n.datum)}</span>${n.beispiel ? '<span class="pill">Beispiel</span>' : ''}${st.neuGelesen.includes(n.id) ? '' : '<span class="pill neu">neu</span>'}</div>
      <h3 style="margin-top:6px">${esc(n.titel)}</h3>
      <dl><dt>Betrifft</dt><dd>${esc(n.betrifft)}</dd><dt>Ausgabe</dt><dd>${esc(n.alt)} → ${esc(n.neu)}</dd><dt>Was ändert sich</dt><dd>${esc(n.aenderung)}</dd><dt>Worauf achten</dt><dd>${esc(n.achten)}</dd></dl>
      ${(n.lektionen || []).map(l => `<a class="pill" href="#/gewerk/${l}" data-close>Lektion: ${esc(gewerkMeta(l)?.kurzname || l)}</a>`).join('')}
    </div>`).join('');
  const markieren = () => { const s = S.get(); for (const n of liste) if (!s.neuGelesen.includes(n.id)) s.neuGelesen.push(n.id); S.speichern(); zaehler(); };
  const dlg = dialog({ titel: alle ? 'Alle Neuigkeiten' : 'Neuigkeiten seit deinem letzten Besuch', body, buttons: [{ text: 'Gelesen', primary: true, onClick: c => { markieren(); c(); } }] });
  dlg.root.querySelectorAll('[data-close]').forEach(a => a.addEventListener('click', () => { markieren(); dlg.close(); }));
}

// ---------- Backup ----------
function backupDialog() {
  const body = document.createElement('div');
  body.innerHTML = `<p>Dein Fortschritt liegt nur in diesem Browser. Sichere ihn regelmäßig als Datei, um ihn auf ein anderes Gerät mitzunehmen oder nach dem Löschen der Browserdaten wiederherzustellen.</p>
    ${S.speicherVerfuegbar() ? '' : '<p class="note bad">Der Browser-Speicher ist gerade nicht verfügbar (z. B. privates Fenster). Sichere den Fortschritt unbedingt als Datei.</p>'}
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
      <button class="btn-primary" data-export>${icon('download')} Fortschritt sichern</button>
      <label class="btn">${icon('upload')} Fortschritt laden<input type="file" accept="application/json,.json" data-import hidden></label>
    </div><p class="login-error" data-fehler></p>`;
  const dlg = dialog({ titel: 'Fortschritt sichern/laden', body });
  body.querySelector('[data-export]').addEventListener('click', () => { S.exportieren(); toast('Backup-Datei wird heruntergeladen'); });
  body.querySelector('[data-import]').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      await S.importieren(f);
      themeAnwenden();
      dlg.close();
      toast('Fortschritt geladen');
      shell(false);
    } catch (err) { body.querySelector('[data-fehler]').textContent = err.message || 'Datei konnte nicht gelesen werden.'; }
  });
}

// ---------- Start ----------
async function boot() {
  S.laden();
  themeAnwenden();
  await ladeAlles();
  if (!angemeldet()) { login(); return; }
  let begruesst = false;
  try { begruesst = sessionStorage.getItem('gewerke-lernen-begruesst') === '1'; } catch { }
  if (begruesst) shell(false); else begruessung();
}

boot();
