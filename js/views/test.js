// Testsystem, Wiederholen (Leitner) und Karteikarten
import * as S from '../store.js';
import { inhalt, frage as frageInfo, gewerkVonFrage, alleBegriffe, kartenId, GEWERKE, gewerkMeta, hatInhalt } from '../daten.js';
import { Viewer } from '../three/viewer.js';
import { baueModell } from '../three/bauteil.js';
import { esc, icon, shuffle, md, datum, toast } from '../util.js';

export const TYP_NAME = {
  mc: 'Multiple Choice', wf: 'Wahr oder falsch', sortieren: 'Reihenfolge sortieren', beschriften: 'Bild beschriften',
  zustaendig: 'Wer ist zuständig?', fall: 'Fallstudie', grenzwert: 'Grenzwert-Quiz', mangel: 'Mängel erkennen', vergleich: 'Bauweisen- und Variantenvergleich',
};
const BESTANDEN = 80;

// ---------- Sitzung anlegen / vorbereiten ----------
function neueSitzung(art, qids, gewerk) {
  const s = { art, gewerk, reihenfolge: shuffle(qids), pos: 0, antworten: {}, perm: {}, start: Date.now() };
  for (const qid of s.reihenfolge) vorbereiten(s, qid);
  return s;
}

function vorbereiten(s, qid) {
  const info = frageInfo(qid);
  if (!info || !info.frage) return;
  const q = info.frage;
  if (q.typ === 'sortieren') {
    let p = shuffle(q.reihenfolge.map((_, i) => i));
    if (p.every((v, i) => v === i)) p = p.reverse();
    s.perm[qid] = p;
  } else if (q.typ === 'beschriften') {
    const d = inhalt(info.gewerk);
    const m = d.modelle.find(x => x.id === q.modell);
    const ziel = m.schichten.find(x => x.id === q.schicht);
    const andere = shuffle([...new Set(m.schichten.filter(x => x.id !== q.schicht && x.fachbegriff && x.fachbegriff !== ziel.fachbegriff).map(x => x.fachbegriff))]).slice(0, 3);
    s.perm[qid] = shuffle([ziel.fachbegriff, ...andere]);
  } else {
    const n = q.typ === 'wf' ? 2 : (q.optionen || []).length;
    s.perm[qid] = q.typ === 'wf' ? [0, 1] : shuffle([...Array(n).keys()]);
  }
}

function optionen(q, info) {
  if (q.typ === 'wf') return ['Wahr', 'Falsch'];
  return q.optionen;
}
function istRichtig(q, info, antwort, s) {
  if (q.typ === 'wf') return (antwort === 0) === q.richtig;
  if (q.typ === 'sortieren') return antwort.every((v, i) => v === i);
  if (q.typ === 'beschriften') {
    const m = inhalt(info.gewerk).modelle.find(x => x.id === q.modell);
    return antwort === m.schichten.find(x => x.id === q.schicht).fachbegriff;
  }
  return antwort === q.richtig;
}

// ---------- Anzeige einer Frage ----------
function frageHtml(q) {
  if (q.typ === 'wf') return `<div class="quiz-q">${esc(q.aussage)}</div>`;
  if (q.typ === 'fall') return `<div class="note info" style="margin-bottom:10px"><strong>Situation:</strong> ${esc(q.situation)}</div><div class="quiz-q">${esc(q.frage)}</div>`;
  return `<div class="quiz-q">${esc(q.frage)}</div>`;
}

