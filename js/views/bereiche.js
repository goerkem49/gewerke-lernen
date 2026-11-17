// Bereiche: Start, 3D-Gebäude, Gewerke, Bauweisen, Bauablauf, Bauüberwachung, Recht & Kosten, Lexikon, Quellen
import { GEWERKE, gewerkMeta, hatInhalt, inhalt, alleBegriffe, alleInhalte } from '../daten.js';
import { PHASEN, BAUWEISEN, DAUERPUNKTE, HAEUSER, ATV_BELEGT } from '../../data/gewerke.js';
import { QUELLEN } from '../../data/quellen.js';
import { hausAnsicht } from './haus.js';
import { faelligeIds } from './test.js';
import { atvHtml } from './gewerk.js';
import * as S from '../store.js';
import { esc, icon, stufeBadge, datum } from '../util.js';

const bar = p => `<div class="bar"><span style="width:${p}%"></span></div>`;

// ---------- Start ----------
export function renderStart(main) {
  const st = S.get();
  const due = faelligeIds();
  const mitInhalt = GEWERKE.filter(g => hatInhalt(g.id));
  const gesamt = Math.round(GEWERKE.reduce((a, g) => a + S.fortschritt(g.id), 0) / GEWERKE.length);
  const z = st.zuletzt;
  main.innerHTML = `
    <div class="page-head"><div class="grow"><h1>Hallo Görkem</h1><p class="muted">Dein Referenzhaus in 3D. Klick auf ein Bauteil zeigt Name und Gewerk.</p></div>
      <div class="actions">${z ? `<a class="btn btn-primary" href="${esc(z.route)}">${icon('play')} Weitermachen: ${esc(z.titel)}</a>` : `<a class="btn btn-primary" href="#/gewerk/trockenbau">${icon('play')} Mit Trockenbau starten</a>`}</div></div>
    <div data-haus></div>
    <div class="grid grid-4" style="margin-top:14px">
      <div class="card"><div class="stat">${gesamt} %</div><div class="stat-label">Gesamtfortschritt (26 Gewerke)</div><div style="margin-top:8px">${bar(gesamt)}</div></div>
      <a class="card tile" href="#/wiederholen" style="box-shadow:var(--shadow)"><div class="stat">${due.length}</div><div class="stat-label">fällige Wiederholungen</div></a>
      <div class="card"><div class="stat">${mitInhalt.length} / ${GEWERKE.length}</div><div class="stat-label">Gewerke mit Inhalt</div></div>
      <div class="card"><div class="stat">${Object.values(st.gewerke).reduce((a, g) => a + (g.tests?.length || 0), 0)}</div><div class="stat-label">abgeschlossene Tests</div></div>
    </div>
    <div class="grid grid-2" style="margin-top:14px">
      <div class="card"><h3>Fortschritt je Gewerk</h3>
        ${mitInhalt.map(g => `<div style="margin:8px 0"><div style="display:flex;justify-content:space-between"><a href="#/gewerk/${g.id}">${esc(g.kurzname)}</a><span class="muted">${S.fortschritt(g.id)} %</span></div>${bar(S.fortschritt(g.id))}</div>`).join('')}
        <p class="muted" style="font-size:.85rem">20 % für „gelesen“, 80 % nach dem besten Testergebnis. Alle Gewerke in der Leiste links (Menü oben links).</p></div>
      <div class="card"><h3>Fortschritt je Bereich</h3>
        ${PHASEN.map(p => { const gs = GEWERKE.filter(g => g.phase === p.nr); const v = Math.round(gs.reduce((a, g) => a + S.fortschritt(g.id), 0) / gs.length); return `<div style="margin:6px 0"><div style="display:flex;justify-content:space-between;font-size:.9rem"><span>Phase ${p.nr}: ${esc(p.name)}</span><span class="muted">${v} %</span></div>${bar(v)}</div>`; }).join('')}
      </div>
    </div>
    ${st.fehler.length ? `<div class="card"><h3>${icon('flag')} Deine Fehlermeldungen (${st.fehler.length})</h3><p class="muted">Für die nächste Überarbeitung. Gib sie mir bei Gelegenheit weiter oder schick die Backup-Datei.</p>
      <ul>${st.fehler.slice(-5).reverse().map(f => `<li><strong>${esc(gewerkMeta(f.gewerk)?.kurzname || f.gewerk)}</strong> (${datum(f.datum)}): ${esc(f.text)}</li>`).join('')}</ul>
      <a href="#/notizen">Alle anzeigen</a></div>` : ''}`;
  return hausAnsicht(main.querySelector('[data-haus]'));
}

