// Übersicht aller Gewerke in Bauablauf-Reihenfolge.
// inhalt: true  -> es gibt data/gewerke/<id>.js mit vollständigem Inhalt.
// atvGeprueft: false -> ATV-Nummer aus dem Master-Dokument (aus dem Gedächtnis), wird beim Bau der Lektion geprüft.

export const PHASEN = [
  { nr: 0, name: 'Vorbereitung' },
  { nr: 1, name: 'Erdbau & Keller' },
  { nr: 2, name: 'Rohbau' },
  { nr: 3, name: 'Hülle' },
  { nr: 4, name: 'Technik Rohinstallation' },
  { nr: 5, name: 'Ausbau' },
  { nr: 6, name: 'Technik Fertigmontage' },
  { nr: 7, name: 'Außen' },
];

export const GEWERKE = [
  { id: 'baustelle', name: 'Baustelleneinrichtung, Vermessung, Gerüstbau', kurzname: 'Baustelle & Gerüst', phase: 0, atv: 'DIN 18451 (Gerüst)', vorgaenger: [], nachfolger: ['erdbau'] },
  { id: 'erdbau', name: 'Erdarbeiten, Verbau, Wasserhaltung', kurzname: 'Erdbau', phase: 1, atv: 'DIN 18300, 18303, 18305', vorgaenger: ['baustelle'], nachfolger: ['entwaesserung', 'gruendung'] },
  { id: 'entwaesserung', name: 'Entwässerungskanal, Dränage, Grundleitungen', kurzname: 'Entwässerung', phase: 1, atv: 'DIN 18306, 18308', vorgaenger: ['erdbau'], nachfolger: ['gruendung'] },
  { id: 'gruendung', name: 'Gründung, Bodenplatte, Kellerwände (weiße Wanne)', kurzname: 'Gründung & Keller', phase: 1, atv: 'DIN 18331', vorgaenger: ['erdbau', 'entwaesserung'], nachfolger: ['abdichtung-bauwerk', 'mauerwerk', 'beton'] },
  { id: 'abdichtung-bauwerk', name: 'Bauwerksabdichtung (schwarze Wanne, Perimeterdämmung)', kurzname: 'Bauwerksabdichtung', phase: 1, atv: 'DIN 18336', vorgaenger: ['gruendung'], nachfolger: ['erdbau'] },
  { id: 'mauerwerk', name: 'Mauerarbeiten', kurzname: 'Mauerwerk', phase: 2, atv: 'DIN 18330', vorgaenger: ['gruendung'], nachfolger: ['beton', 'zimmerer', 'fenster'] },
  { id: 'beton', name: 'Beton- und Stahlbetonarbeiten (Decken, Stützen, Treppen)', kurzname: 'Beton & Stahlbeton', phase: 2, atv: 'DIN 18331', vorgaenger: ['gruendung', 'mauerwerk'], nachfolger: ['zimmerer', 'tga-roh'] },
  { id: 'zimmerer', name: 'Zimmer- und Holzbauarbeiten (Dachstuhl, Holzbau)', kurzname: 'Zimmerer & Holzbau', phase: 2, atv: 'DIN 18334', vorgaenger: ['mauerwerk', 'beton'], nachfolger: ['dach'] },
  { id: 'stahlbau', name: 'Stahlbauarbeiten', kurzname: 'Stahlbau', phase: 2, atv: 'DIN 18335', vorgaenger: ['gruendung'], nachfolger: ['dach', 'fassade'] },
  { id: 'dach', name: 'Dachdeckung und Dachabdichtung', kurzname: 'Dach', phase: 3, atv: 'DIN 18338', vorgaenger: ['zimmerer'], nachfolger: ['klempner', 'trockenbau'] },
  { id: 'klempner', name: 'Klempnerarbeiten (Rinnen, Fallrohre, Anschlüsse)', kurzname: 'Klempner', phase: 3, atv: 'DIN 18339', vorgaenger: ['dach'], nachfolger: ['fassade'] },
  { id: 'fenster', name: 'Fenster und Außentüren, Verglasung', kurzname: 'Fenster & Außentüren', phase: 3, atv: 'DIN 18355, 18360, 18361', vorgaenger: ['mauerwerk'], nachfolger: ['sonnenschutz', 'fassade', 'putz', 'estrich'] },
  { id: 'sonnenschutz', name: 'Rollläden und Sonnenschutz', kurzname: 'Rollläden', phase: 3, atv: 'DIN 18358', vorgaenger: ['fenster'], nachfolger: ['fassade'] },
  { id: 'fassade', name: 'Fassade: WDVS, vorgehängte hinterlüftete Fassade, Verblendmauerwerk', kurzname: 'Fassade', phase: 3, atv: 'DIN 18345, 18351, 18330', vorgaenger: ['fenster', 'klempner', 'sonnenschutz'], nachfolger: ['aussenanlagen'] },
  { id: 'tga-roh', name: 'Heizung, Lüftung, Sanitär, Elektro, Blitzschutz, Aufzug (Rohinstallation)', kurzname: 'Technik Rohinstallation', phase: 4, atv: 'DIN 18379 bis 18386', vorgaenger: ['beton', 'fenster'], nachfolger: ['putz', 'trockenbau', 'estrich'] },
  { id: 'putz', name: 'Innenputz und Außenputz', kurzname: 'Putz', phase: 5, atv: 'DIN 18350', vorgaenger: ['fenster', 'tga-roh'], nachfolger: ['trockenbau', 'estrich'] },
  { id: 'trockenbau', name: 'Trockenbau (Wände, Decken, Vorsatzschalen, Dachgeschossausbau)', kurzname: 'Trockenbau', phase: 5, atv: 'DIN 18340', atvGeprueft: true, vorgaenger: ['tga-roh', 'putz'], nachfolger: ['estrich', 'maler'], inhalt: true },
  { id: 'estrich', name: 'Estrich (inkl. Fußbodenheizung, Ausgleichsschüttung, Dämmung)', kurzname: 'Estrich', phase: 5, atv: 'DIN 18353', vorgaenger: ['fenster', 'putz', 'tga-roh'], nachfolger: ['abdichtung-verbund', 'fliesen', 'bodenbelag'] },
  { id: 'abdichtung-verbund', name: 'Abdichtung im Verbund (Bad, Balkon)', kurzname: 'Abdichtung im Verbund', phase: 5, atv: 'DIN 18336, DIN 18534 / 18531', vorgaenger: ['estrich', 'trockenbau'], nachfolger: ['fliesen'] },
  { id: 'fliesen', name: 'Fliesen und Platten, Naturwerkstein', kurzname: 'Fliesen', phase: 5, atv: 'DIN 18352, 18332', vorgaenger: ['abdichtung-verbund', 'estrich'], nachfolger: ['tga-fertig', 'maler'] },
  { id: 'tischler', name: 'Tischler (Innentüren, Einbauten), Beschläge', kurzname: 'Tischler', phase: 5, atv: 'DIN 18355, 18357', vorgaenger: ['maler', 'bodenbelag'], nachfolger: [] },
  { id: 'bodenbelag', name: 'Parkett und Bodenbeläge', kurzname: 'Parkett & Bodenbeläge', phase: 5, atv: 'DIN 18356, 18365', vorgaenger: ['estrich', 'maler'], nachfolger: ['tischler'] },
  { id: 'maler', name: 'Maler und Tapezierer', kurzname: 'Maler', phase: 5, atv: 'DIN 18363, 18366', vorgaenger: ['trockenbau', 'putz', 'fliesen'], nachfolger: ['bodenbelag', 'tischler'] },
  { id: 'metallbau', name: 'Metallbau (Geländer, Treppen, Balkone)', kurzname: 'Metallbau', phase: 5, atv: 'DIN 18360', vorgaenger: ['beton', 'fassade'], nachfolger: [] },
  { id: 'tga-fertig', name: 'Endmontage Haustechnik, Inbetriebnahme, hydraulischer Abgleich', kurzname: 'Technik Fertigmontage', phase: 6, atv: 'DIN 18380 bis 18382', vorgaenger: ['fliesen', 'maler'], nachfolger: [] },
  { id: 'aussenanlagen', name: 'Außenanlagen, Pflaster, Garten- und Landschaftsbau', kurzname: 'Außenanlagen', phase: 7, atv: 'DIN 18318, 18320', vorgaenger: ['fassade'], nachfolger: [] },
];