function zeigeFrage(box, s, qid, { onAntwort, onWeiter, sessionKey, letzte }) {
  const info = frageInfo(qid);
  if (!info) { onWeiter(); return; }
  const { frage: q, gewerk: gid } = info;
  const beantwortet = s.antworten[qid];
  const gname = gewerkMeta(gid)?.kurzname || gid;
  box.innerHTML = `
    <div class="card">
      <div class="quiz-typ">${esc(TYP_NAME[q.typ] || q.typ)} · ${esc(gname)}</div>
      ${frageHtml(q)}
      <div data-antwort></div>
      <div data-feedback></div>
    </div>`;
  const ant = box.querySelector('[data-antwort]');
  const fb = box.querySelector('[data-feedback]');

  const fertig = (antwort) => {
    if (s.antworten[qid]) return;
    const r = istRichtig(q, info, antwort, s);
    s.antworten[qid] = { antwort, richtig: r, zeit: Date.now() };
    S.setSitzung(sessionKey, s);
    const wdhAlt = S.wdhEintrag(qid);
    S.bewerte(qid, r);
    if (wdhAlt && wdhAlt.inWdh === false) S.setInWdh(qid, false);
    onAntwort && onAntwort(r);
    rendern();
  };

  const rendern = () => {
    const a = s.antworten[qid];
    if (q.typ === 'sortieren') sortierAnsicht(ant, q, s.perm[qid], a, fertig);
    else if (q.typ === 'beschriften') beschriftAnsicht(ant, q, gid, s.perm[qid], a, fertig);
    else optionAnsicht(ant, q, optionen(q, info), s.perm[qid], a, fertig);
    if (a) {
      const e = S.wdhEintrag(qid);
      fb.innerHTML = `<div class="feedback ${a.richtig ? 'richtig' : 'falsch'}">
        <h3>${a.richtig ? '✓ Richtig' : '✗ Falsch'}</h3>
        <div>${md(q.erklaerung || '')}</div>
        <div class="row">
          <a href="#/gewerk/${gid}?tab=${encodeURIComponent(q.lektion || 'ueberblick')}">${icon('book')} Zur Lektion</a>
          <label class="switch"><input type="checkbox" data-wdh ${e && e.inWdh !== false ? 'checked' : ''}> in Wiederholung</label>
          ${e && e.inWdh !== false ? `<span class="muted" style="font-size:.85rem">Box ${e.box}, wieder fällig am ${datum(e.faellig)}</span>` : ''}
        </div>
      </div>
      <div class="quiz-nav"><span></span><button class="btn-primary" data-weiter>${letzte ? 'Auswertung' : 'Weiter'} ${icon('next')}</button></div>`;
      fb.querySelector('[data-wdh]').addEventListener('change', ev => { S.setInWdh(qid, ev.target.checked); toast(ev.target.checked ? 'In Wiederholung aufgenommen' : 'Aus Wiederholung herausgenommen'); rendern(); });
      fb.querySelector('[data-weiter]').addEventListener('click', onWeiter);
      fb.querySelector('[data-weiter]').focus();
    } else fb.innerHTML = '';
  };
  rendern();
}

function optionAnsicht(el, q, opts, perm, a, fertig) {
  el.innerHTML = `<div class="options">${perm.map(i => {
    let cls = '';
    if (a) {
      const richtigIdx = q.typ === 'wf' ? (q.richtig ? 0 : 1) : q.richtig;
      if (i === richtigIdx) cls = 'richtig';
      else if (i === a.antwort) cls = 'falsch';
    }
    return `<button data-o="${i}" class="${cls}" ${a ? 'disabled' : ''}>${esc(opts[i])}</button>`;
  }).join('')}</div>`;
  if (!a) el.querySelectorAll('[data-o]').forEach(b => b.addEventListener('click', () => fertig(+b.dataset.o)));
}

