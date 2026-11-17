// Schematische Referenzgebäude A (EFH), B (Doppelhaus), C (MFH). Maße in Metern.
// Jedes Bauteil trägt userData.info = { name, gewerk, text }.
import * as THREE from 'three';
import { box, zylinder, kanten } from './viewer.js';
import { material } from './materialien.js';

const M = material;

function teil(g, mesh, name, gewerk, text, extra = {}) {
  mesh.userData.info = { name, gewerk, text };
  Object.assign(mesh.userData, extra);
  g.add(mesh);
  return mesh;
}

// Wand entlang x (bei fester z-Mitte) mit Öffnungen [{x, b, y, h}] (x = linke Kante, y = Brüstung)
function wandX(x0, x1, y0, y1, zc, t, oeff, mat) {
  const teile = [];
  const o = (oeff || []).filter(q => q.x < x1 && q.x + q.b > x0).sort((a, b) => a.x - b.x);
  let cur = x0;
  for (const q of o) {
    if (q.x > cur) teile.push([cur, q.x, y0, y1]);
    const a = Math.max(q.x, x0), e = Math.min(q.x + q.b, x1);
    if (q.y > y0) teile.push([a, e, y0, Math.min(y1, q.y)]);
    if (q.y + q.h < y1) teile.push([a, e, q.y + q.h, y1]);
    cur = e;
  }
  if (cur < x1) teile.push([cur, x1, y0, y1]);
  return teile.map(([a, e, b, c]) => box(e - a, c - b, t, (a + e) / 2, (b + c) / 2, zc, mat));
}
// Wand entlang z (bei fester x-Mitte)
function wandZ(z0, z1, y0, y1, xc, t, oeff, mat) {
  return wandX(z0, z1, y0, y1, 0, t, oeff, mat).map(m => {
    const p = m.position.clone();
    const g = m.geometry; // Breite liegt in x -> drehen
    m.rotation.y = Math.PI / 2;
    m.position.set(xc, p.y, -p.x);
    return m;
  });
}
function gruppe(meshes, name, gewerk, text, extra) {
  const g = new THREE.Group();
  for (const m of meshes) g.add(m);
  g.userData.info = { name, gewerk, text };
  Object.assign(g.userData, extra || {});
  return g;
}

// Fenster in Wand entlang x (Rahmen + Glas), außen bündig bei zAussen
function fensterX(q, zc, t, rahmenMat = 'rahmen') {
  const g = new THREE.Group();
  const r = 0.07, tiefe = 0.08;
  const xm = q.x + q.b / 2, ym = q.y + q.h / 2;
  g.add(box(q.b, r, tiefe, xm, q.y + r / 2, zc, M(rahmenMat)));
  g.add(box(q.b, r, tiefe, xm, q.y + q.h - r / 2, zc, M(rahmenMat)));
  g.add(box(r, q.h, tiefe, q.x + r / 2, ym, zc, M(rahmenMat)));
  g.add(box(r, q.h, tiefe, q.x + q.b - r / 2, ym, zc, M(rahmenMat)));
  if (q.b > 1.6) g.add(box(r, q.h, tiefe, xm, ym, zc, M(rahmenMat)));
  const glas = new THREE.Mesh(new THREE.BoxGeometry(q.b - 2 * r, q.h - 2 * r, 0.02), M('glas'));
  glas.position.set(xm, ym, zc);
  g.add(glas);
  return g;
}
function fensterZ(q, xc, t, rahmenMat) {
  const g = fensterX({ ...q, x: -(q.x + q.b) }, 0, t, rahmenMat);
  const h = new THREE.Group();
  h.add(g);
  h.rotation.y = Math.PI / 2;
  h.position.x = xc;
  return h;
}

function satteldach(g, x0, x1, z0, z1, yTraufe, neigung, ueberstand, info) {
  const halb = (z1 - z0) / 2;
  const zm = (z0 + z1) / 2;
  const rad = neigung * Math.PI / 180;
  const hoehe = halb * Math.tan(rad);
  const lang = (halb + ueberstand) / Math.cos(rad);
  const breite = x1 - x0 + 2 * ueberstand;
  const dicke = 0.28;
  for (const s of [-1, 1]) {
    const flaeche = box(breite, dicke, lang, (x0 + x1) / 2, 0, 0, M('dachziegel'));
    const pivot = new THREE.Group();
    pivot.add(flaeche);
    flaeche.position.set((x0 + x1) / 2, dicke / 2, s * lang / 2);
    pivot.rotation.x = s * rad;
    pivot.position.set(0, yTraufe + hoehe, zm);
    // Firstpunkt liegt bei z = zm. Die Dachfläche läuft nach außen und unten.
    flaeche.position.set((x0 + x1) / 2, dicke / 2, s * lang / 2);
    pivot.rotation.x = s * rad;
    const gp = new THREE.Group();
    gp.add(pivot);
    gp.userData.info = info.deckung;
    gp.userData.dach = true;
    g.add(gp);
    // Sparren unter der Deckung
    const sp = new THREE.Group();
    for (let x = x0 + 0.3; x <= x1 - 0.2; x += 0.9) {
      const sparren = box(0.08, 0.2, lang, x, -0.1, s * lang / 2, M('holz'));
      sp.add(sparren);
    }
    const pv = new THREE.Group();
    pv.add(sp);
    pv.rotation.x = s * rad;
    pv.position.set(0, yTraufe + hoehe, zm);
    const gs = new THREE.Group();
    gs.add(pv);
    gs.userData.info = info.sparren;
    gs.userData.dach = true;
    g.add(gs);
  }
  // Giebeldreiecke
  const shape = new THREE.Shape();
  shape.moveTo(z0, 0); shape.lineTo(z1, 0); shape.lineTo(zm, hoehe); shape.closePath();
  for (const xg of [x0, x1]) {
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.24, bevelEnabled: false });
    const m = new THREE.Mesh(geo, M('mauerwerk'));
    kanten(m);
    m.rotation.y = -Math.PI / 2;
    m.position.set(xg + (xg === x0 ? 0.24 : 0), yTraufe, 0);
    m.position.x = xg === x0 ? x0 + 0.24 : x1;
    m.userData.info = info.giebel;
    m.userData.dach = true;
    g.add(m);
  }
  // Pfette am First
  g.add(gruppe([box(x1 - x0, 0.2, 0.14, (x0 + x1) / 2, yTraufe + hoehe - 0.25, zm, M('holz'))], 'Firstpfette', 'zimmerer', 'Trägt die Sparren am First.', { dach: true }));
  // Dachrinnen und Fallrohre
  const zr = [z0 - ueberstand + 0.05, z1 + ueberstand - 0.05];
  const yR = yTraufe - ueberstand * Math.tan(rad) - 0.05;
  for (const z of zr) {
    g.add(gruppe([zylinder(0.07, breite, 'x', (x0 + x1) / 2, yR, z, M('metall'))], 'Dachrinne (Hängerinne)', 'klempner', 'Sammelt das Regenwasser an der Traufe und führt es zum Fallrohr.', { dach: true }));
    g.add(gruppe([zylinder(0.045, yR + 0.5, 'y', x1 - 0.1, (yR - 0.5) / 2, z, M('metall'))], 'Fallrohr', 'klempner', 'Leitet das Regenwasser in die Grundleitung.'));
  }
  return hoehe;
}

