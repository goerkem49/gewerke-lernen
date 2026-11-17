// Gewerk-Seite im Lesemodus (oder Platzhalter "Inhalt folgt")
import { inhalt, gewerkMeta, GEWERKE } from '../daten.js';
import { PHASEN, atvListe } from '../../data/gewerke.js';
import { quelle, QUELLEN } from '../../data/quellen.js';
import { ModellAnsicht } from './modell3d.js';
import * as S from '../store.js';
import { esc, md, icon, stufeBadge, neuBadge, dialog, toast } from '../util.js';

const TABS = [
  ['ueberblick', 'Überblick'], ['aufbau', 'Aufbau & Schichten'], ['varianten', 'Varianten'], ['ablauf', 'Ablauf'], ['begriffe', 'Fachbegriffe'],
  ['normen', 'Normen & Regeln'], ['schnittstellen', 'Schnittstellen'], ['bauphysik', 'Bauphysik'], ['maengel', 'Typische Mängel'],
  ['checkliste', 'Begehungs-Checkliste'], ['chef', 'Chef-Wissen'], ['quellen', 'Quellen'],
];

function depLinks(ids) {
  if (!ids || !ids.length) return '<span class="muted">–</span>';
  return ids.map(id => { const g = gewerkMeta(id); return g ? `<a class="pill" href="#/gewerk/${id}">${esc(g.kurzname)}</a>` : ''; }).join('');
}

export function atvHtml(g) {
  return atvListe(g).map(a => a.belegt
    ? `<span class="pill ok" title="${esc(a.titel)}, Ausgabe ${esc(a.stand)} (geprüft)">DIN ${a.nr} · ${esc(a.stand)}</span>`
    : `<span class="pill" title="Nummer aus dem Master-Dokument, Titel und Ausgabe noch nicht online belegt">DIN ${a.nr} <span class="stufe stufe-ungeprueft">ungeprüft</span></span>`).join('');
}

export function fehlerMelden(gid, ort) {
  const body = document.createElement('div');
  body.innerHTML = `<p class="muted">Die Notiz wird gespeichert und bei der nächsten Überarbeitung berücksichtigt. Sie ist auch in der Backup-Datei enthalten.</p>
    <label for="fm-text">Was stimmt nicht?</label><textarea id="fm-text" placeholder="z. B. Wert aus Fachbuch weicht ab: …"></textarea>`;
  dialog({
    titel: 'Fehler melden', body,
    buttons: [{ text: 'Abbrechen' }, {
      text: 'Speichern', primary: true, onClick: close => {
        const t = body.querySelector('textarea').value.trim();
        if (!t) { body.querySelector('textarea').focus(); return; }
        S.get().fehler.push({ datum: Date.now(), gewerk: gid, ort, text: t });
        S.speichern();
        close();
        toast('Notiz gespeichert');
      },
    }],
  });
}

