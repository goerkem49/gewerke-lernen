// Fortschrittsspeicher: localStorage (Schlüssel gewerke-lernen-v1), jeder Zugriff in try/catch.
// Zusätzlich Export/Import als JSON-Datei.

const KEY = 'gewerke-lernen-v1';
const TAG = 86400000;
export const BOX_TAGE = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };

function leer() {
  return {
    version: 1,
    haus: 'A',            // gewähltes Startseiten-Haus
    staffel: true,        // Gebäude C: Staffelgeschoss an/aus
    bauweise: 'massiv',
    theme: 'auto',        // auto | hell | dunkel
    sidebar: false,
    gewerke: {},          // id -> { gelesen, wdhAus, tests: [], best }
    laufend: {},          // Test-/Wiederholungs-Sitzungen
    wdh: {},              // Frage-ID -> { box, faellig, inWdh, zuletzt, richtig, falsch }
    zuletzt: null,        // { route, titel, zeit }
    neuGelesen: [],       // IDs gelesener Neuigkeiten
    fehler: [],           // Fehlermeldungen für die nächste Überarbeitung
  };
}

let state = leer();
let speicherOk = true;

export function laden() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...leer(), ...JSON.parse(raw) };
  } catch (e) {
    speicherOk = false;
    state = leer();
  }
  return state;
}

export function speichern() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    speicherOk = true;
  } catch (e) {
    speicherOk = false;
  }
}

export const speicherVerfuegbar = () => speicherOk;
export const get = () => state;

export function setze(feld, wert) {
  state[feld] = wert;
  speichern();
}

export function gewerk(id) {
  if (!state.gewerke[id]) state.gewerke[id] = { gelesen: false, wdhAus: false, tests: [], best: null };
  return state.gewerke[id];
}

// ---------- Wiederholungssystem (Leitner, Box 1–5) ----------

export function wdhEintrag(qid) {
  return state.wdh[qid];
}

export function bewerte(qid, richtig) {
  const now = Date.now();
  const e = state.wdh[qid] || { box: 1, inWdh: true, richtig: 0, falsch: 0 };
  if (richtig) { e.box = Math.min(5, (e.box || 1) + 1); e.richtig = (e.richtig || 0) + 1; }
  else { e.box = 1; e.falsch = (e.falsch || 0) + 1; }
  e.zuletzt = now;
  e.faellig = now + BOX_TAGE[e.box] * TAG;
  if (e.inWdh === undefined) e.inWdh = true;
  state.wdh[qid] = e;
  speichern();
  return e;
}

export function setInWdh(qid, an) {
  const e = state.wdh[qid] || { box: 1, richtig: 0, falsch: 0, faellig: Date.now() + TAG };
  e.inWdh = !!an;
  state.wdh[qid] = e;
  speichern();
}

// Fällige Einträge: inWdh, Fälligkeit erreicht, Gewerk nicht aus der Wiederholung genommen.
// gewerkVon: Funktion qid -> gewerkId (oder null, wenn unbekannt)
// vorziehen: zusätzlich alle Einträge aus Box 1 (zuletzt falsch), auch wenn sie erst morgen fällig sind
export function faellige(gewerkVon, { vorziehen = false } = {}) {
  const now = Date.now();
  return Object.entries(state.wdh)
    .filter(([qid, e]) => {
      if (!e.inWdh || !e.faellig) return false;
      if (e.faellig > now && !(vorziehen && e.box === 1)) return false;
      const g = gewerkVon(qid);
      if (!g) return false;
      return !(state.gewerke[g] && state.gewerke[g].wdhAus);
    })
    .sort((a, b) => a[1].faellig - b[1].faellig)
    .map(([qid]) => qid);
}

// ---------- Laufende Sitzungen (Test fortsetzen) ----------

export function sitzung(key) { return state.laufend[key]; }
export function setSitzung(key, s) { state.laufend[key] = s; speichern(); }
export function endeSitzung(key) { delete state.laufend[key]; speichern(); }

export function merkeZuletzt(route, titel) {
  state.zuletzt = { route, titel, zeit: Date.now() };
  speichern();
}

// ---------- Fortschritt ----------

// 20 % für "gelesen", 80 % nach bestem Testergebnis
export function fortschritt(id) {
  const g = state.gewerke[id];
  if (!g) return 0;
  return Math.round((g.gelesen ? 20 : 0) + (g.best != null ? 0.8 * g.best : 0));
}

// ---------- Backup ----------

export function exportieren() {
  const daten = { ...state, exportiert: new Date().toISOString(), app: 'gewerke-lernen' };
  const blob = new Blob([JSON.stringify(daten, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  a.href = URL.createObjectURL(blob);
  a.download = `gewerke-lernen-fortschritt-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export async function importieren(datei) {
  const text = await datei.text();
  const daten = JSON.parse(text);
  if (!daten || typeof daten !== 'object' || daten.version !== 1 || typeof daten.gewerke !== 'object') {
    throw new Error('Die Datei ist keine gültige Fortschrittsdatei von "Gewerke lernen".');
  }
  delete daten.exportiert; delete daten.app;
  state = { ...leer(), ...daten };
  speichern();
}