function gelaende(g, x0, x1, z0, z1, yOben, yUnten, aussen = 8) {
  const erde = M('erde');
  const teile = [
    [x0 - aussen, x1 + aussen, z1, z1 + aussen],
    [x0 - aussen, x1 + aussen, z0 - aussen, z0],
    [x0 - aussen, x0, z0, z1],
    [x1, x1 + aussen, z0, z1],
  ];
  const meshes = [];
  for (const [a, b, c, d] of teile) {
    const m = box(b - a, yOben - yUnten, d - c, (a + b) / 2, (yOben + yUnten) / 2, (c + d) / 2, erde);
    meshes.push(m);
    const r = box(b - a, 0.02, d - c, (a + b) / 2, yOben + 0.01, (c + d) / 2, M('rasen'));
    r.userData.keineAuswahl = true;
    meshes.push(r);
  }
  const gr = gruppe(meshes, 'Gelände / Erdreich', 'erdbau', 'Baugrube nach dem Kellerbau verfüllt und verdichtet.', { umgebung: true });
  g.add(gr);
}

// ---------------- Haus A: Einfamilienhaus ----------------
function hausA() {
  const g = new THREE.Group();
  const X0 = -5, X1 = 5, Z0 = -4.5, Z1 = 4.5, t = 0.24, w = 0.14;
  const yG = -0.5;
  // Gründung und Keller
  teil(g, box(10.6, 0.25, 9.6, 0, -2.875, 0, M('beton')), 'Bodenplatte (WU-Beton)', 'gruendung', 'Stahlbeton-Bodenplatte als Teil der weißen Wanne, trägt die Lasten in den Baugrund ab.');
  const kw = [
    ...wandX(X0, X1, -2.75, -0.2, Z1 - 0.15, 0.3, [], M('beton')),
    ...wandX(X0, X1, -2.75, -0.2, Z0 + 0.15, 0.3, [], M('beton')),
    ...wandZ(Z0 + 0.3, Z1 - 0.3, -2.75, -0.2, X0 + 0.15, 0.3, [], M('beton')),
    ...wandZ(Z0 + 0.3, Z1 - 0.3, -2.75, -0.2, X1 - 0.15, 0.3, [], M('beton')),
  ];
  g.add(gruppe(kw, 'Kellerwand (WU-Beton, weiße Wanne)', 'gruendung', 'Wasserundurchlässiger Beton: die Wand selbst ist die Abdichtung.'));
  const pd = [
    box(10.24, 2.3, 0.1, 0, -1.55, Z1 + 0.05, M('daemmung')), box(10.24, 2.3, 0.1, 0, -1.55, Z0 - 0.05, M('daemmung')),
    box(0.1, 2.3, 9, X0 - 0.05, -1.55, 0, M('daemmung')), box(0.1, 2.3, 9, X1 + 0.05, -1.55, 0, M('daemmung')),
  ];
  g.add(gruppe(pd, 'Perimeterdämmung (XPS)', 'abdichtung-bauwerk', 'Druckfeste Wärmedämmung außen an erdberührten Bauteilen.'));
  teil(g, box(1.8, 1.6, 1.0, 3.2, -1.95, -3.3, M('technik')), 'Hausanschlussraum / Wärmeerzeuger', 'tga-roh', 'Hausanschlüsse (Wasser, Strom, Telekommunikation) und Heizungsverteilung.');
  teil(g, zylinder(0.075, 8, 'z', 1.0, -3.15, 5.5, M('kg')), 'Grundleitung (KG-Rohr DN 150)', 'entwaesserung', 'Führt das Schmutzwasser unter der Bodenplatte zum öffentlichen Kanal.');
  teil(g, box(10.04, 0.2, 9.04, 0, -0.1, 0, M('beton')), 'Kellerdecke (Stahlbeton)', 'beton', 'Trennt Keller und Erdgeschoss, trägt die Lasten auf die Kellerwände ab.');
  gelaende(g, X0 - 0.12, X1 + 0.12, Z0 - 0.12, Z1 + 0.12, yG, -3.2);

  // Erdgeschoss und Obergeschoss
  const oeffEG_v = [{ x: -3.6, b: 1.1, y: 0, h: 2.2 }, { x: -0.6, b: 2.0, y: 0.9, h: 1.4 }, { x: 2.2, b: 2.4, y: 0, h: 2.2 }];
  const oeffOG_v = [{ x: -3.8, b: 1.3, y: 3.65, h: 1.3 }, { x: -0.3, b: 0.8, y: 4.3, h: 0.7 }, { x: 2.4, b: 1.0, y: 2.75, h: 2.2 }];
  const oeffH = [{ x: -3.5, b: 1.3, y: 0.9, h: 1.3 }, { x: 1.4, b: 1.2, y: 1.3, h: 0.9 }, { x: -3.5, b: 1.3, y: 3.65, h: 1.3 }, { x: 1.6, b: 1.3, y: 3.65, h: 1.3 }];
  const oeffS = [{ x: -2.0, b: 1.2, y: 0.9, h: 1.3 }, { x: 1.0, b: 1.2, y: 0.9, h: 1.3 }, { x: -2.0, b: 1.2, y: 3.65, h: 1.3 }, { x: 1.0, b: 1.2, y: 3.65, h: 1.3 }];
  const aw = [
    ...wandX(X0, X1, 0, 5.3, Z1 - t / 2, t, [...oeffEG_v, ...oeffOG_v], M('mauerwerk')),
    ...wandX(X0, X1, 0, 5.3, Z0 + t / 2, t, oeffH, M('mauerwerk')),
    ...wandZ(Z0 + t, Z1 - t, 0, 5.3, X1 - t / 2, t, oeffS.map(q => ({ ...q, x: q.x }))),
    ...wandZ(Z0 + t, Z1 - t, 0, 5.3, X0 + t / 2, t, oeffS),
  ];
  aw.forEach(m => { if (!m.material || m.material.type === 'MeshBasicMaterial') m.material = M('mauerwerk'); });
  g.add(gruppe(aw, 'Außenwand (Kalksandstein-Mauerwerk)', 'mauerwerk', 'Tragende Außenwand, 24 cm Kalksandstein. Wärmeschutz übernimmt das WDVS außen.'));
  const wd = [
    ...wandX(X0 - w, X1 + w, 0 - 0.3, 5.3, Z1 + w / 2, w, [...oeffEG_v, ...oeffOG_v], M('wdvs')),
    ...wandX(X0 - w, X1 + w, -0.3, 5.3, Z0 - w / 2, w, oeffH, M('wdvs')),
    ...wandZ(Z0, Z1, -0.3, 5.3, X1 + w / 2, w, oeffS, M('wdvs')),
    ...wandZ(Z0, Z1, -0.3, 5.3, X0 - w / 2, w, oeffS, M('wdvs')),
  ];
  wd.forEach(m => { m.material = M('wdvs'); });
  g.add(gruppe(wd, 'Fassade: Wärmedämm-Verbundsystem (WDVS)', 'fassade', 'Dämmplatten geklebt und gedübelt, Armierungsschicht mit Gewebe, Oberputz.'));
  // Fenster
  const fen = [];
  for (const q of [...oeffEG_v.slice(1), ...oeffOG_v]) fen.push(fensterX(q, Z1 - 0.06, t));
  for (const q of oeffH) fen.push(fensterX(q, Z0 + 0.06, t));
  for (const q of oeffS) { fen.push(fensterZ(q, X1 - 0.06, t)); fen.push(fensterZ(q, X0 + 0.06, t)); }
  g.add(gruppe(fen, 'Fenster (Kunststoff, 3-fach-Verglasung)', 'fenster', 'Einbau in der Dämmebene mit Anschlussfolien innen luftdicht, außen schlagregendicht.'));
  g.add(gruppe([box(1.1, 2.2, 0.08, -3.05, 1.1, Z1 - 0.08, M('rahmen2'))], 'Haustür', 'fenster', 'Außentür, Einbruch- und Wärmeschutz, barrierearme Schwelle.'));
  const rk = [];
  for (const q of [...oeffOG_v, oeffEG_v[1], oeffEG_v[2]]) rk.push(box(q.b + 0.1, 0.22, 0.22, q.x + q.b / 2, q.y + q.h + 0.11, Z1 + w + 0.11, M('rahmen2')));
  g.add(gruppe(rk, 'Rollladenkasten (Vorbaurollladen)', 'sonnenschutz', 'Sonnen- und Sichtschutz vor dem Fenster.'));
  // Decken
  const deckeMitLoch = y => [
    box(10, 0.2, 9 - 1.4, 0, y, 0.7, M('beton')),
    box(10 - 3.8, 0.2, 1.4, -1.9, y, -3.8, M('beton')),
  ];
  g.add(gruppe(deckeMitLoch(2.65), 'Geschossdecke über EG (Stahlbeton)', 'beton', 'Stahlbetondecke mit Treppenöffnung.'));
  g.add(gruppe([box(10, 0.2, 9, 0, 5.4, 0, M('beton'))], 'Decke über OG (Stahlbeton)', 'beton', 'Oberste Geschossdecke unter dem Dachraum.'));
  // Estrich, Beläge
  g.add(gruppe([box(9.5, 0.08, 8.5, 0, 0.04, 0, M('estrich')), box(9.5, 0.08, 7.0, 0, 2.79, 0.75, M('estrich'))], 'Estrich (schwimmend, mit Fußbodenheizung)', 'estrich', 'Zementestrich auf Trittschall- und Wärmedämmung, Heizrohre im Estrich.'));
  g.add(gruppe([box(4.5, 0.015, 4.0, 2.4, 0.088, 2.2, M('parkett'))], 'Parkett (Wohnzimmer)', 'bodenbelag', 'Fertigparkett verklebt, erst bei Belegreife des Estrichs.'));
  g.add(gruppe([box(2.4, 0.015, 3.0, 0.2, 2.838, 2.75, M('fliese'))], 'Bodenfliesen Bad', 'fliesen', 'Fliesen im Dünnbett auf Abdichtung im Verbund.'));
  // Trockenbau-Innenwände
  const tbEG = [...wandZ(-4.26, 0.5, 0.08, 2.55, -1.0, 0.1, [{ x: -2.0, b: 0.885, y: 0, h: 2.135 }], M('gipsplatte'))];
  const tbOG = [
    ...wandX(-4.76, 4.76, 2.83, 5.3, 0.0, 0.1, [{ x: -2.5, b: 0.885, y: 2.83, h: 2.135 }, { x: 2.5, b: 0.885, y: 2.83, h: 2.135 }, { x: 0.4, b: 0.885, y: 2.83, h: 2.135 }, { x: -1.15, b: 1.2, y: 2.83, h: 2.47 }]),
  ];
  tbEG.concat(tbOG).forEach(m => { m.material = M('gipsplatte'); });
  g.add(gruppe([...tbEG, ...tbOG], 'Trockenbauwand (Metallständerwand, GKB)', 'trockenbau', 'Nichttragende Innenwand: UW/CW-Profile, Gipsplatten, Mineralwolle.'));
  const bad = [...wandZ(0.1, 4.26, 2.83, 5.3, -1.0, 0.1, []), ...wandZ(0.1, 4.26, 2.83, 5.3, 1.5, 0.1, [])];
  bad.forEach(m => { m.material = M('gkbi'); });
  g.add(gruppe(bad, 'Badwand (GKBI / Typ H2, imprägniert)', 'trockenbau', 'Feuchtraum: imprägnierte Gipsplatten, darauf Abdichtung im Verbund und Fliesen.'));
  g.add(gruppe([box(0.885, 2.0, 0.04, 0.84, 3.83, 0.08, M('tuer')), box(0.885, 2.0, 0.04, -1.55, 1.08, -1.6, M('tuer'))], 'Innentür (Röhrenspan, Holzzarge)', 'tischler', 'Türblatt und Zarge vom Tischler, Öffnungsrichtung DIN-links/DIN-rechts beachten.'));
  // Treppe
  const stufen = [];
  const n = 15, rise = 2.75 / n, going = 0.26;
  for (let i = 0; i < n; i++) stufen.push(box(going, rise * (i + 1), 1.0, 0.95 + i * going, rise * (i + 1) / 2 + 0.0, -3.85, M('beton')));
  g.add(gruppe(stufen, 'Treppe (Stahlbeton, 15 Steigungen)', 'beton', 'Steigung ca. 18,3 cm, Auftritt 26 cm: Schrittmaß 2s + a = 62,7 cm.'));
  const gl = [];
  for (let i = 0; i <= n; i += 3) gl.push(box(0.03, 1.0, 0.03, 0.95 + i * going, rise * i + 0.5, -3.33, M('metall')));
  const hl = box(n * going, 0.04, 0.05, 0.95 + n * going / 2, 1.0 + 1.375, -3.33, M('metall'));
  hl.rotation.z = Math.atan(rise / going);
  gl.push(hl);
  g.add(gruppe(gl, 'Treppengeländer', 'metallbau', 'Geländer an der freien Treppenseite, Höhe nach Bauordnung.'));
  // Balkon
  teil(g, box(3.5, 0.2, 1.6, 2.9, 2.65, Z1 + 0.95, M('beton')), 'Balkonplatte (mit Wärmebrücken-Dämmelement)', 'beton', 'Auskragende Platte, thermisch getrennt angeschlossen (z. B. Isokorb).');
  g.add(gruppe([
    box(3.5, 0.05, 0.05, 2.9, 3.75, Z1 + 1.72, M('metall')),
    ...[1.2, 1.9, 2.6, 3.3, 4.0, 4.6].map(x => box(0.03, 1.0, 0.03, x, 3.25, Z1 + 1.72, M('metall'))),
    box(0.05, 0.05, 1.6, 1.17, 3.75, Z1 + 0.95, M('metall')), box(0.05, 0.05, 1.6, 4.63, 3.75, Z1 + 0.95, M('metall')),
  ], 'Balkongeländer (Stahl, verzinkt)', 'metallbau', 'Absturzsicherung, Höhe mind. 0,90 m bzw. 1,10 m je nach Absturzhöhe (Bauordnung).'));
  // Dach
  satteldach(g, X0 - w, X1 + w, Z0 - w, Z1 + w, 5.5, 40, 0.5, {
    deckung: { name: 'Dachdeckung (Dachziegel auf Lattung)', gewerk: 'dach', text: 'Ziegeldeckung auf Trag- und Konterlattung, darunter Unterdeckbahn.' },
    sparren: { name: 'Dachstuhl (Sparren)', gewerk: 'zimmerer', text: 'Sparrendach aus Nadelholz C24, darunter Dachgeschoss-Ausbau möglich.' },
    giebel: { name: 'Giebelwand (Mauerwerk)', gewerk: 'mauerwerk', text: 'Giebel als Mauerwerk, Ortgang vom Dachdecker.' },
  });
  // Garage
  const gw = [
    ...wandX(-8.6, -5.14, 0, 2.8, 3.0 - 0.12, 0.24, [{ x: -8.2, b: 2.6, y: 0, h: 2.2 }], M('mauerwerk')),
    ...wandX(-8.6, -5.14, 0, 2.8, -3.0 + 0.12, 0.24, [], M('mauerwerk')),
    ...wandZ(-2.76, 2.76, 0, 2.8, -8.6 + 0.12, 0.24, [], M('mauerwerk')),
  ];
  gw.forEach(m => { m.material = M('putz'); });
  g.add(gruppe(gw, 'Garage (Mauerwerk, verputzt)', 'putz', 'Mauerwerk mit Außenputz.'));
  teil(g, box(3.6, 0.25, 6.2, -6.85, 2.9, 0, M('flachdach')), 'Garagendach (Flachdach, abgedichtet)', 'dach', 'Flachdachabdichtung mit Gefälle zum Ablauf.');
  teil(g, box(2.6, 2.2, 0.05, -6.9, 1.1, 3.0, M('metall')), 'Garagentor (Sektionaltor)', 'metallbau', 'Tor nach Herstellerangabe, Sturz und Anschläge vom Rohbau.');
  teil(g, box(0.8, 1.0, 0.45, 3.5, yG + 0.5, Z0 - 1.2, M('technik')), 'Wärmepumpe (Außeneinheit)', 'tga-fertig', 'Endmontage und Inbetriebnahme, hydraulischer Abgleich.');
  // Außenanlagen
  g.add(gruppe([box(1.6, 0.04, 9, -3.05, yG + 0.02, Z1 + 4.8, M('pflaster')), box(3.4, 0.04, 9, -6.9, yG + 0.02, 7.5, M('pflaster'))], 'Pflasterflächen (Zugang, Zufahrt)', 'aussenanlagen', 'Betonsteinpflaster auf Bettung und Tragschicht.'));
  return { g, schnitt: 0.0, blick: [0.9, 0.55, 1.2] };
}