function sortierAnsicht(el, q, start, a, fertig) {
  let ordnung = a ? a.antwort.slice() : start.slice();
  const zeichne = () => {
    el.innerHTML = `<p class="muted" style="font-size:.88rem">Ziehen zum Sortieren oder mit den Pfeilen verschieben.</p>
      <ol class="sort-list">${ordnung.map((i, pos) => {
        const cls = a ? (i === pos ? 'richtig' : 'falsch') : '';
        return `<li draggable="${!a}" data-pos="${pos}" class="${cls}"><span class="nr">${pos + 1}</span><span class="txt">${esc(q.reihenfolge[i])}</span>
          ${a ? (i !== pos ? `<small class="muted">richtig: Platz ${i + 1}</small>` : '') : `<button class="btn-ghost btn-small" data-up="${pos}" aria-label="nach oben">${icon('up')}</button><button class="btn-ghost btn-small" data-down="${pos}" aria-label="nach unten">${icon('down')}</button>`}</li>`;
      }).join('')}</ol>
      ${a ? `<details style="margin-top:8px"><summary>Richtige Reihenfolge</summary><ol>${q.reihenfolge.map(t => `<li>${esc(t)}</li>`).join('')}</ol></details>` : '<div class="quiz-nav"><span></span><button class="btn-primary" data-pruefen>Prüfen</button></div>'}`;
    if (a) return;
    const tauschen = (x, y) => { if (y < 0 || y >= ordnung.length) return; [ordnung[x], ordnung[y]] = [ordnung[y], ordnung[x]]; zeichne(); };
    el.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => tauschen(+b.dataset.up, +b.dataset.up - 1)));
    el.querySelectorAll('[data-down]').forEach(b => b.addEventListener('click', () => tauschen(+b.dataset.down, +b.dataset.down + 1)));
    el.querySelector('[data-pruefen]').addEventListener('click', () => fertig(ordnung.slice()));
    let von = null;
    el.querySelectorAll('li[draggable=true]').forEach(li => {
      li.addEventListener('dragstart', e => { von = +li.dataset.pos; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(von)); } catch { } });
      li.addEventListener('dragend', () => li.classList.remove('dragging'));
      li.addEventListener('dragover', e => { e.preventDefault(); li.classList.add('drop-target'); });
      li.addEventListener('dragleave', () => li.classList.remove('drop-target'));
      li.addEventListener('drop', e => {
        e.preventDefault();
        const nach = +li.dataset.pos;
        if (von === null || von === nach) return;
        const [x] = ordnung.splice(von, 1);
        ordnung.splice(nach, 0, x);
        von = null;
        zeichne();
      });
    });
  };
  zeichne();
}

function beschriftAnsicht(el, q, gid, opts, a, fertig) {
  const d = inhalt(gid);
  const m = d.modelle.find(x => x.id === q.modell);
  const richtig = m.schichten.find(x => x.id === q.schicht).fachbegriff;
  el.innerHTML = `<div class="viewer viewer-quiz" data-v></div>
    <p class="muted" style="font-size:.85rem;margin:.4em 0">Markiert (orange) im Modell „${esc(m.name)}“. Modell drehen, um es genauer anzusehen.</p>
    <div class="options">${opts.map((o, i) => {
      let cls = '';
      if (a) { if (o === richtig) cls = 'richtig'; else if (o === a.antwort) cls = 'falsch'; }
      return `<button data-o="${i}" class="${cls}" ${a ? 'disabled' : ''}>${esc(o)}</button>`;
    }).join('')}</div>`;
  const v = new Viewer(el.querySelector('[data-v]'), { hint: 'Ziehen: drehen · Mausrad: zoomen' });
  if (v.ok) {
    const bau = baueModell(m, (m.varianten || [])[0]?.id);
    bau.setSchritt(99);
    bau.setExplosion(1);
    bau.fokus(q.schicht);
    const lage = m.rahmen.lage;
    v.setInhalt(bau.group, { blick: lage === 'decke' ? [0.55, -0.75, 1] : lage === 'dach' ? [0.9, 0.2, 1.3] : [0.85, 0.45, 1.25], abstand: 0.95 });
  }
  if (!a) el.querySelectorAll('[data-o]').forEach(b => b.addEventListener('click', () => fertig(opts[+b.dataset.o])));
}

// ---------- Sitzungsablauf (Test oder Wiederholung) ----------
function laufen(main, key, s, { titel, zurueck, beiEnde }) {
  const zeichne = () => {
    if (s.pos >= s.reihenfolge.length) { beiEnde(s); return; }
    const qid = s.reihenfolge[s.pos];
    const n = s.reihenfolge.length;
    main.innerHTML = `<div class="quiz">
      <div class="page-head"><div class="grow"><h1>${esc(titel)}</h1></div>
        <div class="actions"><a class="btn" href="${zurueck}">${icon('back')} ${titel === 'Wiederholung' ? 'Wiederholung verlassen' : 'Test verlassen'}</a></div></div>
      <div class="quiz-top"><span class="muted">Frage ${s.pos + 1} von ${n}</span>
        <div class="bar big"><span style="width:${Math.round((s.pos / n) * 100)}%"></span></div>
        <span class="muted">${Object.values(s.antworten).filter(x => x.richtig).length} richtig</span></div>
      <div data-frage></div>
      <p class="muted" style="font-size:.82rem;margin-top:10px">Jede Antwort wird sofort gespeichert. Wer den Test verlässt, macht beim nächsten Öffnen an derselben Frage weiter.</p>
    </div>`;
    zeigeFrage(main.querySelector('[data-frage]'), s, qid, {
      sessionKey: key,
      letzte: s.pos === n - 1,
      onWeiter: () => { s.pos++; S.setSitzung(key, s); zeichne(); window.scrollTo(0, 0); },
    });
  };
  zeichne();
}