// ---------- 3D-Gebäude ----------
export function renderGebaeude(main) {
  main.innerHTML = `<div class="page-head"><div class="grow"><h1>3D-Gebäude</h1>
    <p class="muted">Gesamtmodell von außen. Mit „Schnitt“ siehst du ins Innere, „Dach“ blendet die Dachebene aus. Klick auf ein Bauteil führt zum Gewerk. Begehung in Ich-Perspektive, Bauablauf-Regler für das ganze Haus und Mängel-Modus folgen in Phase 6.</p></div></div>
    <div data-haus></div>`;
  return hausAnsicht(main.querySelector('[data-haus]'), { gross: true });
}

// ---------- Gewerke ----------
export function renderGewerke(main) {
  main.innerHTML = `<div class="page-head"><div class="grow"><h1>Gewerke</h1><p class="muted">Alle 26 Gewerke in Bauablauf-Reihenfolge. Jedes ist eine eigene Abteilung mit Lektion, Detailmodellen und Test. Level je Gewerk: Grundlagen → Ausführung → Bauüberwachung → Chef-Wissen.</p></div></div>
    ${PHASEN.map(p => `<h2 style="margin-top:18px">Phase ${p.nr}: ${esc(p.name)}</h2>
      <div class="tiles">${GEWERKE.filter(g => g.phase === p.nr).map(g => {
        const f = S.fortschritt(g.id); const da = hatInhalt(g.id);
        const level = f >= 90 ? 'Chef-Wissen' : f >= 70 ? 'Bauüberwachung' : f >= 30 ? 'Ausführung' : 'Grundlagen';
        return `<a class="tile ${da ? '' : 'leer'}" href="#/gewerk/${g.id}"><h3>${esc(g.kurzname)}</h3>
          <div class="meta">${esc(g.atv)}</div>
          <div style="margin:8px 0 4px">${bar(f)}</div>
          <div class="meta">${da ? `${f} % · Level: ${level}` : 'Inhalt folgt'}</div></a>`;
      }).join('')}</div>`).join('')}`;
}

// ---------- Bauweisen ----------
export function renderBauweisen(main) {
  const st = S.get();
  main.innerHTML = `<div class="page-head"><div class="grow"><h1>Bauweisen</h1><p class="muted">Vergleich der Bauweisen am gleichen Bauteil. Der vollständige Vergleich (Außenwand, Decke, Dach je Bauweise mit Kosten, Bauzeit, Schall-, Brand-, Wärme- und Feuchteschutz, Nachhaltigkeit) folgt nach den Gewerken (Phase 7).</p></div></div>
    <div class="tiles">${BAUWEISEN.map(b => `<div class="tile ${st.bauweise === b.id ? 'active' : ''}" style="${st.bauweise === b.id ? 'border-color:var(--accent)' : ''}"><h3>${esc(b.name)}</h3><p class="meta">${esc(b.text)}</p>${st.bauweise === b.id ? '<span class="pill acc">gewählt (Schalter oben rechts)</span>' : ''}</div>`).join('')}</div>
    <div class="card" style="margin-top:14px"><h3>Schon da: Trockenbauwand mit Metall- oder Holzunterkonstruktion</h3>
      <p>Im Trockenbau kannst du die Unterkonstruktion zwischen Metall (CW/UW) und Holz umschalten und die Vor- und Nachteile vergleichen.</p>
      <a class="btn" href="#/gewerk/trockenbau?tab=varianten">${icon('layers')} Zum Variantenvergleich</a></div>`;
}