// ---------------- Haus B: Doppelhaus ----------------
function hausB() {
  const g = new THREE.Group();
  const yG = -0.4, t = 0.175, w = 0.14;
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -6.6 : 0.03, x1 = s < 0 ? -0.03 : 6.6;
    const xa = s < 0 ? x0 : x1; // Außenseite
    teil(g, box(x1 - x0, 0.3, 9.4, (x0 + x1) / 2, -0.15, 0, M('beton')), 'Bodenplatte (getrennt je Haushälfte)', 'gruendung', 'Die Trennfuge läuft durch Bodenplatte und Fundament, sonst Schallbrücke.');
    const xi = s < 0 ? x1 - t / 2 - 0.0 : x0 + t / 2;
    const ff = [{ x: (x0 + x1) / 2 - 1.6, b: 1.2, y: 0.9, h: 1.3 }, { x: (x0 + x1) / 2 + 0.6, b: 1.1, y: 0, h: 2.2 }, { x: (x0 + x1) / 2 - 1.6, b: 1.2, y: 3.65, h: 1.3 }, { x: (x0 + x1) / 2 + 0.6, b: 1.2, y: 3.65, h: 1.3 }];
    const aw = [
      ...wandX(x0, x1, 0, 5.3, 4.5 - 0.12, 0.24, ff, M('mauerwerk')),
      ...wandX(x0, x1, 0, 5.3, -4.5 + 0.12, 0.24, ff.filter(q => q.y > 0), M('mauerwerk')),
      ...wandZ(-4.26, 4.26, 0, 5.3, xa - s * 0.12, 0.24, [{ x: -1.5, b: 1.2, y: 0.9, h: 1.3 }, { x: -1.5, b: 1.2, y: 3.65, h: 1.3 }], M('mauerwerk')),
    ];
    aw.forEach(m => { m.material = M('mauerwerk'); });
    g.add(gruppe(aw, 'Außenwand (Mauerwerk)', 'mauerwerk', 'Tragende Außenwand.'));
    const wd = [
      ...wandX(x0 - (s < 0 ? w : 0), x1 + (s > 0 ? w : 0), -0.3, 5.3, 4.5 + w / 2, w, ff, M('wdvs')),
      ...wandX(x0 - (s < 0 ? w : 0), x1 + (s > 0 ? w : 0), -0.3, 5.3, -4.5 - w / 2, w, ff.filter(q => q.y > 0), M('wdvs')),
      ...wandZ(-4.5, 4.5, -0.3, 5.3, xa + s * w / 2, w, [{ x: -1.5, b: 1.2, y: 0.9, h: 1.3 }, { x: -1.5, b: 1.2, y: 3.65, h: 1.3 }], M('wdvs')),
    ];
    wd.forEach(m => { m.material = M(s < 0 ? 'wdvs' : 'putz'); });
    g.add(gruppe(wd, 'Fassade (WDVS)', 'fassade', 'Wärmedämm-Verbundsystem, an der Haustrennwand mit sauberem Abschluss.'));
    const fen = [];
    for (const q of ff) if (q.y > 0) fen.push(fensterX(q, 4.5 - 0.06, 0.24));
    for (const q of ff) if (q.y > 0) fen.push(fensterX(q, -4.5 + 0.06, 0.24));
    g.add(gruppe(fen, 'Fenster', 'fenster', 'Kunststofffenster mit 3-fach-Verglasung.'));
    g.add(gruppe([box(1.1, 2.2, 0.08, ff[1].x + 0.55, 1.1, 4.5 - 0.08, M('rahmen2'))], 'Haustür', 'fenster', 'Außentür.'));
    // Haustrennwand-Schale
    teil(g, box(t, 9.2, 9.0, xi, 4.4, 0, M('mauerwerk')), `Haustrennwand, Schale ${s < 0 ? 'links' : 'rechts'} (Kalksandstein 17,5 cm)`, 'mauerwerk', 'Zweischalige Haustrennwand: jede Haushälfte hat eine eigene Schale. Durchgehende Trennfuge mit Mineralwolle bis Oberkante Dach.');
    g.add(gruppe([box(x1 - x0 - 0.3, 0.2, 9 - 0.48, (x0 + x1) / 2 - s * 0.0, 2.65, 0, M('beton'))], 'Geschossdecke (Stahlbeton)', 'beton', 'Decke liegt nur auf der eigenen Schale auf, keine Verbindung zur Nachbarschale.'));
    g.add(gruppe([box(x1 - x0 - 0.5, 0.2, 8.5, (x0 + x1) / 2, 5.4, 0, M('beton'))], 'Decke über OG', 'beton', 'Oberste Geschossdecke.'));
    g.add(gruppe([box(x1 - x0 - 0.5, 0.08, 8.5, (x0 + x1) / 2, 0.04, 0, M('estrich'))], 'Estrich (schwimmend)', 'estrich', 'Randdämmstreifen an der Haustrennwand, sonst Schallbrücke.'));
    const tb = wandZ(-4.26, 1.0, 2.83, 5.3, (x0 + x1) / 2 + 0.4, 0.1, [{ x: -2.0, b: 0.885, y: 2.83, h: 2.135 }], M('gipsplatte'));
    tb.forEach(m => { m.material = M('gipsplatte'); });
    g.add(gruppe(tb, 'Trockenbauwand (Metallständerwand)', 'trockenbau', 'Nichttragende Innenwand im Obergeschoss.'));
    satteldach(g, x0 - (s < 0 ? w : 0.0), x1 + (s > 0 ? w : 0), -4.64, 4.64, 5.5, 38, 0.45, {
      deckung: { name: 'Dachdeckung', gewerk: 'dach', text: 'Ziegeldeckung. An der Haustrennwand getrennte Dachkonstruktion je Haushälfte.' },
      sparren: { name: 'Dachstuhl (Sparren)', gewerk: 'zimmerer', text: 'Sparren je Haushälfte, keine durchlaufenden Hölzer über die Trennfuge.' },
      giebel: { name: 'Giebelwand', gewerk: 'mauerwerk', text: 'Giebel als Mauerwerk.' },
    });
  }
  teil(g, box(0.05, 9.0, 9.0, 0, 4.4, 0, M('daemmung')), 'Trennfuge mit Mineralwolle (5 cm)', 'mauerwerk', 'Fuge zwischen den Schalen, nicht brennbare Mineralwolle. Mörtelbrücken oder durchlaufende Bauteile wären Schallbrücken.');
  gelaende(g, -6.75, 6.75, -4.65, 4.65, yG, -1.2);
  g.add(gruppe([box(1.6, 0.04, 6, -2.4, yG + 0.02, 7.7, M('pflaster')), box(1.6, 0.04, 6, 3.6, yG + 0.02, 7.7, M('pflaster'))], 'Zuwege (Pflaster)', 'aussenanlagen', 'Pflaster auf Bettung.'));
  return { g, schnitt: 0, blick: [0.6, 0.5, 1.25] };
}