function auswertung(main, s, { titel, wiederholenLink, zurueckLink, zurueckText }) {
  const ids = s.reihenfolge.filter(id => s.antworten[id]);
  const richtig = ids.filter(id => s.antworten[id].richtig).length;
  const proz = ids.length ? Math.round((richtig / ids.length) * 100) : 0;
  const falsch = ids.filter(id => !s.antworten[id].richtig);
  main.innerHTML = `<div class="quiz">
    <h1>${esc(titel)}: Auswertung</h1>
    <div class="card">
      <div class="stat">${proz} %</div>
      <div class="stat-label">${richtig} von ${ids.length} richtig · ${proz >= BESTANDEN ? '<span class="pill ok">bestanden</span>' : `<span class="pill bad">noch nicht bestanden (ab ${BESTANDEN} %)</span>`}</div>
      <div class="bar big" style="margin-top:10px"><span style="width:${proz}%"></span></div>
    </div>
    ${falsch.length ? `<div class="card"><h3>Falsch beantwortet (kommt bald in der Wiederholung)</h3><ul>${falsch.map(id => { const f = frageInfo(id)?.frage; return `<li>${esc(f?.frage || f?.aussage || id)}</li>`; }).join('')}</ul></div>` : ''}
    <div class="quiz-nav"><a class="btn" href="${zurueckLink}">${icon('back')} ${esc(zurueckText)}</a>
      <a class="btn-primary btn" href="${wiederholenLink}">${icon('repeat')} Nochmal</a></div>
  </div>`;
  return { proz, richtig, gesamt: ids.length };
}

// ---------- Test eines Gewerks ----------
export function renderTest(main, gid, { neu } = {}) {
  const d = inhalt(gid);
  if (!d) { main.innerHTML = `<div class="empty">Für dieses Gewerk gibt es noch keinen Test.</div>`; return; }
  const key = `test:${gid}`;
  let s = S.sitzung(key);
  if (neu || !s || s.reihenfolge.some(id => !frageInfo(id))) {
    s = neueSitzung('test', d.fragen.map(f => f.id), gid);
    S.setSitzung(key, s);
    if (neu) { history.replaceState(null, '', `#/gewerk/${gid}/test`); }
  }
  S.merkeZuletzt(`#/gewerk/${gid}/test`, `Test ${d.name}`);
  laufen(main, key, s, {
    titel: `Test: ${d.name}`,
    zurueck: `#/gewerk/${gid}`,
    beiEnde: sess => {
      const r = auswertung(main, sess, { titel: `Test: ${d.name}`, wiederholenLink: `#/gewerk/${gid}/test?neu=1`, zurueckLink: `#/gewerk/${gid}`, zurueckText: 'Zur Lektion' });
      const g = S.gewerk(gid);
      if (!sess.gespeichert) {
        g.tests.push({ datum: Date.now(), richtig: r.richtig, gesamt: r.gesamt, proz: r.proz });
        g.best = Math.max(g.best ?? 0, r.proz);
        sess.gespeichert = true;
        S.endeSitzung(key);
        S.merkeZuletzt(`#/gewerk/${gid}`, d.name);
        window.dispatchEvent(new Event('fortschritt'));
      }
    },
  });
}

// ---------- Wiederholen ----------
export function faelligeIds(opt) { return S.faellige(gewerkVonFrage, opt); }