// ---------- Bauablauf ----------
export function renderBauablauf(main) {
  main.innerHTML = `<div class="page-head"><div class="grow"><h1>Bauablauf</h1><p class="muted">Zeitstrahl eines Neubaus mit Abhängigkeiten: Was muss fertig sein, bevor das nächste Gewerk beginnt? Fahr mit der Maus über ein Gewerk, um Vorgänger (orange) und Nachfolger (blau) zu sehen.</p></div></div>
    <div class="phasen">${PHASEN.map(p => `<div class="phase-col"><h3>${p.nr} · ${esc(p.name)}</h3>
      ${GEWERKE.filter(g => g.phase === p.nr).map(g => `<a class="tile" data-g="${g.id}" href="#/gewerk/${g.id}"><strong>${esc(g.kurzname)}</strong>
        <div class="meta">nach: ${g.vorgaenger.map(v => esc(gewerkMeta(v)?.kurzname || v)).join(', ') || '–'}</div></a>`).join('')}</div>`).join('')}</div>
    <div class="card" style="margin-top:10px"><h3>Typische Abhängigkeiten</h3><ul>
      <li>Estrich erst nach Fenstereinbau, Innenputz und Rohinstallation.</li>
      <li>Bodenbelag erst bei Belegreife des Estrichs (CM-Messung).</li>
      <li>Trockenbau nach Rohinstallation und Putz, vor Estrich und Maler.</li>
      <li>Fassade erst, wenn Fenster, Rollladenkästen und Klempneranschlüsse sitzen.</li></ul></div>`;
  const tiles = main.querySelectorAll('[data-g]');
  tiles.forEach(t => {
    t.addEventListener('mouseenter', () => {
      const g = gewerkMeta(t.dataset.g);
      tiles.forEach(x => {
        x.style.borderColor = g.vorgaenger.includes(x.dataset.g) ? 'var(--accent)' : g.nachfolger.includes(x.dataset.g) ? 'var(--info)' : '';
        x.style.borderWidth = (g.vorgaenger.includes(x.dataset.g) || g.nachfolger.includes(x.dataset.g)) ? '2px' : '';
      });
    });
    t.addEventListener('mouseleave', () => tiles.forEach(x => { x.style.borderColor = ''; x.style.borderWidth = ''; }));
  });
}