export const gewerkMeta = id => GEWERKE.find(g => g.id === id);

export const BAUWEISEN = [
  { id: 'massiv', name: 'Massivbau', text: 'Mauerwerk (Kalksandstein, Ziegel, Porenbeton, Leichtbeton) und Stahlbeton (Ortbeton, Halbfertigteile).' },
  { id: 'holzrahmen', name: 'Holzrahmenbau / Holzständerbau', text: 'Tragende Holzständer mit Beplankung, Dämmung im Gefach.' },
  { id: 'holzmassiv', name: 'Holzmassivbau', text: 'Flächige Bauteile aus Brettsperrholz (BSP) oder Brettstapel.' },
  { id: 'hybrid', name: 'Holz-Hybridbau', text: 'Kombination, z. B. Stahlbetonkern mit Holzdecken und Holzaußenwänden.' },
  { id: 'fertigteil', name: 'Fertigteilbau', text: 'Betonfertigteile oder Fertighaus in Holztafelbauweise.' },
  { id: 'stahl', name: 'Stahlbau / Stahlskelettbau', text: 'Tragwerk aus Stahlstützen und -trägern, Ausfachung und Hülle getrennt.' },
];

export const HAEUSER = [
  { id: 'A', name: 'A: Einfamilienhaus', text: '2 Vollgeschosse, Vollkeller (weiße Wanne), Satteldach, Balkon, Bad, Treppe, Garage.' },
  { id: 'B', name: 'B: Doppelhaus', text: 'Zwei Haushälften mit zweischaliger Haustrennwand: Brand- und Schallschutz zwischen den Häusern.' },
  { id: 'C', name: 'C: Mehrfamilienhaus', text: '4 Geschosse, oberstes als Staffelgeschoss umschaltbar, Tiefgarage, Aufzug, notwendiges Treppenhaus, Flachdach mit Dachterrasse.' },
];