export function renderWiederholen(main, sub, params = {}) {
  if (sub === 'start') return wiederholungLaufen(main, params.neu, params.vorziehen);
  if (sub === 'karten') return karten(main);
  const due = faelligeIds();
  const dueFragen = due.filter(id => !id.startsWith('karte:'));
  const dueKarten = due.filter(id => id.startsWith('karte:'));
  const st = S.get();
  const boxen = [1, 2, 3, 4, 5].map(b => Object.values(st.wdh).filter(e => e.inWdh !== false && e.box === b).length);
  const laufend = S.sitzung('wdh');
  const frueh = faelligeIds({ vorziehen: true }).filter(id => !id.startsWith('karte:')).length;
  const gw = GEWERKE.filter(g => hatInhalt(g.id));
  main.innerHTML = `
    <div class="page-head"><div class="grow"><h1>Wiederholen</h1><p class="muted">Wiederholungssystem mit wachsenden Abständen: Box 1 = 1 Tag, 2 = 3 Tage, 3 = 7 Tage, 4 = 14 Tage, 5 = 30 Tage. Falsch beantwortet: zurück in Box 1.</p></div></div>
    <div class="grid grid-3">
      <div class="card"><div class="stat">${dueFragen.length}</div><div class="stat-label">fällige Fragen</div>
        <div style="margin-top:10px">${laufend ? `<a class="btn btn-primary" href="#/wiederholen/start">${icon('play')} Wiederholung fortsetzen (${laufend.pos + 1}/${laufend.reihenfolge.length})</a>` : dueFragen.length ? `<a class="btn btn-primary" href="#/wiederholen/start?neu=1">${icon('play')} Wiederholung starten</a>` : frueh ? `<span class="muted">Gerade nichts fällig.</span><div style="margin-top:8px"><a class="btn" href="#/wiederholen/start?neu=1&vorziehen=1">${icon('repeat')} Falsche Fragen schon jetzt üben (${frueh})</a></div>` : '<span class="muted">Gerade nichts fällig.</span>'}</div></div>
      <div class="card"><div class="stat">${dueKarten.length}</div><div class="stat-label">fällige Karteikarten</div>
        <div style="margin-top:10px"><a class="btn" href="#/wiederholen/karten">${icon('layers')} Karteikarten lernen</a></div></div>
      <div class="card"><div class="stat-label" style="margin-bottom:6px">Fragen je Box</div>
        ${boxen.map((n, i) => `<div style="display:flex;gap:8px;align-items:center;font-size:.85rem"><span style="width:44px">Box ${i + 1}</span><div class="bar" style="flex:1"><span style="width:${Math.min(100, n * 8)}%"></span></div><span style="width:24px;text-align:right">${n}</span></div>`).join('')}
      </div>
    </div>
    <div class="card"><h3>Tests jederzeit wiederholen</h3>
      <p class="muted">Bestandene Tests lassen sich beliebig oft wiederholen. Pro Gewerk kannst du festlegen, ob seine Fragen in die Wiederholung kommen.</p>
      <table><thead><tr><th>Gewerk</th><th>bestes Ergebnis</th><th>in Wiederholung</th><th></th></tr></thead><tbody>
      ${gw.map(g => { const e = st.gewerke[g.id]; return `<tr><td><a href="#/gewerk/${g.id}">${esc(g.kurzname)}</a></td><td>${e && e.best != null ? e.best + ' %' : '–'}</td>
        <td><label class="switch"><input type="checkbox" data-gw="${g.id}" ${e && e.wdhAus ? '' : 'checked'}> aufnehmen</label></td>
        <td><a class="btn btn-small" href="#/gewerk/${g.id}/test?neu=1">${icon('play')} Test starten</a></td></tr>`; }).join('')}
      </tbody></table>
      <p class="muted" style="font-size:.85rem">Weitere Gewerke erscheinen hier, sobald ihre Inhalte gebaut sind.</p></div>`;
  main.querySelectorAll('[data-gw]').forEach(cb => cb.addEventListener('change', () => {
    S.gewerk(cb.dataset.gw).wdhAus = !cb.checked; S.speichern(); window.dispatchEvent(new Event('fortschritt'));
    toast(cb.checked ? 'Gewerk in Wiederholung aufgenommen' : 'Gewerk aus Wiederholung herausgenommen');
  }));
}

