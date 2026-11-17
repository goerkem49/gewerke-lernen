// Parametrisches Detailmodell aus den Schichtdaten eines Gewerks.
// Alle Maße in mm. Koordinaten: x = Wandbreite, y = Höhe, z = Wanddicke (+z = Seite A).
// rahmen.lage: "wand" | "decke" (Seite A zeigt nach unten) | "dach" (geneigt um rahmen.neigung Grad)
import * as THREE from 'three';
import { box, zylinder } from './viewer.js';
import { material } from './materialien.js';

const SPALT = 230;          // Abstand je Schicht in der Explosionsansicht
const MIN_SICHT = 3;        // dünne Schichten sichtbar machen
const T = 1.6;              // dargestellte Blechdicke 0,6 mm
const FLAECHIG = new Set(['platte', 'spachtel', 'anstrich', 'folie', 'massivwand-hinten', 'latten', 'deckung', 'fliesen', 'abdichtung', 'cdquer']);

export function varianteAnwenden(modell, varianteId) {
  const v = (modell.varianten || []).find(x => x.id === varianteId) || (modell.varianten || [])[0] || { id: 'standard' };
  const ers = v.ersetzt || {};
  const aus = new Set(v.ausblenden || []);
  const schichten = modell.schichten
    .filter(s => !(s.nurIn && !s.nurIn.includes(v.id)))
    .filter(s => !aus.has(s.id))
    .map(s => {
      const ov = ers[s.id] || (s.gruppe && ers[s.gruppe]) || null;
      if (!ov) return s;
      return { ...s, ...ov, geometrie: { ...s.geometrie, ...(ov.geometrie || {}) } };
    });
  return { variante: v, schichten, rahmen: { ...modell.rahmen, ...(v.rahmen || {}) } };
}

function bereich(x0, x1, op) {
  // teilt [x0,x1] an der Türöffnung, gibt Abschnitte außerhalb zurück
  if (!op || x1 <= op.x || x0 >= op.x + op.b) return [[x0, x1]];
  const r = [];
  if (op.x > x0) r.push([x0, op.x]);
  if (op.x + op.b < x1) r.push([op.x + op.b, x1]);
  return r;
}

// Rechteck [x0,x1]x[y0,y1] ohne Türöffnung als Liste von Rechtecken
function ohneOeffnung(x0, x1, y0, y1, op) {
  if (!op || x1 <= op.x || x0 >= op.x + op.b || y0 >= op.h) return [[x0, x1, y0, y1]];
  const r = [];
  if (op.x > x0) r.push([x0, op.x, y0, y1]);
  if (op.x + op.b < x1) r.push([op.x + op.b, x1, y0, y1]);
  const a = Math.max(x0, op.x), b = Math.min(x1, op.x + op.b);
  if (b > a && y1 > op.h) r.push([a, b, op.h, y1]);
  return r;
}

function quader(g, x0, x1, y0, y1, z0, z1, mat) {
  const m = box(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, mat);
  g.add(m);
  return m;
}