// Allgemeine Dauerpunkte jeder Begehung (Master-Dokument, Abschnitt Bauüberwachung)
export const DAUERPUNKTE = [
  'Pläne und Freigaben aktuell (Planstand, Index, Freigabevermerk)',
  'Maße und Öffnungsrichtungen: Türen und Fenster DIN-links/DIN-rechts',
  'Höhen: Meterriss vorhanden und richtig übertragen',
  'Schutz fertiger Bauteile (Abdeckung, Kantenschutz, Folien)',
  'Feuchte: Bauteile trocken, Lüftung, keine stehende Nässe',
  'Sicherheit und Ordnung auf der Baustelle (Absturzsicherung, Wege, Müll)',
];

// ATV-Prüfung vom 2026-11-17 (Websuche): belegt sind die ATV des VOB/C-Ergänzungsbands 2023
// (DIN Media Produktseite Ergänzungsband 2023, Forum Verlag 10/2023, ORCA-Übersicht 12/2023).
// Alle anderen Nummern stammen aus dem Master-Dokument und sind online noch nicht belegt.
export const ATV_BELEGT = {
  '18299': { titel: 'Allgemeine Regelungen für Bauarbeiten jeder Art', stand: '2023-09' },
  '18332': { titel: 'Naturwerksteinarbeiten', stand: '2023-09' },
  '18334': { titel: 'Zimmer- und Holzbauarbeiten', stand: '2023-09' },
  '18336': { titel: 'Abdichtungsarbeiten', stand: '2023-09' },
  '18340': { titel: 'Trockenbauarbeiten', stand: '2023-09' },
  '18351': { titel: 'Vorgehängte hinterlüftete Fassaden', stand: '2023-09' },
  '18353': { titel: 'Estricharbeiten', stand: '2023-09' },
  '18361': { titel: 'Verglasungsarbeiten', stand: '2023-09' },
  '18382': { titel: 'Elektro-, Sicherheits- und informationstechnische Anlagen', stand: '2023-09' },
  '18451': { titel: 'Gerüstarbeiten', stand: '2023-09' },
};

// Liefert je ATV-Nummer eines Gewerks: { nr, belegt, titel, stand }
export function atvListe(g) {
  const nums = [];
  const s = g.atv || '';
  const re = /\d{5}/g;
  let m;
  while ((m = re.exec(s))) nums.push(m[0]);
  // "18379 bis 18386" als Bereich ausschreiben
  const bis = s.match(/(\d{5})\s*bis\s*(\d{5})/);
  if (bis) {
    for (let n = +bis[1]; n <= +bis[2]; n++) if (!nums.includes(String(n)) && n !== 18383) nums.push(String(n));
    nums.sort();
  }
  return nums.map(nr => ({ nr, belegt: !!ATV_BELEGT[nr], ...(ATV_BELEGT[nr] || {}) }));
}