export function renderGewerk(main, gid, params = {}, schichtId) {
  const g = gewerkMeta(gid);
  if (!g) { main.innerHTML = '<div class="empty">Gewerk nicht gefunden.</div>'; return; }
  const d = inhalt(gid);
  const phase = PHASEN.find(p => p.nr === g.phase);
  const st = S.gewerk(gid);
  S.merkeZuletzt(`#/gewerk/${gid}`, g.kurzname);

  const kopf = `
    <div class="page-head">
      <div class="grow">
        <div class="muted" style="font-size:.85rem">Phase ${g.phase}: ${esc(phase?.name || '')} · ATV ${atvHtml(g)}</div>
        <h1>${esc(d ? d.name : g.kurzname)}</h1>
        <div class="deps" style="margin-top:6px">
          <div><span class="muted">Vorgänger (muss fertig sein):</span> ${depLinks(g.vorgaenger)}</div>
          <div><span class="muted">Nachfolger:</span> ${depLinks(g.nachfolger)}</div>
        </div>
      </div>
      <div class="actions">
        ${d ? `<a class="btn btn-primary" href="#/gewerk/${gid}/test${S.sitzung('test:' + gid) ? '' : '?neu=1'}" data-test>${icon('play')} ${S.sitzung('test:' + gid) ? 'Test fortsetzen' : 'Test starten'}</a>` : `<button class="btn-primary" disabled title="Test folgt mit dem Inhalt">${icon('play')} Test starten</button>`}
      </div>
    </div>`;

  if (!d) {
    main.innerHTML = kopf + `
      <div class="card"><h2>Inhalt folgt</h2>
        <p>${esc(g.name)}</p>
        <p class="muted">Dieses Gewerk wird nach der Vorlage Trockenbau gebaut: 3D-Detailmodelle, Schichten, Varianten, Normen mit Quelle, Mängel, Checkliste, Chef-Wissen und Test. Die Reihenfolge der Gewerke legst du fest.</p>
        <p class="muted">Die ATV-Nummern sind aus dem Master-Dokument übernommen. Grün markierte Nummern sind gegen die VOB/C geprüft, die übrigen werden beim Bau der Lektion geprüft.</p>
        <button data-fehler>${icon('flag')} Fehler melden</button>
      </div>`;
    main.querySelector('[data-fehler]').addEventListener('click', () => fehlerMelden(gid, 'Platzhalter'));
    return;
  }

  main.innerHTML = kopf + `
    <p style="max-width:900px">${esc(d.kurz)}</p>
    <div data-modell></div>
    <div class="tabs" role="tablist">${TABS.map(([k, n]) => `<button role="tab" data-tab="${k}">${n}</button>`).join('')}</div>
    <div class="tab-body" data-body></div>
    <hr>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
      <label class="switch"><input type="checkbox" data-gelesen ${st.gelesen ? 'checked' : ''}> Lektion gelesen</label>
      <label class="switch"><input type="checkbox" data-wdh ${st.wdhAus ? '' : 'checked'}> Lektion in Wiederholung</label>
      <span class="spacer" style="flex:1"></span>
      <button data-fehler>${icon('flag')} Fehler melden</button>
      <a class="btn btn-primary" href="#/gewerk/${gid}/test?neu=1">${icon('play')} Test starten</a>
    </div>`;

  const ansicht = new ModellAnsicht(main.querySelector('[data-modell]'), d, { modell: params.modell, schicht: schichtId });
  const body = main.querySelector('[data-body]');
  let tab = params.tab && TABS.some(t => t[0] === params.tab) ? params.tab : 'ueberblick';
  const zeigeTab = k => {
    tab = k;
    main.querySelectorAll('[data-tab]').forEach(b => { b.classList.toggle('active', b.dataset.tab === k); b.setAttribute('aria-selected', b.dataset.tab === k); });
    body.innerHTML = tabInhalt(d, k, ansicht);
    body.querySelectorAll('[data-zeige]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      const [m, s] = a.dataset.zeige.split('|');
      if (m && m !== ansicht.modellId) { ansicht.modellId = m; ansicht.varianteId = null; ansicht.auswahl = s; ansicht.laden(); }
      ansicht.waehle(s, true);
      main.querySelector('[data-modell]').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  };
  main.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => zeigeTab(b.dataset.tab)));
  zeigeTab(tab);
  if (params.tab) setTimeout(() => main.querySelector('.tabs').scrollIntoView({ block: 'start' }), 50);

  main.querySelector('[data-gelesen]').addEventListener('change', e => { st.gelesen = e.target.checked; S.speichern(); window.dispatchEvent(new Event('fortschritt')); });
  main.querySelector('[data-wdh]').addEventListener('change', e => { st.wdhAus = !e.target.checked; S.speichern(); window.dispatchEvent(new Event('fortschritt')); toast(e.target.checked ? 'Lektion in Wiederholung aufgenommen' : 'Lektion aus Wiederholung herausgenommen'); });
  main.querySelector('[data-fehler]').addEventListener('click', () => fehlerMelden(gid, `Reiter ${tab}`));
  return () => ansicht.dispose();
}

function quelleText(id) {
  const q = quelle(id);
  if (!q) return '';
  return `${esc(q.titel)}${q.stand && q.stand !== '–' ? ` (${q.stand === 'ungeprüft' ? 'Ausgabe ungeprüft' : 'Stand ' + esc(q.stand)})` : ''}`;
}

