// 3D-Gesamtmodell der Referenzgebäude (Startseite und Bereich 3D-Gebäude)
import { Viewer } from '../three/viewer.js';
import { baueHaus } from '../three/haeuser.js';
import { HAEUSER } from '../../data/gewerke.js';
import { gewerkMeta, hatInhalt } from '../daten.js';
import * as S from '../store.js';
import { esc, icon } from '../util.js';

export function hausAnsicht(el, { gross = false } = {}) {
  const st = S.get();
  el.innerHTML = `
    <div class="viewer ${gross ? '' : 'viewer-home'}" data-v style="${gross ? 'height:calc(100vh - 230px);min-height:420px' : ''}">
      <div class="v-overlay">
        <div class="seg" data-haeuser>${HAEUSER.map(h => `<button class="btn-small" data-h="${h.id}" title="${esc(h.text)}">${esc(h.name)}</button>`).join('')}</div>
      </div>
      <div class="v-overlay-r">
        <button class="btn-small" data-schnitt title="Schnittebene durch das Gebäude">${icon('cut')} Schnitt</button>
        <button class="btn-small" data-dach title="Dach ein- oder ausblenden">Dach</button>
        <button class="btn-small" data-staffel title="Oberstes Geschoss als Staffelgeschoss">Staffelgeschoss</button>
        <button class="btn-small" data-reset title="Ansicht zurücksetzen">${icon('home')}</button>
      </div>
      <div class="v-info" data-info hidden></div>
    </div>
    <p class="muted" style="font-size:.85rem;margin-top:6px" data-text></p>`;
  const vEl = el.querySelector('[data-v]');
  const info = el.querySelector('[data-info]');
  let schnitt = false, dach = true, aktuell = null;
  const viewer = new Viewer(vEl, {
    onPick: obj => {
      if (!obj || !obj.userData.info) { info.hidden = true; viewer.markierungAus(); return; }
      viewer.markiere([obj]);
      const i = obj.userData.info;
      const g = gewerkMeta(i.gewerk);
      info.hidden = false;
      info.innerHTML = `<h4>${esc(i.name)}</h4><p style="margin:.2em 0 .5em">${esc(i.text || '')}</p>
        ${g ? `<a class="btn btn-small ${hatInhalt(g.id) ? 'btn-primary' : ''}" href="#/gewerk/${g.id}">Gewerk: ${esc(g.kurzname)} ${icon('next')}</a>${hatInhalt(g.id) ? '' : ' <small class="muted">Inhalt folgt</small>'}` : ''}`;
    },
  });
  const laden = () => {
    const id = S.get().haus || 'A';
    el.querySelectorAll('[data-h]').forEach(b => b.classList.toggle('active', b.dataset.h === id));
    el.querySelector('[data-staffel]').hidden = id !== 'C';
    el.querySelector('[data-staffel]').classList.toggle('active', S.get().staffel !== false);
    const h = HAEUSER.find(x => x.id === id);
    el.querySelector('[data-text]').textContent = `${h.name}: ${h.text} Klick auf ein Bauteil zeigt Name und Gewerk.`;
    aktuell = baueHaus(id, { staffel: S.get().staffel !== false });
    if (!viewer.ok) return;
    viewer.setInhalt(aktuell.g, { blick: aktuell.blick, abstand: 0.95 });
    info.hidden = true;
    anwenden();
  };
  const anwenden = () => {
    if (!viewer.ok) return;
    viewer.setSchnitt(schnitt, aktuell?.schnitt ?? 0);
    aktuell.g.traverse(o => { if (o.userData.dach) o.visible = dach; });
    el.querySelector('[data-schnitt]').classList.toggle('active', schnitt);
    el.querySelector('[data-dach]').classList.toggle('active', dach);
  };
  el.querySelectorAll('[data-h]').forEach(b => b.addEventListener('click', () => { S.setze('haus', b.dataset.h); window.dispatchEvent(new Event('hauswechsel')); laden(); }));
  el.querySelector('[data-schnitt]').addEventListener('click', () => { schnitt = !schnitt; anwenden(); });
  el.querySelector('[data-dach]').addEventListener('click', () => { dach = !dach; anwenden(); });
  el.querySelector('[data-staffel]').addEventListener('click', () => { S.setze('staffel', S.get().staffel === false); laden(); });
  el.querySelector('[data-reset]').addEventListener('click', () => viewer.ok && viewer.einpassen(aktuell.blick, 0.95));
  const onWechsel = () => { if (el.isConnected) laden(); else window.removeEventListener('hauswechsel-extern', onWechsel); };
  window.addEventListener('hauswechsel-extern', onWechsel);
  laden();
  return viewer;
}