function wiederholungLaufen(main, neu, vorziehen) {
  const key = 'wdh';
  let s = S.sitzung(key);
  if (neu || !s) {
    const ids = faelligeIds({ vorziehen: !!vorziehen }).filter(id => !id.startsWith('karte:'));
    if (!ids.length) { main.innerHTML = `<div class="empty"><h2>Nichts fällig</h2><p>Alle Wiederholungen sind erledigt.</p><a class="btn" href="#/wiederholen">Zurück</a></div>`; return; }
    s = neueSitzung('wdh', ids.slice(0, 20), null);
    S.setSitzung(key, s);
    history.replaceState(null, '', '#/wiederholen/start');
  }
  S.merkeZuletzt('#/wiederholen/start', 'Wiederholung');
  laufen(main, key, s, {
    titel: 'Wiederholung',
    zurueck: '#/wiederholen',
    beiEnde: sess => {
      auswertung(main, sess, { titel: 'Wiederholung', wiederholenLink: '#/wiederholen/start?neu=1', zurueckLink: '#/wiederholen', zurueckText: 'Zur Übersicht' });
      S.endeSitzung(key);
      window.dispatchEvent(new Event('fortschritt'));
    },
  });
}

// ---------- Karteikarten ----------
function karten(main) {
  const alle = alleBegriffe();
  const now = Date.now();
  const st = S.get();
  const mitId = alle.map(b => ({ ...b, id: kartenId(b.gewerk, b.begriff) }))
    .filter(b => !(st.gewerke[b.gewerk] && st.gewerke[b.gewerk].wdhAus));
  const faellig = mitId.filter(b => { const e = st.wdh[b.id]; return e && e.inWdh !== false && e.faellig <= now; });
  const neu = mitId.filter(b => !st.wdh[b.id]);
  const stapel = [...shuffle(faellig), ...shuffle(neu)];
  let i = 0;
  const zeichne = () => {
    if (i >= stapel.length) {
      main.innerHTML = `<div class="empty"><h2>Stapel geschafft</h2><p>Alle fälligen und neuen Karten sind durch.</p><a class="btn" href="#/wiederholen">Zur Übersicht</a></div>`;
      window.dispatchEvent(new Event('fortschritt'));
      return;
    }
    const k = stapel[i];
    const e = st.wdh[k.id];
    main.innerHTML = `<div class="quiz">
      <div class="page-head"><div class="grow"><h1>Karteikarten</h1><p class="muted">${faellig.length} fällig, ${neu.length} neu · Karte ${i + 1} von ${stapel.length}</p></div>
      <div class="actions"><a class="btn" href="#/wiederholen">${icon('back')} Zurück</a></div></div>
      <div class="flashcard" data-card tabindex="0" role="button" aria-label="Karte umdrehen">
        <div class="inner">
          <div class="face front"><span class="muted" style="font-size:.8rem">${esc(k.gewerkName)}</span><h2>${esc(k.begriff)}</h2><span class="muted">Klicken zum Umdrehen</span></div>
          <div class="face back"><h3>${esc(k.begriff)}</h3><p>${esc(k.erklaerung)}</p>
            ${k.schicht ? `<a href="#/gewerk/${k.gewerk}/schicht/${k.schicht}?modell=${k.modell || ''}" data-stop>${icon('layers')} Im 3D-Modell zeigen</a>` : ''}</div>
        </div>
      </div>
      <div class="quiz-nav" style="max-width:620px">
        <label class="switch"><input type="checkbox" data-wdh ${!e || e.inWdh !== false ? 'checked' : ''}> in Wiederholung</label>
        <span style="display:flex;gap:8px"><button data-nein>Nicht gewusst</button><button class="btn-primary" data-ja>Gewusst</button></span>
      </div></div>`;
    const card = main.querySelector('[data-card]');
    const flip = () => card.classList.toggle('flipped');
    card.addEventListener('click', ev => { if (ev.target.closest('[data-stop]')) return; flip(); });
    card.addEventListener('keydown', ev => { if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); flip(); } });
    const bewerten = ok => {
      const an = main.querySelector('[data-wdh]').checked;
      S.bewerte(k.id, ok);
      if (!an) S.setInWdh(k.id, false);
      i++; zeichne();
    };
    main.querySelector('[data-ja]').addEventListener('click', () => bewerten(true));
    main.querySelector('[data-nein]').addEventListener('click', () => bewerten(false));
  };
  zeichne();
}
