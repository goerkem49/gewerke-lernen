// 3D-Betrachter: Szene, Kamera, Steuerung, Auswahl per Klick, Schnittebene
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { kantenMaterial } from './materialien.js';

let webglOk = null;
export function webglVerfuegbar() {
  if (webglOk !== null) return webglOk;
  try {
    const c = document.createElement('canvas');
    webglOk = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { webglOk = false; }
  return webglOk;
}

const keineAuswahl = () => {};

// Quader mit Kanten. Maße und Mittelpunkt in Metern.
export function box(w, h, d, x, y, z, mat, info) {
  const geo = new THREE.BoxGeometry(Math.max(w, 0.0005), Math.max(h, 0.0005), Math.max(d, 0.0005));
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  kanten(m);
  if (info) m.userData.info = info;
  return m;
}

export function kanten(mesh) {
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 25), kantenMaterial);
  e.raycast = keineAuswahl;
  e.userData.kante = true;
  mesh.add(e);
  return mesh;
}

export function zylinder(r, laenge, achse, x, y, z, mat, info, segmente = 16) {
  const geo = new THREE.CylinderGeometry(r, r, laenge, segmente);
  const m = new THREE.Mesh(geo, mat);
  if (achse === 'x') m.rotation.z = Math.PI / 2;
  if (achse === 'z') m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  if (info) m.userData.info = info;
  return m;
}

function sichtbar(obj) {
  for (let o = obj; o; o = o.parent) if (!o.visible) return false;
  return true;
}

function cssVar(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch { return fallback; }
}