// ---------------- Haus C: Mehrfamilienhaus ----------------
function hausC(staffel = true) {
  const g = new THREE.Group();
  const X0 = -10, X1 = 10, Z0 = -6, Z1 = 6, t = 0.24, w = 0.16, hg = 2.9;
  const yG = -0.4;
  // Tiefgarage
  teil(g, box(25, 0.4, 17, 0, -3.6, 1, M('beton')), 'Bodenplatte Tiefgarage (WU-Beton)', 'gruendung', 'Weiße Wanne, mit Gefälle zu den Rinnen.');
  const tg = [
    ...wandX(-12.5, 12.5, -3.4, -0.3, 9.35, 0.3, [], M('beton')), ...wandX(-12.5, 12.5, -3.4, -0.3, -7.35, 0.3, [], M('beton')),
    ...wandZ(-7.2, 9.2, -3.4, -0.3, -12.35, 0.3, [], M('beton')),
    ...wandZ(-7.2, 9.2, -3.4, -0.3, 12.35, 0.3, [{ x: -8.5, b: 3.5, y: -3.4, h: 2.4 }], M('beton')),
  ];
  tg.forEach(m => { m.material = M('beton'); });
  g.add(gruppe(tg, 'Tiefgaragenwände (WU-Beton)', 'gruendung', 'Wasserundurchlässige Außenwände der Tiefgarage.'));
  const st = [];
  for (const x of [-7.5, -2.5, 2.5, 7.5]) for (const z of [-3, 3]) st.push(box(0.35, 3.1, 0.35, x, -1.85, z, M('beton')));
  g.add(gruppe(st, 'Stützen Tiefgarage (Stahlbeton)', 'beton', 'Leiten die Lasten des Wohngebäudes in die Bodenplatte.'));
  teil(g, box(25, 0.3, 17, 0, -0.15, 1, M('beton')), 'Decke über Tiefgarage', 'beton', 'Stahlbetondecke, unterseitig gedämmt.');
  const rampe = box(3.5, 0.3, 11, 14.3, -1.9, 4.0, M('beton'));
  rampe.rotation.x = -Math.atan(3.2 / 11);
  teil(g, rampe, 'Tiefgaragenrampe', 'beton', 'Rampe mit Gefälle, Rinne am Fuß.');
  gelaende(g, -12.5, 12.5, -7.5, 9.5, yG, -3.8, 10);

  const geschosse = staffel ? 3 : 4;
  const fz = [];
  for (let i = 0; i < 4; i++) for (const x of [-8.5, -5.5, 5.0, 8.0]) fz.push({ x, b: 1.3, y: i * hg + 0.9, h: 1.4 });
  const fzS = fz.filter(q => q.y < geschosse * hg);
  const bal = [];
  for (let i = 0; i < geschosse; i++) bal.push({ x: -3.5, b: 1.0, y: i * hg + (i === 0 ? 0.1 : 0.1), h: 2.2 }, { x: 2.6, b: 1.0, y: i * hg + 0.1, h: 2.2 });
  const hoeheG = geschosse * hg;
  const aw = [
    ...wandX(X0, X1, 0, hoeheG, Z1 - t / 2, t, [...fzS, ...bal], M('mauerwerk')),
    ...wandX(X0, X1, 0, hoeheG, Z0 + t / 2, t, fzS, M('mauerwerk')),
    ...wandZ(Z0 + t, Z1 - t, 0, hoeheG, X0 + t / 2, t, Array.from({ length: geschosse }, (_, i) => ({ x: -1.0, b: 1.3, y: i * hg + 0.9, h: 1.4 })), M('mauerwerk')),
    ...wandZ(Z0 + t, Z1 - t, 0, hoeheG, X1 - t / 2, t, Array.from({ length: geschosse }, (_, i) => ({ x: -1.0, b: 1.3, y: i * hg + 0.9, h: 1.4 })), M('mauerwerk')),
  ];
  aw.forEach(m => { m.material = M('mauerwerk'); });
  g.add(gruppe(aw, 'Außenwand (Kalksandstein)', 'mauerwerk', 'Tragende Außenwände.'));
  const wd = [
    ...wandX(X0 - w, X1 + w, -0.3, hoeheG, Z1 + w / 2, w, [...fzS, ...bal], M('wdvs')),
    ...wandX(X0 - w, X1 + w, -0.3, hoeheG, Z0 - w / 2, w, fzS, M('wdvs')),
    ...wandZ(Z0, Z1, -0.3, hoeheG, X0 - w / 2, w, Array.from({ length: geschosse }, (_, i) => ({ x: -1.0, b: 1.3, y: i * hg + 0.9, h: 1.4 })), M('wdvs')),
    ...wandZ(Z0, Z1, -0.3, hoeheG, X1 + w / 2, w, Array.from({ length: geschosse }, (_, i) => ({ x: -1.0, b: 1.3, y: i * hg + 0.9, h: 1.4 })), M('wdvs')),
  ];
  wd.forEach(m => { m.material = M('wdvs'); });
  g.add(gruppe(wd, 'Fassade (WDVS, mineralisch)', 'fassade', 'Im MFH: Brandriegel im WDVS nach Zulassung beachten.'));
  const fen = [];
  for (const q of fzS) { fen.push(fensterX(q, Z1 - 0.06, t)); fen.push(fensterX(q, Z0 + 0.06, t)); }
  for (const q of bal) fen.push(fensterX(q, Z1 - 0.06, t));
  g.add(gruppe(fen, 'Fenster und Balkontüren', 'fenster', 'Kunststoff-Fenster, Balkontüren mit Schwellenabdichtung.'));
  // Decken
  const dk = [];
  for (let i = 1; i <= geschosse; i++) dk.push(box(20, 0.22, 12, 0, i * hg - 0.11, 0, M('beton')));
  g.add(gruppe(dk, 'Wohnungstrenndecken (Stahlbeton 22 cm)', 'beton', 'Massive Decke für Luft- und Trittschallschutz, darauf schwimmender Estrich.'));
  const es = [];
  for (let i = 0; i < geschosse; i++) es.push(box(19.4, 0.08, 11.4, 0, i * hg + 0.04, 0, M('estrich')));
  g.add(gruppe(es, 'Schwimmender Estrich', 'estrich', 'Trittschalldämmung, Randdämmstreifen ringsum: keine Verbindung zu Wänden.'));
  // Treppenhaus und Aufzug
  const th = [
    ...wandX(-2.0, 2.0, 0, hoeheG + hg, -1.0, 0.24, Array.from({ length: geschosse + 1 }, (_, i) => ({ x: -1.6, b: 1.0, y: i * hg + 0.08, h: 2.1 })), M('beton')),
    ...wandZ(-5.76, -1.0, 0, hoeheG + hg, -2.0, 0.24, [], M('beton')),
    ...wandZ(-5.76, -1.0, 0, hoeheG + hg, 2.0, 0.24, [], M('beton')),
  ];
  th.forEach(m => { m.material = M('beton'); });
  g.add(gruppe(th, 'Notwendiges Treppenhaus (Stahlbeton)', 'beton', 'Eigener Brandabschnitt als Rettungsweg, Wände feuerbeständig in Gebäudeklasse 4/5 (Bauordnung).'));
  const tr = [];
  for (let i = 0; i < geschosse + (staffel ? 1 : 0); i++) {
    for (let k = 0; k < 8; k++) tr.push(box(0.27, 0.18, 1.1, -1.4 + k * 0.27, i * hg + 0.09 + k * 0.18, -2.0, M('beton')));
    for (let k = 0; k < 8; k++) tr.push(box(0.27, 0.18, 1.1, 0.9 - k * 0.27, i * hg + 1.53 + k * 0.18, -4.6, M('beton')));
  }
  g.add(gruppe(tr, 'Treppenläufe (Stahlbeton-Fertigteil)', 'beton', 'Zweiläufige Treppe, Läufe trittschallentkoppelt gelagert.'));
  const az = [
    ...wandZ(-5.76, -1.5, -1.2, hoeheG + hg + 1.0, 2.0 + 0.12, 0.2, [], M('beton')),
    ...wandZ(-5.76, -1.5, -1.2, hoeheG + hg + 1.0, 4.4, 0.2, [], M('beton')),
    ...wandX(2.1, 4.5, -1.2, hoeheG + hg + 1.0, -1.5, 0.2, Array.from({ length: geschosse + 1 }, (_, i) => ({ x: 2.7, b: 1.0, y: i * hg + 0.08, h: 2.1 })), M('beton')),
  ];
  az.forEach(m => { m.material = M('beton'); });
  g.add(gruppe(az, 'Aufzugsschacht (Stahlbeton)', 'beton', 'Schacht mit Unterfahrt und Schachtkopf.'));
  teil(g, box(1.6, 2.2, 1.6, 3.3, 1.2, -3.4, M('aufzug')), 'Aufzugskabine', 'tga-roh', 'Aufzugsanlage (DIN 18385): Montage im Rohbau, Abnahme vor Inbetriebnahme.');
  // Wohnungstrennwände und Trockenbau
  const wt = [...wandZ(-0.9, 5.76, 0, hoeheG, -4.0, 0.24, [], M('mauerwerk')), ...wandZ(-0.9, 5.76, 0, hoeheG, 4.0, 0.24, [], M('mauerwerk'))];
  wt.forEach(m => { m.material = M('mauerwerk'); });
  g.add(gruppe(wt, 'Wohnungstrennwand (KS 24 cm)', 'mauerwerk', 'Schallschutz zwischen Wohnungen, Mindestanforderung nach DIN 4109-1.'));
  const tb = [];
  for (let i = 0; i < geschosse; i++) {
    tb.push(...wandX(-9.76, -4.12, i * hg + 0.08, (i + 1) * hg - 0.22, 1.5, 0.1, [{ x: -7.0, b: 0.885, y: i * hg + 0.08, h: 2.135 }], M('gipsplatte')));
    tb.push(...wandX(4.12, 9.76, i * hg + 0.08, (i + 1) * hg - 0.22, 1.5, 0.1, [{ x: 6.0, b: 0.885, y: i * hg + 0.08, h: 2.135 }], M('gipsplatte')));
  }
  tb.forEach(m => { m.material = M('gipsplatte'); });
  g.add(gruppe(tb, 'Trockenbauwände in den Wohnungen', 'trockenbau', 'Metallständerwände als Raumtrennung innerhalb einer Wohnung.'));
  // Balkone
  const bk = [], bg = [];
  for (let i = 1; i < geschosse + 1; i++) {
    for (const xc of [-3.0, 3.1]) {
      if (i === geschosse && !staffel) continue;
      bk.push(box(2.6, 0.2, 1.6, xc, (i - 1) * hg + 0.0 - 0.1 + (i === 1 ? 0.3 : 0), Z1 + 0.95, M('beton')));
      bg.push(box(2.6, 1.0, 0.04, xc, (i - 1) * hg + 0.5 + (i === 1 ? 0.3 : 0), Z1 + 1.73, M('glas')));
    }
  }
  g.add(gruppe(bk, 'Balkonplatten', 'beton', 'Thermisch getrennt angeschlossen.'));
  g.add(gruppe(bg, 'Balkongeländer (Glas/Metall)', 'metallbau', 'Absturzsicherung nach Bauordnung.'));
  // Staffelgeschoss / oberstes Vollgeschoss
  if (staffel) {
    const y0 = 3 * hg, sx0 = -10, sx1 = 6, sz0 = -6, sz1 = 2.5;
    const sw = [
      ...wandX(sx0, sx1, y0, y0 + hg, sz1 - t / 2, t, [{ x: -7.5, b: 2.4, y: y0 + 0.1, h: 2.2 }, { x: 2.5, b: 2.4, y: y0 + 0.1, h: 2.2 }], M('mauerwerk')),
      ...wandX(sx0, sx1, y0, y0 + hg, sz0 + t / 2, t, [{ x: -8.5, b: 1.3, y: y0 + 0.9, h: 1.4 }, { x: 4.0, b: 1.3, y: y0 + 0.9, h: 1.4 }], M('mauerwerk')),
      ...wandZ(sz0 + t, sz1 - t, y0, y0 + hg, sx0 + t / 2, t, [], M('mauerwerk')),
      ...wandZ(sz0 + t, sz1 - t, y0, y0 + hg, sx1 - t / 2, t, [], M('mauerwerk')),
    ];
    sw.forEach(m => { m.material = M('wdvs'); });
    g.add(gruppe(sw, 'Staffelgeschoss (zurückgesetzt)', 'mauerwerk', 'Oberstes Geschoss zurückgesetzt. Ob es als Vollgeschoss zählt, regelt die Bauordnung (Flächenanteil).', { staffel: true }));
    const fs = [fensterX({ x: -7.5, b: 2.4, y: y0 + 0.1, h: 2.2 }, sz1 - 0.06, t), fensterX({ x: 2.5, b: 2.4, y: y0 + 0.1, h: 2.2 }, sz1 - 0.06, t)];
    g.add(gruppe(fs, 'Fenstertüren Staffelgeschoss', 'fenster', 'Bodentiefe Elemente zur Dachterrasse, Schwellenanschluss an die Abdichtung.'));
    teil(g, box(20.3, 0.3, 12.3, 0, y0 + 0.15 - 0.0, 0, M('flachdach')), 'Flachdach / Dachterrasse (Abdichtung)', 'dach', 'Abdichtung nach DIN 18531, Gefälle, Terrassenbelag auf Stelzlagern, Anschlusshöhen an Türen.', { dach: true });
    teil(g, box(13.8, 0.05, 3.3, 0.0, y0 + 0.33, 4.2, M('pflaster')), 'Terrassenbelag (Platten auf Stelzlagern)', 'aussenanlagen', 'Belag oberhalb der Abdichtung, Wasser läuft darunter ab.', { dach: true });
    teil(g, box(16.3, 0.3, 8.8, -2, y0 + hg + 0.15, -1.75, M('flachdach')), 'Flachdach über Staffelgeschoss', 'dach', 'Gefälledämmung und Abdichtung, Attika ringsum.', { dach: true });
    const ge = [box(20, 1.0, 0.05, 0, y0 + 0.8, Z1 + 0.05, M('metall')), box(0.05, 1.0, 12, X1 + 0.05, y0 + 0.8, 0, M('metall'))];
    g.add(gruppe(ge, 'Terrassengeländer', 'metallbau', 'Absturzsicherung auf der Attika.', { dach: true }));
  } else {
    teil(g, box(20.3, 0.3, 12.3, 0, hoeheG + 0.15, 0, M('flachdach')), 'Flachdach (Abdichtung, Attika)', 'dach', 'Flachdach mit Gefälledämmung, Abdichtung nach DIN 18531.', { dach: true });
  }
  teil(g, box(4.4, 0.3, 5.0, 0.8, hoeheG + hg + 0.15 + (staffel ? 0 : -hg + hg), -3.5, M('flachdach')), 'Treppenhauskopf mit Rauchabzug', 'dach', 'Öffnung zur Rauchableitung an der obersten Stelle des Treppenhauses.', { dach: true });
  g.add(gruppe([box(4, 0.04, 8, 0, yG + 0.02, 12, M('pflaster'))], 'Zugang (Pflaster)', 'aussenanlagen', 'Barrierefreier Zugang.'));
  return { g, schnitt: 0.5, blick: [0.75, 0.55, 1.2] };
}

export function baueHaus(id, opts = {}) {
  const r = id === 'B' ? hausB() : id === 'C' ? hausC(opts.staffel !== false) : hausA();
  return r;
}
