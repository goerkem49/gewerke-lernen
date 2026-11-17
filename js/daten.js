// Lädt die Gewerk-Inhalte und baut Indizes (Frage -> Gewerk, Begriffe für Lexikon und Suche)
import { GEWERKE, gewerkMeta } from '../data/gewerke.js';

const inhalte = new Map();
const frageIndex = new Map();   // qid -> { gewerk, frage }

export async function ladeAlles() {
  const mitInhalt = GEWERKE.filter(g => g.inhalt);
  await Promise.all(mitInhalt.map(async g => {
    try {
      const mod = await import(`../data/gewerke/${g.id}.js`);
      inhalte.set(g.id, mod.default);
      for (const f of mod.default.fragen || []) frageIndex.set(f.id, { gewerk: g.id, frage: f });
      for (const b of mod.default.lesen?.begriffe || []) {
        frageIndex.set(kartenId(g.id, b.begriff), { gewerk: g.id, karte: b });
      }
    } catch (e) {
      console.warn('Inhalt nicht geladen:', g.id, e);
    }
  }));
}

export const inhalt = id => inhalte.get(id);
export const hatInhalt = id => inhalte.has(id);
export const alleInhalte = () => [...inhalte.values()];
export const frage = qid => frageIndex.get(qid);
export const gewerkVonFrage = qid => frageIndex.get(qid)?.gewerk || null;
export const kartenId = (gid, begriff) => `karte:${gid}:${begriff}`;

export function alleBegriffe() {
  const r = [];
  for (const [gid, d] of inhalte) {
    for (const b of d.lesen?.begriffe || []) r.push({ ...b, gewerk: gid, gewerkName: gewerkMeta(gid)?.kurzname || d.name });
  }
  return r.sort((a, b) => a.begriff.localeCompare(b.begriff, 'de'));
}

export { GEWERKE, gewerkMeta };