export function baueModell(modell, varianteId) {
  const { variante, schichten, rahmen } = varianteAnwenden(modell, varianteId);
  const W = rahmen.breite, H = rahmen.hoehe, K = rahmen.kern_mm;
  const op = rahmen.oeffnung || null;
  const ctx = {
    W, H, K, op,
    pos: { a: K / 2, b: -K / 2 },
    idx: { a: 0, b: 0 },
    fugen: { a: [], b: [] },
    staender: [],
    links: schichten.some(s => s.geometrie?.typ === 'massivwand' && s.geometrie.lage !== 'hinten'),
    unten: 4, oben: 4,  // Dichtungsband unter/über UW
  };
  const zBand = g => [K / 2 - (g.zBis ?? K), K / 2 - (g.zVon ?? 0)];

  const wurzel = new THREE.Group();
  const dreh = new THREE.Group();
  wurzel.add(dreh);
  const info = new Map();

  for (const s of schichten) {
    const g = s.geometrie || { typ: 'platte', seite: 'a' };
    const grp = new THREE.Group();
    grp.userData.schicht = s.id;
    const mat = material(s.farbe || 'gipsplatte');
    const d = Math.max(s.dicke_mm || 1, MIN_SICHT);
    let ex = new THREE.Vector3();
    const flaechig = FLAECHIG.has(g.typ) || (g.typ === 'massivwand' && g.lage === 'hinten');
    let z0 = 0, z1 = 0;
    if (flaechig) {
      const seite = g.seite || 'a';
      const dd = g.typ === 'cdquer' ? 27 : d;
      if (seite === 'a') { z0 = ctx.pos.a; z1 = z0 + dd; ctx.pos.a = z1; ex.set(0, 0, ++ctx.idx.a * SPALT); }
      else { z1 = ctx.pos.b; z0 = z1 - dd; ctx.pos.b = z0; ex.set(0, 0, -(++ctx.idx.b) * SPALT); }
    }
    const typ = g.typ === 'massivwand' && g.lage === 'hinten' ? 'massivwand-hinten' : g.typ;

    switch (typ) {
      case 'rohdecke': quader(grp, -300, W + 300, H, H + d, -500, 500, mat); ex.set(0, SPALT * 1.4, 0); break;
      case 'rohboden': quader(grp, -300, W + 300, -d, 0, -500, 500, mat); ex.set(0, -SPALT * 1.4, 0); break;
      case 'massivwand':
        quader(grp, -d, 0, g.yVon ?? 0, g.yBis ?? H, g.zMin ?? -500, g.zMax ?? 500, mat);
        ex.set(-SPALT * 1.4, 0, 0);
        break;
      case 'massivwand-hinten': quader(grp, g.xVon ?? -150, g.xBis ?? W + 150, g.yVon ?? -150, g.yBis ?? H + 150, z0, z1, mat); break;

      case 'markierung': {
        const rot = material('markierung');
        if (ctx.links) {
          const y = g.meterriss ?? 1100;
          quader(grp, 0, 2.5, y - 4, y + 4, -480, 480, rot);
        }
        quader(grp, 0, W, 0.5, 2.5, -4, 4, rot);
        quader(grp, 0, W, H - 2.5, H - 0.5, -4, 4, rot);
        ex.set(0, 0, 0);
        break;
      }

      case 'dichtung': {
        const b = (g.breite ?? K) - 6;
        for (const [a, e] of bereich(0, W, op)) {
          quader(grp, a, e, 0, 4, -b / 2, b / 2, mat);
        }
        quader(grp, 0, W, H - 4, H, -b / 2, b / 2, mat);
        if (ctx.links) quader(grp, 0, 4, 4, H - 4, -b / 2, b / 2, mat);
        ex.set(0, 0, 0);
        break;
      }

      case 'uprofil': {
        const b = g.breite ?? 75, f = g.flansch ?? 40;
        const reihen = g.doppelt ? [-(b / 2 + (g.abstand ?? 5) / 2), b / 2 + (g.abstand ?? 5) / 2] : [g.zMitte ?? 0];
        for (const zc of reihen) {
          for (const [a, e] of bereich(ctx.links ? 4 : 0, W, op)) {
            quader(grp, a, e, ctx.unten, ctx.unten + T, zc - b / 2, zc + b / 2, mat);
            quader(grp, a, e, ctx.unten, ctx.unten + f, zc - b / 2, zc - b / 2 + T, mat);
            quader(grp, a, e, ctx.unten, ctx.unten + f, zc + b / 2 - T, zc + b / 2, mat);
            for (let x = a + 150; x < e - 50; x += 800) quader(grp, x - 5, x + 5, ctx.unten + T, ctx.unten + T + 8, zc - 5, zc + 5, material('metall'));
          }
          const yo = H - ctx.oben;
          quader(grp, ctx.links ? 4 : 0, W, yo - T, yo, zc - b / 2, zc + b / 2, mat);
          quader(grp, ctx.links ? 4 : 0, W, yo - f, yo, zc - b / 2, zc - b / 2 + T, mat);
          quader(grp, ctx.links ? 4 : 0, W, yo - f, yo, zc + b / 2 - T, zc + b / 2, mat);
          for (let x = 150; x < W - 50; x += 800) quader(grp, x - 5, x + 5, yo - T - 8, yo - T, zc - 5, zc + 5, material('metall'));
        }
        break;
      }

      case 'cprofil': {
        const b = g.breite ?? 75, f = g.flansch ?? 50, a = g.achse ?? 625;
        const reihen = g.doppelt ? [-(b / 2 + (g.abstand ?? 5) / 2), b / 2 + (g.abstand ?? 5) / 2] : [g.zMitte ?? 0];
        const pos = [];
        for (let x = ctx.links ? 4 : 0; x <= W + 1; x += a) pos.push(Math.min(x, W));
        if (pos[pos.length - 1] < W - 5) pos.push(W);
        const aus = g.auslassen || [];
        const frei = pos.filter(p => (!op || p < op.x - 40 || p > op.x + op.b + 40) && !aus.some(q => Math.abs(q - p) < 5));
        const y0 = ctx.unten + T + 2, y1 = H - ctx.oben - 15;
        for (const zc of reihen) {
          for (const p of frei) {
            const rueck = p >= W - 1 ? -1 : 1;
            const xw = rueck > 0 ? p : p - T;
            quader(grp, xw, xw + T, y0, y1, zc - b / 2, zc + b / 2, mat);
            const xf0 = rueck > 0 ? p : p - f, xf1 = rueck > 0 ? p + f : p;
            quader(grp, xf0, xf1, y0, y1, zc - b / 2, zc - b / 2 + T, mat);
            quader(grp, xf0, xf1, y0, y1, zc + b / 2 - T, zc + b / 2, mat);
          }
        }
        ctx.staender.push(...frei);
        break;
      }

      case 'uaprofil': {
        if (!op) break;
        const b = g.breite ?? 75, f = 40, t = 3.5;
        const m2 = mat;
        for (const [p, r] of [[op.x, -1], [op.x + op.b, 1]]) {
          const xw = r < 0 ? p - t : p;
          quader(grp, xw, xw + t, ctx.unten, H - ctx.oben, -b / 2, b / 2, m2);
          const xf0 = r < 0 ? p - f : p, xf1 = r < 0 ? p : p + f;
          quader(grp, xf0, xf1, ctx.unten, H - ctx.oben, -b / 2, -b / 2 + t, m2);
          quader(grp, xf0, xf1, ctx.unten, H - ctx.oben, b / 2 - t, b / 2, m2);
          // Anschlusswinkel
          quader(grp, p - 30, p + 30, ctx.unten, ctx.unten + 50, -b / 2 - 4, -b / 2, material('metall'));
          quader(grp, p - 30, p + 30, H - ctx.oben - 50, H - ctx.oben, -b / 2 - 4, -b / 2, material('metall'));
        }
        // Sturz: UW-Profil über der Öffnung, Sturzständer (CW) zum Plattenstoß
        const sm = material('stahl');
        quader(grp, op.x, op.x + op.b, op.h, op.h + T, -b / 2, b / 2, sm);
        quader(grp, op.x, op.x + op.b, op.h, op.h + 40, -b / 2, -b / 2 + T, sm);
        quader(grp, op.x, op.x + op.b, op.h, op.h + 40, b / 2 - T, b / 2, sm);
        const xs = g.sturzstaender ?? (op.x + op.b / 2);
        quader(grp, xs, xs + T, op.h + T, H - ctx.oben - 15, -b / 2, b / 2, sm);
        quader(grp, xs, xs + 50, op.h + T, H - ctx.oben - 15, -b / 2, -b / 2 + T, sm);
        quader(grp, xs, xs + 50, op.h + T, H - ctx.oben - 15, b / 2 - T, b / 2, sm);
        ctx.staender.push(op.x, op.x + op.b);
        break;
      }

      case 'holzriegel': {
        const b = g.breite ?? K, h = g.hoehe ?? 60;
        for (const [a, e] of bereich(ctx.links ? 4 : 0, W, op)) quader(grp, a, e, ctx.unten, ctx.unten + h, -b / 2, b / 2, mat);
        quader(grp, ctx.links ? 4 : 0, W, H - ctx.oben - h, H - ctx.oben, -b / 2, b / 2, mat);
        ctx.riegel = h;
        break;
      }

      case 'holzstaender': {
        const b = g.tiefe ?? K, bx = g.breite ?? 60, a = g.achse ?? 625;
        const r = g.ohneRiegel ? 0 : (ctx.riegel ?? 60);
        const y0 = (g.yVon ?? (ctx.unten + r)), y1 = (g.yBis ?? (H - ctx.oben - r));
        const pos = [];
        for (let x = g.start ?? (ctx.links ? 4 : 0); x <= W + 1; x += a) pos.push(Math.min(x, W - bx));
        const frei = pos.filter(p => !op || p + bx < op.x - 20 || p > op.x + op.b + 20);
        const zc = g.zMitte ?? 0;
        for (const p of frei) quader(grp, p, p + bx, y0, y1, zc - b / 2, zc + b / 2, mat);
        if (op) {
          quader(grp, op.x - bx, op.x, y0, y1, -b / 2, b / 2, mat);
          quader(grp, op.x + op.b, op.x + op.b + bx, y0, y1, -b / 2, b / 2, mat);
          quader(grp, op.x, op.x + op.b, op.h, op.h + bx, -b / 2, b / 2, mat);
          ctx.staender.push(op.x, op.x + op.b);
        }
        ctx.staender.push(...frei.map(p => p + bx / 2));
        break;
      }

      case 'platte': {
        const pb = g.plattenbreite ?? 1250, v = g.versatz ?? 0;
        const ya = g.bodenabstand ?? 10, yb = H - (g.deckenabstand ?? 5);
        const x0g = ctx.links ? 4 : 0;
        const fugen = [];
        for (let s0 = -v; s0 < W; s0 += pb) {
          const a = Math.max(x0g, s0), e = Math.min(W, s0 + pb);
          if (e - a < 2) continue;
          if (s0 > x0g) fugen.push(s0);
          for (const [p0, p1, q0, q1] of ohneOeffnung(a, e, ya, yb, op)) {
            quader(grp, p0 + 1, p1 - 1, q0 + 1, q1 - 1, z0, z1, mat);
          }
        }
        ctx.fugen[g.seite || 'a'] = fugen;
        break;
      }

      case 'spachtel': {
        const breite = g.q === 'Q3' ? 300 : 180;
        const ya = 10, yb = H - 5;
        if (g.q === 'Q4') {
          for (const [p0, p1, q0, q1] of ohneOeffnung(ctx.links ? 4 : 0, W, ya, yb, op)) quader(grp, p0, p1, q0, q1, z0, z1, mat);
        } else {
          for (const f of ctx.fugen[g.seite || 'a']) {
            for (const [p0, p1, q0, q1] of ohneOeffnung(f - breite / 2, f + breite / 2, ya, yb, op)) quader(grp, p0, p1, q0, q1, z0, z1, mat);
          }
          if (op) {
            quader(grp, op.x - 60, op.x, ya, op.h + 60, z0, z1, mat);
            quader(grp, op.x + op.b, op.x + op.b + 60, ya, op.h + 60, z0, z1, mat);
            quader(grp, op.x, op.x + op.b, op.h, op.h + 60, z0, z1, mat);
          }
          if (ctx.links) quader(grp, 4, 70, ya, yb, z0, z1, mat);
          // Schraubenköpfe
          for (const sx of (g.ohneSchrauben ? [] : ctx.staender)) {
            for (let y = 150; y < H - 50; y += 250) {
              if (op && sx > op.x - 30 && sx < op.x + op.b + 30 && y < op.h) continue;
              quader(grp, sx - 12, sx + 12, y - 12, y + 12, z0, z1, mat);
            }
          }
        }
        break;
      }

      case 'anstrich': {
        const ya = g.yVon ?? 10, yb = g.yBis ?? (H - 5);
        for (const [p0, p1, q0, q1] of ohneOeffnung(ctx.links ? 4 : 0, W, ya, yb, op)) quader(grp, p0, p1, q0, q1, z0, z1, mat);
        break;
      }

      case 'folie': {
        const bahn = g.bahnbreite ?? 1500;
        const band = material('dichtung');
        for (let s0 = 0; s0 < H; s0 += bahn) {
          quader(grp, ctx.links ? 4 : 0, W, s0, Math.min(H, s0 + bahn + 100), z0, z1, mat);
          if (s0 > 0) quader(grp, ctx.links ? 4 : 0, W, s0 + 20, s0 + 80, z1, z1 + 1.5, band);
        }
        if (ctx.links) quader(grp, 4, 70, 0, H, z1, z1 + 1.5, band);
        break;
      }

      case 'cdquer': {
        const ab = g.abstand ?? 500;
        for (let y = g.start ?? 150; y < H - 40; y += ab) {
          quader(grp, ctx.links ? 10 : 0, W - 10, y - 30, y + 30, z1 - T, z1, mat);
          quader(grp, ctx.links ? 10 : 0, W - 10, y - 30, y - 30 + T, z0, z1, mat);
          quader(grp, ctx.links ? 10 : 0, W - 10, y + 30 - T, y + 30, z0, z1, mat);
          for (const sx of ctx.staender) quader(grp, sx - 30, sx + 30, y - 45, y + 45, z0 - 8, z0, material('metall'));
        }
        break;
      }

      case 'cdprofil': {
        const [za, zb] = zBand(g);
        const achse = g.achse ?? 625, rand = g.rand ?? 100;
        const liste = [];
        if (g.richtung === 'x') {
          for (let y = rand; y <= H - rand + 1; y += achse) liste.push(y);
          for (const y of liste) {
            quader(grp, ctx.links ? 30 : 0, W - 30, y - 30, y + 30, zb - T, zb, mat);
            quader(grp, ctx.links ? 30 : 0, W - 30, y - 30, y - 30 + T, za, zb, mat);
            quader(grp, ctx.links ? 30 : 0, W - 30, y + 30 - T, y + 30, za, zb, mat);
          }
        } else {
          for (let x = rand; x <= W - rand + 1; x += achse) liste.push(x);
          for (const x of liste) {
            quader(grp, x - 30, x + 30, 30, H - 30, zb - T, zb, mat);
            quader(grp, x - 30, x - 30 + T, 30, H - 30, za, zb, mat);
            quader(grp, x + 30 - T, x + 30, 30, H - 30, za, zb, mat);
          }
          ctx.staender.push(...liste);
          ctx.cdX = liste;
        }
        const mitte = (za + zb) / 2;
        ex.set(0, 0, mitte * 1.6);
        break;
      }

      case 'udprofil': {
        const [za, zb] = zBand(g);
        for (const k of g.kanten || ['links']) {
          if (k === 'links') quader(grp, 0, 28, 0, H, za, zb, mat);
          if (k === 'rechts') quader(grp, W - 28, W, 0, H, za, zb, mat);
          if (k === 'boden') quader(grp, 0, W, 0, 28, za, zb, mat);
          if (k === 'decke') quader(grp, 0, W, H - 28, H, za, zb, mat);
        }
        ex.set(0, 0, ((za + zb) / 2) * 1.6);
        break;
      }

      case 'abhaenger': {
        const [za, zb] = zBand(g);
        const xs = g.achseX ? (() => { const r = []; for (let x = g.randX ?? 100; x <= W - 50; x += g.achseX) r.push(x); return r; })() : (ctx.cdX || [W / 2]);
        for (const x of xs) {
          for (let y = g.randY ?? 300; y < H - 100; y += g.achseY ?? 900) {
            if (g.art === 'direkt') {
              quader(grp, x - 32, x - 30, y - 30, y + 30, za, zb, mat);
              quader(grp, x + 30, x + 32, y - 30, y + 30, za, zb, mat);
              quader(grp, x - 32, x + 32, y - 30, y + 30, za - 2, za, mat);
            } else {
              const st = zylinder(3, zb - za, 'z', x, y, (za + zb) / 2, mat);
              grp.add(st);
              quader(grp, x - 15, x + 15, y - 20, y + 20, za - 4, za + 25, mat);
              quader(grp, x - 25, x + 25, y - 25, y + 25, zb - 5, zb, material('metall'));
            }
          }
        }
        ex.set(0, 0, ((za + zb) / 2) * 1.6);
        break;
      }

      case 'daemmung': {
        const dd = s.dicke_mm || 40;
        let za, zb;
        if (g.zVon != null) [za, zb] = zBand(g);
        else { za = (g.zMitte ?? 0) - dd / 2; zb = za + dd; }
        const y0 = g.yVon ?? 30, y1 = g.yBis ?? H - 30;
        const reihen = g.doppelt ? [-(K / 4), K / 4] : [0];
        const st = [...new Set(ctx.staender.map(x => Math.round(x)))].sort((a, b) => a - b);
        const grenzen = st.length >= 2 ? st : [0, W];
        for (const dz of reihen) {
          for (let i = 0; i < grenzen.length - 1; i++) {
            const a = grenzen[i] + (g.luecke ?? 6), e = grenzen[i + 1] - (g.luecke ?? 6);
            if (e - a < 20) continue;
            if (op && a >= op.x - 5 && e <= op.x + op.b + 5) {
              quader(grp, a, e, op.h + 50, y1, za + dz, zb + dz, mat);
              continue;
            }
            for (const [p0, p1, q0, q1] of ohneOeffnung(a, e, y0, y1, op)) quader(grp, p0, p1, q0, q1, za + dz, zb + dz, mat);
          }
        }
        ex.set(0, 0, g.zVon != null ? ((za + zb) / 2) * 1.6 : 0);
        break;
      }

      case 'elektro': {
        const x = g.x ?? 1000;
        const zr = K / 2 - 20;
        grp.add(zylinder(10, H - 300, 'y', x, 300 + (H - 300) / 2, zr, mat));
        for (const y of g.dosen ?? [300, 1050]) {
          grp.add(zylinder(34, 47, 'z', x, y, K / 2 - 12, mat, null, 20));
        }
        break;
      }

      case 'traverse': {
        quader(grp, g.x0 ?? 40, g.x1 ?? 585, (g.y ?? 850) - 50, (g.y ?? 850) + 50, -K / 2 + 6, K / 2 - 6, mat);
        break;
      }

      case 'traggestell': {
        const cx = g.x ?? W / 2, h = g.hoehe ?? 1120;
        const [za, zb] = zBand(g);
        const st = material('stahl2');
        for (const dx of [-250, 250]) quader(grp, cx + dx - 20, cx + dx + 20, 0, h, zb - 40, zb, st);
        quader(grp, cx - 270, cx + 270, h - 40, h, zb - 40, zb, st);
        quader(grp, cx - 270, cx + 270, 380, 420, zb - 40, zb, st);
        // Füße zum Rohboden, Wandbefestigung nach hinten
        quader(grp, cx - 280, cx - 220, 0, 20, za, zb, st);
        quader(grp, cx + 220, cx + 280, 0, 20, za, zb, st);
        // Spülkasten
        quader(grp, cx - 200, cx + 200, 620, 1080, za + 50, zb - 10, material('technik'));
        // Abgangsbogen DN 90 zum WC
        grp.add(zylinder(45, 160, 'z', cx, 230, zb - 60, material('abwasser')));
        break;
      }

      case 'rohr': {
        for (const r of g.rohre || []) {
          const [x0, y0, zr0] = r.von, [x1, y1, zr1] = r.bis;
          const zA = K / 2 - zr0, zB = K / 2 - zr1;
          const a = new THREE.Vector3(x0, y0, zA), b = new THREE.Vector3(x1, y1, zB);
          const len = a.distanceTo(b);
          const geo = new THREE.CylinderGeometry(r.d / 2, r.d / 2, len, 18);
          const m = new THREE.Mesh(geo, material(r.mat || 'abwasser'));
          m.position.copy(a).add(b).multiplyScalar(0.5);
          m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
          grp.add(m);
        }
        break;
      }

      case 'abdichtung': {
        quader(grp, ctx.links ? 4 : 0, W, 10, g.yBis ?? H - 5, z0, z1, mat);
        const band = material('dichtung');
        quader(grp, ctx.links ? 4 : 0, W, 10, 130, z1, z1 + 1.5, band);
        if (ctx.links) quader(grp, 4, 120, 10, g.yBis ?? H - 5, z1, z1 + 1.5, band);
        break;
      }

      case 'fliesen': {
        const fb = g.fliesenbreite ?? 300, fh = g.fliesenhoehe ?? 600, fuge = 3;
        const x0g = ctx.links ? 4 : 0, yE = g.yBis ?? H - 5;
        for (let y = 10; y < yE - 5; y += fh + fuge) {
          for (let x = x0g; x < W - 5; x += fb + fuge) {
            quader(grp, x, Math.min(W, x + fb), y, Math.min(yE, y + fh), z0, z1, mat);
          }
        }
        break;
      }

      case 'latten': {
        const ab = g.abstand ?? 330, bt = g.lattenbreite ?? 50;
        if (g.richtung === 'y') {
          const xs = ctx.staender.length ? [...new Set(ctx.staender)] : [];
          for (const x of xs) quader(grp, x - bt / 2, x + bt / 2, 0, H, z0, z1, mat);
        } else {
          for (let y = 80; y < H; y += ab) quader(grp, 0, W, y - bt / 2, y + bt / 2, z0, z1, mat);
        }
        break;
      }

      case 'deckung': {
        const reihe = g.reihe ?? 330;
        for (let y = 0; y < H; y += reihe) quader(grp, -100, W + 100, y - 30, y + reihe, z0, z1, mat);
        break;
      }

      case 'wc': {
        const cx = g.x ?? W / 2;
        const zf = ctx.pos.a;
        const ker = material('keramik');
        const wc = new THREE.Group();
        const schuessel = new THREE.Mesh(new THREE.CylinderGeometry(185, 165, 340, 24), ker);
        schuessel.scale.set(1, 1, 1.45);
        schuessel.position.set(cx, 400 - 170, zf + 270);
        wc.add(schuessel);
        wc.add(box(380, 80, 160, cx, 360, zf + 80, ker));
        const deckel = new THREE.Mesh(new THREE.CylinderGeometry(190, 190, 20, 24), material('keramik'));
        deckel.scale.set(1, 1, 1.45);
        deckel.position.set(cx, 410, zf + 270);
        wc.add(deckel);
        wc.add(box(230, 150, 12, cx, 1000, zf + 6, material('stahl')));
        grp.add(wc);
        ex.set(0, 0, (ctx.idx.a + 1) * SPALT);
        break;
      }

      default:
        quader(grp, 0, W, 0, H, -d / 2, d / 2, mat);
    }

    grp.userData.ex = ex;
    dreh.add(grp);
    info.set(s.id, { daten: s, objekt: grp, ex });
  }

  // Drehung je nach Einbaulage
  if (rahmen.lage === 'decke') dreh.rotation.x = Math.PI / 2;
  if (rahmen.lage === 'dach') dreh.rotation.x = (90 - (rahmen.neigung ?? 40)) * Math.PI / 180;
  wurzel.scale.setScalar(0.001);
  wurzel.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(wurzel);
  const c = bb.getCenter(new THREE.Vector3());
  dreh.position.set(-c.x * 1000, -c.y * 1000, -c.z * 1000);

  // ---------- Steuerung ----------
  const schritte = modell.schritte || [];
  let explosion = 0, schritt = schritte.length;

  function setSchritt(n) {
    schritt = n;
    const aktiv = new Set();
    if (!schritte.length) for (const id of info.keys()) aktiv.add(id);
    for (let i = 0; i < Math.min(n, schritte.length); i++) for (const id of schritte[i].schichten) aktiv.add(id);
    for (const [id, e] of info) e.objekt.visible = aktiv.has(id);
    return aktiv;
  }
  function setExplosion(t) {
    explosion = t;
    for (const e of info.values()) e.objekt.position.copy(e.ex).multiplyScalar(t);
  }
  const dimmCache = new Map();
  function fokus(id) {
    for (const [sid, e] of info) {
      e.objekt.traverse(m => {
        if (!m.isMesh) return;
        if (!m.userData.orig) m.userData.orig = m.material;
        if (sid === id) {
          const k = m.userData.orig.clone();
          k.emissive = new THREE.Color(0xff7a00);
          k.emissiveIntensity = 0.6;
          m.material = k;
        } else {
          const o = m.userData.orig;
          if (!dimmCache.has(o)) { const k = o.clone(); k.transparent = true; k.opacity = 0.14; k.depthWrite = false; dimmCache.set(o, k); }
          m.material = dimmCache.get(o);
        }
      });
    }
  }
  setSchritt(schritt);
  return { group: wurzel, info, variante, schichten, setSchritt, setExplosion, fokus, get explosion() { return explosion; }, get schritt() { return schritt; } };
}
