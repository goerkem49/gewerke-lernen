// Feste Farbcodierung je Materialgruppe (Master-Dokument, Abschnitt Design)
import * as THREE from 'three';

export const FARBEN = {
  beton: { farbe: 0x9ea3a8, name: 'Beton' },
  mauerwerk: { farbe: 0xd8d2c4, name: 'Mauerwerk (Kalksandstein)' },
  ziegel: { farbe: 0xb8693f, name: 'Ziegel' },
  daemmung: { farbe: 0xf2c94c, name: 'Dämmung' },
  gipsplatte: { farbe: 0xf4f4f1, name: 'Gipsplatte (GKB)' },
  gkbi: { farbe: 0x5fae6b, name: 'Gipsplatte imprägniert (GKBI/H2)' },
  gkf: { farbe: 0xd9534f, name: 'Gipsplatte Feuerschutz (GKF/DF)' },
  gkfi: { farbe: 0xd9534f, streifen: 0x5fae6b, name: 'Gipsplatte Feuerschutz imprägniert (GKFI/DFH2)' },
  holz: { farbe: 0xa86f3d, name: 'Holz' },
  stahl: { farbe: 0xc3c9cf, metall: true, name: 'Stahlprofil (verzinkt)' },
  stahl2: { farbe: 0x8d959e, metall: true, name: 'Stahlprofil 2 mm (UA)' },
  folie: { farbe: 0x2f80ed, transparent: 0.75, name: 'Folie / Dampfbremse' },
  unterdeckbahn: { farbe: 0x7fb2f0, transparent: 0.85, name: 'Unterdeckbahn' },
  dichtung: { farbe: 0x2b4c7e, name: 'Dichtungsband' },
  spachtel: { farbe: 0xe7dfc8, name: 'Spachtelmasse' },
  anstrich: { farbe: 0xeef3f5, transparent: 0.45, name: 'Anstrich (durchscheinend dargestellt)' },
  elektro: { farbe: 0xe67e22, name: 'Elektro (Leerrohr, Dose)' },
  wasser: { farbe: 0x2a9d8f, name: 'Wasserleitung' },
  warmwasser: { farbe: 0xc0392b, name: 'Warmwasser' },
  abwasser: { farbe: 0x7d8790, name: 'Abwasserrohr' },
  kg: { farbe: 0xc8642a, name: 'Grundleitung (KG-Rohr)' },
  keramik: { farbe: 0xfafafa, name: 'Sanitärkeramik' },
  fliese: { farbe: 0xcfe0e6, name: 'Fliese' },
  abdichtung: { farbe: 0x6f8fb3, name: 'Abdichtung im Verbund' },
  estrich: { farbe: 0xc9c0ae, name: 'Estrich' },
  parkett: { farbe: 0xc49562, name: 'Parkett' },
  putz: { farbe: 0xf1ece2, name: 'Putz' },
  wdvs: { farbe: 0xf6f1e4, name: 'WDVS-Oberputz' },
  dachziegel: { farbe: 0x9c3f2b, name: 'Dachdeckung' },
  flachdach: { farbe: 0x4a4f55, name: 'Flachdachabdichtung' },
  glas: { farbe: 0x9fd3f0, transparent: 0.35, name: 'Glas' },
  rahmen: { farbe: 0xf8f8f8, name: 'Fensterrahmen' },
  rahmen2: { farbe: 0x3d4247, name: 'Rahmen anthrazit' },
  metall: { farbe: 0x55595e, metall: true, name: 'Metallbau' },
  erde: { farbe: 0x8a6a48, name: 'Erdreich' },
  rasen: { farbe: 0x6d9c4f, name: 'Rasen' },
  pflaster: { farbe: 0x9a958d, name: 'Pflaster' },
  markierung: { farbe: 0xd62828, name: 'Markierung' },
  technik: { farbe: 0x7f8c8d, name: 'Haustechnik' },
  aufzug: { farbe: 0xb0b7bf, metall: true, name: 'Aufzug' },
  tuer: { farbe: 0xe9e4da, name: 'Innentür' },
};

const cache = new Map();

function streifenTextur(a, b) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#' + a.toString(16).padStart(6, '0');
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#' + b.toString(16).padStart(6, '0');
  for (let i = -64; i < 128; i += 24) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 10, 0); g.lineTo(i + 74, 64); g.lineTo(i + 64, 64); g.closePath(); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 4);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function material(key) {
  if (cache.has(key)) return cache.get(key);
  const f = FARBEN[key] || FARBEN.gipsplatte;
  const opts = {
    color: f.streifen ? 0xffffff : f.farbe,
    roughness: f.metall ? 0.45 : 0.85,
    metalness: f.metall ? 0.55 : 0.0,
  };
  if (f.streifen) opts.map = streifenTextur(f.farbe, f.streifen);
  if (f.transparent) { opts.transparent = true; opts.opacity = f.transparent; opts.depthWrite = false; }
  const m = new THREE.MeshStandardMaterial(opts);
  m.userData.key = key;
  cache.set(key, m);
  return m;
}

export function hexFarbe(key) {
  const f = FARBEN[key] || FARBEN.gipsplatte;
  return '#' + f.farbe.toString(16).padStart(6, '0');
}

export const kantenMaterial = new THREE.LineBasicMaterial({ color: 0x1f2328, transparent: true, opacity: 0.28 });
export const markierMaterial = new THREE.MeshStandardMaterial({ color: 0xff8a00, emissive: 0xff6a00, emissiveIntensity: 0.55, roughness: 0.6 });