function tabInhalt(d, k, ansicht) {
  const L = d.lesen || {};
  switch (k) {
    case 'ueberblick': return `<div style="max-width:900px">${md(L.ueberblick)}</div>`;
    case 'aufbau': return d.modelle.map(m => `
      <h3>${esc(m.name)}</h3><p class="muted">${esc(m.text || '')}</p>
      <div style="overflow-x:auto"><table><thead><tr><th>Schicht</th><th>Fachbegriff</th><th>Material</th><th>Dicke</th><th>Funktion</th><th>Stufe</th></tr></thead><tbody>
      ${m.schichten.filter(s => !s.nurIn).map(s => `<tr><td><a href="#" data-zeige="${m.id}|${s.id}">${esc(s.name)}</a>${neuBadge(s.neu)}</td><td>${esc(s.fachbegriff || '')}</td><td>${esc(s.material || '')}</td><td>${s.dicke_mm != null ? String(s.dicke_mm).replace('.', ',') + ' mm' : ''}</td><td>${esc(s.funktion || '')}</td><td>${stufeBadge(s.stufe)}</td></tr>`).join('')}
      </tbody></table></div>`).join('');
    case 'varianten': return d.modelle.filter(m => (m.varianten || []).length > 1).map(m => `
      <h3>${esc(m.name)}</h3>
      <div style="overflow-x:auto"><table><thead><tr><th>Variante</th><th>Platte</th><th>Einsatz</th><th>Vorteile</th><th>Nachteile</th></tr></thead><tbody>
      ${m.varianten.map(v => `<tr><td><strong>${esc(v.name)}</strong></td><td>${esc(v.platte || '')}</td><td>${esc(v.einsatz || '')}</td><td><ul>${(v.vorteile || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></td><td><ul>${(v.nachteile || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></td></tr>`).join('')}
      </tbody></table></div><p class="muted">Im Modell oben über die Varianten-Knöpfe umschalten.</p>`).join('');
    case 'ablauf': return `<ol style="max-width:900px">${(L.ablauf || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol>`;
    case 'begriffe': return `<div style="overflow-x:auto"><table><thead><tr><th>Begriff</th><th>Erklärung</th><th>im 3D-Modell</th></tr></thead><tbody>
      ${(L.begriffe || []).map(b => `<tr><td><strong>${esc(b.begriff)}</strong></td><td>${esc(b.erklaerung)}</td><td>${b.schicht ? `<a href="#" data-zeige="${b.modell || ''}|${b.schicht}">zeigen</a>` : ''}</td></tr>`).join('')}
      </tbody></table></div>`;
    case 'normen': return `<p class="muted">Jeder Wert mit Quelle, Ausgabe und Verlässlichkeit. „ungeprüft“ heißt: Wert oder Ausgabe konnte nicht belegt werden. Kritische Werte gegen Fachbuch oder Herstellerunterlagen prüfen.</p>
      <div style="overflow-x:auto"><table><thead><tr><th>Regel</th><th>Wert</th><th>Quelle</th><th>Stufe</th></tr></thead><tbody>
      ${(L.normen || []).map(n => `<tr><td>${esc(n.regel)}${neuBadge(n.neu)}</td><td>${esc(n.wert)}</td><td class="quelle">${quelleText(n.quelle)}</td><td>${stufeBadge(n.stufe)}</td></tr>`).join('')}
      </tbody></table></div><p class="muted" style="font-size:.85rem">Lernhilfe, keine Rechtsberatung und kein Ersatz für die Norm.</p>`;
    case 'schnittstellen': return `<table><thead><tr><th>Thema</th><th>Wer ist zuständig?</th></tr></thead><tbody>
      ${(L.schnittstellen || []).map(s => `<tr><td><strong>${esc(s.thema)}</strong></td><td>${esc(s.zustaendig)}</td></tr>`).join('')}</tbody></table>`;
    case 'bauphysik': return `<div class="grid grid-2">${(L.bauphysik || []).map(b => `<div class="card"><h3>${esc(b.thema)}</h3><p>${esc(b.text)}</p></div>`).join('')}</div>`;
    case 'maengel': return `<div style="overflow-x:auto"><table><thead><tr><th>Mangel</th><th>Erkennen</th><th>Ursache</th><th>Folge</th></tr></thead><tbody>
      ${(L.maengel || []).map(m => `<tr><td><strong>${esc(m.mangel)}</strong></td><td>${esc(m.erkennen)}</td><td>${esc(m.ursache)}</td><td>${esc(m.folge)}</td></tr>`).join('')}</tbody></table></div>`;
    case 'checkliste': return `<div class="grid grid-2">
      <div class="card"><h3>Zwischenbegehung</h3><ul class="check-list">${(L.checkliste?.zwischen || []).map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>
      <div class="card"><h3>Abnahme</h3><ul class="check-list">${(L.checkliste?.abnahme || []).map(c => `<li>${esc(c)}</li>`).join('')}</ul></div></div>
      <p><a href="#/bauueberwachung">Alle Checklisten im Bereich Bauüberwachung</a></p>`;
    case 'chef': return `<ul style="max-width:900px">${(L.chef || []).map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;
    case 'quellen': return `<table><thead><tr><th>Quelle</th><th>Stand</th><th>Stufe</th><th>Geprüft</th></tr></thead><tbody>
      ${(d.quellen || []).map(quelle).filter(Boolean).map(q => `<tr><td>${esc(q.titel)}${q.hinweis ? `<br><small class="muted">${esc(q.hinweis)}</small>` : ''}</td><td>${esc(q.stand)}</td><td>${stufeBadge(q.stand === 'ungeprüft' ? 'ungeprueft' : q.stufe)}</td><td class="quelle">${esc(q.geprueft || '–')}</td></tr>`).join('')}
      </tbody></table><p><a href="#/quellen">Vollständiges Quellenregister</a></p>`;
  }
  return '';
}