export class Viewer {
  constructor(container, { onPick, hint } = {}) {
    this.container = container;
    this.onPick = onPick;
    this.ok = webglVerfuegbar();
    if (!this.ok) {
      container.innerHTML = '<div class="v-fallback">3D-Ansicht nicht verfügbar: Dieser Browser unterstützt kein WebGL.<br>Die Inhalte stehen in der Schichtenliste daneben.</div>';
      return;
    }
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.05, 500);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.localClippingEnabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label', '3D-Modell, mit der Maus drehen, Mausrad zoomen, Klick wählt ein Bauteil');
    this.renderer.domElement.tabIndex = 0;

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xa9afb7, 1.6));
    const sonne = new THREE.DirectionalLight(0xffffff, 1.6);
    sonne.position.set(8, 14, 10);
    this.scene.add(sonne);
    const gegen = new THREE.DirectionalLight(0xffffff, 0.5);
    gegen.position.set(-10, 6, -8);
    this.scene.add(gegen);
    const unten = new THREE.DirectionalLight(0xffffff, 0.55);
    unten.position.set(4, -10, 7);
    this.scene.add(unten);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = true;

    this.inhalt = new THREE.Group();
    this.scene.add(this.inhalt);
    this.schnittEbene = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    this.schnittAktiv = false;
    this.markiert = [];
    this.raycaster = new THREE.Raycaster();
    this.hintergrund();

    if (hint !== false) {
      const h = document.createElement('div');
      h.className = 'v-hint';
      h.textContent = hint || 'Ziehen: drehen · Rechts ziehen: verschieben · Mausrad: zoomen · Klick: Bauteil wählen';
      container.appendChild(h);
    }

    let down = null;
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', e => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved < 5 && e.button === 0) this.klick(e);
    });

    this.ro = new ResizeObserver(() => this.groesse());
    this.ro.observe(container);
    this.groesse();
    this.onTheme = () => this.hintergrund();
    window.addEventListener('themechange', this.onTheme);
    this.mq = window.matchMedia('(prefers-color-scheme: dark)');
    this.mq.addEventListener?.('change', this.onTheme);

    const loop = () => {
      if (!this.renderer) return;
      if (!this.renderer.domElement.isConnected) { this.dispose(); return; }
      this.raf = requestAnimationFrame(loop);
      this.controls.update();
      if (this.onFrame) this.onFrame();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  hintergrund() {
    if (!this.scene) return;
    this.scene.background = new THREE.Color(cssVar('--viewer-bg', '#e9eef2'));
  }

  groesse() {
    if (!this.renderer) return;
    const w = Math.max(50, this.container.clientWidth);
    const h = Math.max(50, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setInhalt(group, { blick = [1, 0.7, 1.25], abstand = 1.0, ziel } = {}) {
    if (!this.ok) return;
    this.markierungAus();
    this.scene.remove(this.inhalt);
    this.inhalt = group;
    this.scene.add(group);
    this.einpassen(blick, abstand, ziel);
  }

  // Kameraposition, die den Inhalt aus Richtung "blick" vollständig zeigt (ohne sie anzuwenden)
  kameraFuer(blick = [1, 0.7, 1.25], abstand = 1.0, ziel) {
    const b = new THREE.Box3();
    this.inhalt.updateMatrixWorld(true);
    for (const c of this.inhalt.children) if (!c.userData.umgebung) b.expandByObject(c);
    if (b.isEmpty()) b.setFromObject(this.inhalt);
    if (b.isEmpty()) return null;
    const target = ziel ? new THREE.Vector3(...ziel) : b.getCenter(new THREE.Vector3());
    const s = b.getSize(new THREE.Vector3()).length();
    const dir = new THREE.Vector3(...blick).normalize();
    const dist = (s / 2) / Math.tan((this.camera.fov * Math.PI / 180) / 2) * 0.85 * abstand;
    return { pos: target.clone().addScaledVector(dir, dist), target, dist };
  }

  kameraSetzen(k) {
    this.camera.position.copy(k.pos);
    this.camera.near = Math.max(0.01, k.dist / 100);
    this.camera.far = k.dist * 20;
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(k.target);
    this.controls.maxDistance = k.dist * 4;
    this.controls.minDistance = k.dist * 0.08;
    this.controls.update();
  }

  einpassen(blick = [1, 0.7, 1.25], abstand = 1.0, ziel) {
    const k = this.kameraFuer(blick, abstand, ziel);
    if (k) this.kameraSetzen(k);
  }

  setSchnitt(an, konstante = 0) {
    if (!this.ok) return;
    this.schnittAktiv = an;
    this.schnittEbene.constant = konstante;
    this.renderer.clippingPlanes = an ? [this.schnittEbene] : [];
  }

  klick(e) {
    if (!this.onPick) return;
    const r = this.renderer.domElement.getBoundingClientRect();
    const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(p, this.camera);
    const treffer = this.raycaster.intersectObject(this.inhalt, true).filter(t => {
      if (!t.object.isMesh || !sichtbar(t.object)) return false;
      if (t.object.userData.keineAuswahl) return false;
      if (this.schnittAktiv && this.schnittEbene.distanceToPoint(t.point) < 0) return false;
      return true;
    });
    if (!treffer.length) { this.onPick(null); return; }
    let o = treffer[0].object;
    while (o && !o.userData.info && !o.userData.schicht && o !== this.inhalt) o = o.parent;
    this.onPick(o && o !== this.inhalt ? o : null, treffer[0]);
  }

  // Hebt Meshes hervor (Emissive), stellt vorherige zurück
  markiere(objekte) {
    if (!this.ok) return;
    this.markierungAus();
    const liste = [];
    for (const o of objekte) o.traverse(m => { if (m.isMesh) liste.push(m); });
    for (const m of liste) {
      if (!m.userData.orig) m.userData.orig = m.material;
      const k = m.userData.orig.clone();
      k.emissive = new THREE.Color(0xff7a00);
      k.emissiveIntensity = 0.55;
      m.material = k;
    }
    this.markiert = liste;
  }

  markierungAus() {
    for (const m of this.markiert) {
      if (m.userData.orig) { m.material.dispose(); m.material = m.userData.orig; }
    }
    this.markiert = [];
  }

  dispose() {
    if (!this.renderer) return;
    cancelAnimationFrame(this.raf);
    this.ro && this.ro.disconnect();
    window.removeEventListener('themechange', this.onTheme);
    this.mq?.removeEventListener?.('change', this.onTheme);
    this.controls.dispose();
    this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    this.renderer = null;
  }
}