// ---------- Bauüberwachung ----------
export function renderBauueberwachung(main) {
  const mit = GEWERKE.filter(g => hatInhalt(g.id));
  main.innerHTML = `<div class="page-head"><div class="grow"><h1>Bauüberwachung</h1><p class="muted">Begehungs-Checklisten pro Gewerk und Bauphase, Mängelkatalog, Vorbegehung und Abnahme aus Sicht der Bauüberwachung. Zum Lernen und zum Abschreiben.</p></div>
    <div class="actions"><button data-druck>Drucken</button></div></div>
    <div class="card"><h3>Dauerpunkte jeder Begehung</h3><ul class="check-list">${DAUERPUNKTE.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>
    ${mit.map(g => { const L = inhalt(g.id).lesen; return `
      <div class="card"><h2>${esc(g.kurzname)}</h2>
        <div class="grid grid-2"><div><h3>Zwischenbegehung</h3><ul class="check-list">${L.checkliste.zwischen.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>
        <div><h3>Abnahme</h3><ul class="check-list">${L.checkliste.abnahme.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div></div>
        <h3>Mängelkatalog</h3><div style="overflow-x:auto"><table><thead><tr><th>Mangel</th><th>Ursache</th><th>Folge</th></tr></thead><tbody>
        ${L.maengel.map(m => `<tr><td><strong>${esc(m.mangel)}</strong><br><small class="muted">${esc(m.erkennen)}</small></td><td>${esc(m.ursache)}</td><td>${esc(m.folge)}</td></tr>`).join('')}</tbody></table></div></div>`; }).join('')}
    <div class="card"><h3>Folgt</h3><p class="muted">Bautagebuch und Mängelprotokoll (rechtssicher formulieren), Toleranzen nach DIN 18202 und wann ein Mangel ein Mangel ist, Checklisten der übrigen Gewerke.</p></div>`;
  main.querySelector('[data-druck]').addEventListener('click', () => window.print());
}

// ---------- Recht & Kosten ----------
export function renderRecht(main) {
  const kap = [
    ['Vorbegehung und Abnahme', 'Zweck der Vorbegehung, förmliche Abnahme, Protokoll, Vorbehalte, Abnahmeverweigerung, fiktive Abnahme, Teilabnahme, Folgen der Abnahme. Wird als Nächstes gebaut (Phase 5).'],
    ['Vertragsrecht', 'BGB-Werkvertrag und Bauvertrag (§§ 631 ff., 650a ff. BGB), Verbraucherbauvertrag, VOB/A, VOB/B, VOB/C.'],
    ['Mängelrechte', 'Vor und nach der Abnahme, Nacherfüllung, Fristsetzung, Ersatzvornahme, Minderung, Verjährung (BGB vs. VOB/B).'],
    ['Baustellenpraxis', 'Bedenkenanmeldung, Behinderungsanzeige, Anordnungen des Bauherrn.'],
    ['Kalkulation', 'Leistungsverzeichnis lesen, Einheitspreise bilden, Leistungswerte. Mit Rechenaufgaben.'],
    ['Aufmaß und Abrechnung', 'Abrechnungsregeln nach VOB/C Abschnitt 5, Abschlags- und Schlussrechnung.'],
    ['Nachträge', 'Wann berechtigt, wie aufstellen und prüfen.'],
    ['Firma führen', 'Sicherheiten, Versicherungen, Arbeitsschutz, Baustellenverordnung, Personal, Handwerksrecht.'],
  ];
  main.innerHTML = `<div class="page-head"><div class="grow"><h1>Recht & Kosten</h1><p class="muted">Hier sind Rechenaufgaben erlaubt. Jeder Paragraf wird mit Gesetz und Stand zitiert. Lernhilfe, keine Rechtsberatung.</p></div></div>
    <div class="tiles">${kap.map(([t, x], i) => `<div class="tile leer"><h3>${i + 1}. ${esc(t)}</h3><p class="meta">${esc(x)}</p><span class="pill">Inhalt folgt</span></div>`).join('')}</div>`;
}

// ---------- Lexikon ----------
export function renderLexikon(main, begriff) {
  const alle = alleBegriffe();
  const buchst = [...new Set(alle.map(b => b.begriff[0].toUpperCase()))].sort((a, b) => a.localeCompare(b, 'de'));
  main.innerHTML = `<div class="page-head"><div class="grow"><h1>Lexikon</h1><p class="muted">Alle Fachbegriffe A bis Z, verlinkt zu Lektion und 3D-Bauteil. ${alle.length} Begriffe, wächst mit jedem Gewerk.</p></div>
    <div class="actions"><input type="search" placeholder="Begriff filtern" data-filter aria-label="Begriffe filtern"></div></div>
    <div class="chips" style="margin-bottom:10px">${buchst.map(b => `<a class="pill" href="#lex-${b}" data-sprung="${b}">${b}</a>`).join('')}</div>
    <div data-liste></div>`;
  const liste = main.querySelector('[data-liste]');
  const zeichne = f => {
    const sel = alle.filter(b => !f || (b.begriff + ' ' + b.erklaerung).toLowerCase().includes(f.toLowerCase()));
    let akt = '';
    liste.innerHTML = sel.map(b => {
      const l = b.begriff[0].toUpperCase();
      const kopf = l !== akt ? `<h2 id="lex-${l}" style="margin-top:16px">${l}</h2>` : '';
      akt = l;
      return `${kopf}<div class="card" data-begriff="${esc(b.begriff)}" style="padding:10px 14px;margin-top:6px"><strong>${esc(b.begriff)}</strong> <span class="pill">${esc(b.gewerkName)}</span>
        <div>${esc(b.erklaerung)}</div>
        <small><a href="#/gewerk/${b.gewerk}?tab=begriffe">Lektion</a>${b.schicht ? ` · <a href="#/gewerk/${b.gewerk}/schicht/${b.schicht}?modell=${b.modell || ''}">im 3D-Modell</a>` : ''}</small></div>`;
    }).join('') || '<div class="empty">Kein Begriff gefunden.</div>';
  };
  zeichne('');
  main.querySelector('[data-filter]').addEventListener('input', e => zeichne(e.target.value));
  main.querySelectorAll('[data-sprung]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); document.getElementById('lex-' + a.dataset.sprung)?.scrollIntoView({ behavior: 'smooth' }); }));
  if (begriff) {
    const t = [...liste.querySelectorAll('[data-begriff]')].find(x => x.dataset.begriff === begriff);
    if (t) { t.style.borderColor = 'var(--accent)'; setTimeout(() => t.scrollIntoView({ block: 'center' }), 50); }
  }
}

// ---------- Quellenregister ----------
export function renderQuellen(main) {
  main.innerHTML = `<div class="page-head"><div class="grow"><h1>Quellenregister</h1><p class="muted">Alle verwendeten Normen, Gesetze und Regelwerke mit Stand. Grundlage für die monatliche Prüfung auf neue Ausgaben. Drei Stufen: Norm/Gesetz (gesichert), Fachregel/Herstellerangabe (Stand der Technik), Faustregel (klar markiert). „ungeprüft“: Ausgabe nicht belegt.</p></div></div>
    <div class="card" style="overflow-x:auto"><table><thead><tr><th>Quelle</th><th>Stand</th><th>Stufe</th><th>Letzte Prüfung</th></tr></thead><tbody>
    ${QUELLEN.map(q => `<tr><td>${esc(q.titel)}${q.hinweis ? `<br><small class="muted">${esc(q.hinweis)}</small>` : ''}</td><td>${esc(q.stand)}</td><td>${stufeBadge(q.stand === 'ungeprüft' ? 'ungeprueft' : q.stufe)}</td><td class="quelle">${esc(q.geprueft || '–')}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="card"><h3>ATV der VOB/C</h3><p class="muted">Geprüft am 17.11.2026 gegen den VOB/C-Ergänzungsband 2023. Die übrigen ATV-Nummern stammen aus dem Master-Dokument und werden beim Bau der jeweiligen Lektion geprüft.</p>
    <table><thead><tr><th>Gewerk</th><th>ATV</th></tr></thead><tbody>${GEWERKE.map(g => `<tr><td><a href="#/gewerk/${g.id}">${esc(g.kurzname)}</a></td><td>${atvHtml(g)}</td></tr>`).join('')}</tbody></table></div>`;
}

// ---------- Fehlermeldungen ----------
export function renderNotizen(main) {
  const st = S.get();
  main.innerHTML = `<div class="page-head"><div class="grow"><h1>Fehlermeldungen</h1><p class="muted">Notizen aus „Fehler melden“, für die nächste Überarbeitung.</p></div>
    <div class="actions"><button data-kopie>Als Text kopieren</button></div></div>
    ${st.fehler.length ? `<div class="card"><table><thead><tr><th>Datum</th><th>Gewerk</th><th>Ort</th><th>Notiz</th><th></th></tr></thead><tbody>
      ${st.fehler.map((f, i) => `<tr><td>${datum(f.datum)}</td><td>${esc(gewerkMeta(f.gewerk)?.kurzname || f.gewerk)}</td><td>${esc(f.ort || '')}</td><td>${esc(f.text)}</td><td><button class="btn-small" data-weg="${i}">erledigt</button></td></tr>`).join('')}
    </tbody></table></div>` : '<div class="empty">Noch keine Fehlermeldungen.</div>'}`;
  main.querySelectorAll('[data-weg]').forEach(b => b.addEventListener('click', () => { st.fehler.splice(+b.dataset.weg, 1); S.speichern(); renderNotizen(main); }));
  main.querySelector('[data-kopie]').addEventListener('click', async () => {
    const t = st.fehler.map(f => `${datum(f.datum)} | ${gewerkMeta(f.gewerk)?.kurzname || f.gewerk} | ${f.ort || ''} | ${f.text}`).join('\n');
    try { await navigator.clipboard.writeText(t || 'keine'); } catch { /* ohne Zwischenablage */ }
  });
}
