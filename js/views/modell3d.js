// Detailmodell-Ansicht: 3D-Modell mit Bauablauf-Regler, Explosionsansicht, Varianten und Schichtenliste
import { Viewer } from '../three/viewer.js';
import { baueModell } from '../three/bauteil.js';
import { hexFarbe } from '../three/materialien.js';
import { quelle } from '../../data/quellen.js';
import { esc, icon, stufeBadge, neuBadge } from '../util.js';

export class ModellAnsicht {
  constructor(el, daten, opts = {}) {
    this.el = el;
    this.daten = daten;
    this.modellId = opts.modell || daten.modelle[0].id;
    this.varianteId = opts.variante || null;
    this.auswahl = opts.schicht || null;
    this.onChange = opts.onChange || (() => {});
    this.explodiert = false;
    this.aufbauen();
  }

  get modell() { return this.daten.modelle.find(m => m.id === this.modellId) || this.daten.modelle[0]; }

  aufbauen() {
    const d = this.daten;
    this.el.innerHTML = `
      <div class="gewerk-grid">
        <div>
          ${d.modelle.length > 1 ? `<div class="chips" data-modelle style="margin-bottom:10px">${d.modelle.map(m => `<button class="btn-small" data-m="${m.id}">${esc(m.name)}</button>`).join('')}</div>` : ''}
          <div class="viewer viewer-gewerk" data-viewer>
            <div class="v-step" data-step></div>
            <div class="v-overlay-r">
              <button class="btn-small" data-explode title="Schichten auseinanderfahren">${icon('explode')} Explosionsansicht</button>
              <button class="btn-small" data-reset title="Ansicht zurücksetzen">${icon('home')}</button>
            </div>
          </div>
          <div class="regler">
            <span class="muted" style="font-size:.85rem">Rohbau</span>
            <input type="range" min="1" step="1" data-regler aria-label="Bauablauf-Regler">
            <span class="muted" style="font-size:.85rem">fertig</span>
          </div>
          <div class="regler-labels"><span data-schritt-nr></span><span data-schritt-hinweis class="muted">Regler nach links: Schichten lösen sich auf · nach rechts: Bauablauf</span></div>
          <div class="model-tools" data-varianten></div>
          <div data-vergleich style="margin-top:12px"></div>
        </div>
        <aside>
          <div class="card">
            <h3>${icon('layers')} Schichten</h3>
            <p class="muted" style="font-size:.85rem;margin-bottom:6px" data-modelltext></p>
            <ul class="layer-list" data-liste></ul>
          </div>
          <div class="card layer-detail" data-detail></div>
          <div class="card merke">
            <h3>${icon('flag')} Worauf achten</h3>
            <ul>${(d.merke || []).map(m => `<li>${esc(m)}</li>`).join('')}</ul>
          </div>
        </aside>
      </div>`;
    const q = s => this.el.querySelector(s);
    this.viewerEl = q('[data-viewer]');
    this.regler = q('[data-regler]');
    this.liste = q('[data-liste]');
    this.detail = q('[data-detail]');
    this.viewer = new Viewer(this.viewerEl, { onPick: o => this.pick(o) });
    this.regler.addEventListener('input', () => this.setSchritt(+this.regler.value));
    q('[data-explode]').addEventListener('click', () => this.toggleExplosion());
    q('[data-reset]').addEventListener('click', () => this.viewer.ok && this.viewer.einpassen(...this.blick()));
    this.el.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
      this.modellId = b.dataset.m; this.varianteId = null; this.auswahl = null; this.explodiert = false; this.laden(); this.onChange(this.zustand());
    }));
    this.laden();
  }

  blick() {
    const lage = this.modell.rahmen.lage;
    if (lage === 'decke') return [[0.55, -0.75, 1.0], 1.1];
    if (lage === 'dach') return [[0.9, 0.2, 1.3], 1.1];
    return [[0.85, 0.45, 1.25], 1.1];
  }

  laden() {
    const m = this.modell;
    if (!this.varianteId || !(m.varianten || []).some(v => v.id === this.varianteId)) this.varianteId = (m.varianten || [])[0]?.id || 'standard';
    this.el.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('active', b.dataset.m === m.id));
    this.el.querySelector('[data-modelltext]').textContent = m.text || '';
    this.bau = baueModell(m, this.varianteId);
    if (this.viewer.ok) {
      this.viewer.onFrame = null;
      const [blick, abst] = this.blick();
      this.viewer.setInhalt(this.bau.group, { blick, abstand: abst });
    }
    const n = (m.schritte || []).length || 1;
    this.regler.max = String(n);
    if (!this.schritt || this.schritt > n) this.schritt = n;
    this.regler.value = String(this.schritt);
    this.setSchritt(this.schritt, true);
    this.bau.setExplosion(this.explodiert ? 1 : 0);
    this.el.querySelector('[data-explode]').classList.toggle('active', this.explodiert);
    this.varianten();
    if (this.auswahl && this.bau.info.has(this.auswahl)) this.waehle(this.auswahl, false); else this.zeigeDetail(null);
  }

  setSchritt(n, still) {
    this.schritt = n;
    const aktiv = this.bau.setSchritt(n);
    const s = (this.modell.schritte || [])[n - 1];
    const stepEl = this.el.querySelector('[data-step]');
    stepEl.textContent = s ? `Schritt ${n}/${this.modell.schritte.length}: ${s.name}` : '';
    this.el.querySelector('[data-schritt-nr]').textContent = s ? `Schritt ${n} von ${this.modell.schritte.length}` : '';
    this.liste.innerHTML = this.bau.schichten.map(sch => {
      const an = aktiv.has(sch.id);
      return `<li><button data-s="${sch.id}" class="${sch.id === this.auswahl ? 'active' : ''} ${an ? '' : 'aus'}" title="${an ? '' : 'In diesem Schritt noch nicht eingebaut'}">
        <span class="swatch" style="background:${hexFarbe(sch.farbe)}"></span>
        <span>${esc(sch.name)}<br><small>${esc(sch.fachbegriff || '')}</small></span></button></li>`;
    }).join('');
    this.liste.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => this.waehle(b.dataset.s, true)));
    if (!still) this.onChange(this.zustand());
  }

  toggleExplosion() {
    this.explodiert = !this.explodiert;
    this.el.querySelector('[data-explode]').classList.toggle('active', this.explodiert);
    const ziel = this.explodiert ? 1 : 0;
    const start = this.bau.explosion, t0 = performance.now();
    if (!this.viewer.ok) { this.bau.setExplosion(ziel); return; }
    // Kamera so mitführen, dass auch die auseinandergefahrenen Schichten ganz im Bild bleiben
    const v = this.viewer;
    const richtung = v.camera.position.clone().sub(v.controls.target).toArray();
    this.bau.setExplosion(ziel);
    const k = v.kameraFuer(richtung, this.blick()[1]);
    this.bau.setExplosion(start);
    const p0 = v.camera.position.clone(), z0 = v.controls.target.clone();
    v.onFrame = () => {
      const t = Math.min(1, (performance.now() - t0) / 450);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.bau.setExplosion(start + (ziel - start) * e);
      if (k) { v.camera.position.lerpVectors(p0, k.pos, e); v.controls.target.lerpVectors(z0, k.target, e); }
      if (t >= 1) { v.onFrame = null; if (k) v.kameraSetzen(k); }
    };
  }

  varianten() {
    const m = this.modell, vs = m.varianten || [];
    const box = this.el.querySelector('[data-varianten]');
    const vg = this.el.querySelector('[data-vergleich]');
    if (vs.length <= 1) { box.innerHTML = ''; vg.innerHTML = ''; return; }
    box.innerHTML = `<span class="muted" style="font-size:.85rem">Variante:</span> <div class="seg">${vs.map(v => `<button class="btn-small ${v.id === this.varianteId ? 'active' : ''}" data-v="${v.id}">${esc(v.name)}</button>`).join('')}</div>`;
    box.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => { this.varianteId = b.dataset.v; this.laden(); this.onChange(this.zustand()); }));
    vg.innerHTML = `<details ${this.vergleichOffen ? 'open' : ''}><summary style="cursor:pointer;font-weight:600">Vergleich der Varianten: Vor- und Nachteile</summary>
      <div style="overflow-x:auto;margin-top:8px"><table><thead><tr><th>Variante</th><th>Einsatz</th><th>Vorteile</th><th>Nachteile</th></tr></thead><tbody>
      ${vs.map(v => `<tr style="${v.id === this.varianteId ? 'background:var(--accent-soft)' : ''}"><td><strong>${esc(v.name)}</strong></td><td>${esc(v.einsatz || '')}</td>
        <td><ul>${(v.vorteile || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></td><td><ul>${(v.nachteile || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></td></tr>`).join('')}
      </tbody></table></div></details>`;
    vg.querySelector('details').addEventListener('toggle', e => { this.vergleichOffen = e.target.open; });
  }

  pick(obj) {
    if (!obj) { this.waehle(null, false); return; }
    let o = obj;
    while (o && !o.userData.schicht) o = o.parent;
    if (o) this.waehle(o.userData.schicht, false);
  }

  waehle(id, ausListe) {
    this.auswahl = id;
    if (!id) {
      this.viewer.ok && this.viewer.markierungAus();
      this.liste.querySelectorAll('[data-s]').forEach(b => b.classList.remove('active'));
      this.zeigeDetail(null);
      return;
    }
    const e = this.bau.info.get(id);
    if (!e) return;
    if (ausListe && !e.objekt.visible) {
      const idx = (this.modell.schritte || []).findIndex(s => s.schichten.includes(id));
      if (idx >= 0) { this.regler.value = String(idx + 1); this.setSchritt(idx + 1); }
    }
    this.viewer.ok && this.viewer.markiere([e.objekt]);
    this.liste.querySelectorAll('[data-s]').forEach(b => b.classList.toggle('active', b.dataset.s === id));
    this.zeigeDetail(e.daten);
    this.onChange(this.zustand());
  }

  zeigeDetail(s) {
    if (!s) {
      this.detail.innerHTML = '<h3>Schicht wählen</h3><p class="muted">Klick auf eine Schicht im Modell oder in der Liste zeigt Name, Material, Dicke, Funktion und Quelle.</p>';
      return;
    }
    const q = quelle(s.quelle);
    const begriffe = (this.daten.lesen?.begriffe || []).filter(b => b.schicht === s.id && (!b.modell || b.modell === this.modellId));
    this.detail.innerHTML = `
      <h3>${esc(s.name)}${neuBadge(s.neu)}</h3>
      <dl>
        <dt>Fachbegriff</dt><dd>${esc(s.fachbegriff || '–')}</dd>
        <dt>Material</dt><dd>${esc(s.material || '–')}</dd>
        <dt>Dicke</dt><dd>${s.dicke_mm != null ? esc(String(s.dicke_mm).replace('.', ',')) + ' mm' : '–'}</dd>
        <dt>Funktion</dt><dd>${esc(s.funktion || '–')}</dd>
        <dt>Quelle</dt><dd>${q ? `${esc(q.titel)}${q.stand && q.stand !== '–' ? `, Stand ${esc(q.stand)}` : ''}` : '–'} ${stufeBadge(s.stufe)}</dd>
      </dl>
      ${begriffe.length ? `<p style="margin:.6em 0 0"><small>Begriffe: ${begriffe.map(b => `<a class="pill" href="#/lexikon/${encodeURIComponent(b.begriff)}">${esc(b.begriff)}</a>`).join('')}</small></p>` : ''}`;
  }

  zustand() { return { modell: this.modellId, variante: this.varianteId, schicht: this.auswahl, schritt: this.schritt }; }

  dispose() { this.viewer?.dispose?.(); }
}
