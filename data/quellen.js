// Quellenregister: alle verwendeten Normen, Gesetze und Regelwerke mit Ausgabestand.
// Grundlage für die monatliche Prüfung durch den Neuerungs-Agenten.
// geprueft: Datum und Fundstelle der letzten Prüfung des Ausgabestands (Websuche).
// stand "ungeprüft" heißt: Ausgabe konnte nicht belegt werden.

export const QUELLEN = [
  { id: 'din18340', titel: 'DIN 18340 – VOB/C ATV Trockenbauarbeiten', stand: '2023-09', stufe: 'norm', geprueft: '2026-11-17, dinmedia.de (ersetzt 2019-09)' },
  { id: 'din18299', titel: 'DIN 18299 – VOB/C ATV Allgemeine Regelungen für Bauarbeiten jeder Art', stand: '2023-09', stufe: 'norm', geprueft: '2026-11-17, VOB/C-Ergänzungsband 2023 (DIN Media, Forum Verlag)' },
  { id: 'din18181', titel: 'DIN 18181 – Gipsplatten im Hochbau – Verarbeitung', stand: '2019-04', stufe: 'norm', geprueft: '2026-11-17, dinmedia.de', hinweis: 'Norm-Entwurf DIN 18181:2026-09 veröffentlicht. Bei Erscheinen der neuen Ausgabe Lektion prüfen.' },
  { id: 'din18182', titel: 'DIN 18182-1 – Zubehör für die Verarbeitung von Gipsplatten – Teil 1: Profile aus Stahlblech', stand: 'ungeprüft', stufe: 'norm' },
  { id: 'din18183', titel: 'DIN 18183-1 – Trennwände und Vorsatzschalen aus Gipsplatten mit Metallunterkonstruktionen – Teil 1: Beplankung mit Gipsplatten', stand: '2018-05', stufe: 'norm', geprueft: '2026-11-17, dinmedia.de (ersetzt 2009-05)' },
  { id: 'dinen520', titel: 'DIN EN 520 – Gipsplatten – Begriffe, Anforderungen und Prüfverfahren', stand: 'ungeprüft', stufe: 'norm' },
  { id: 'dinen14195', titel: 'DIN EN 14195 – Metall-Unterkonstruktionsbauteile für Gipsplatten-Systeme', stand: 'ungeprüft', stufe: 'norm' },
  { id: 'din18202', titel: 'DIN 18202 – Toleranzen im Hochbau – Bauwerke', stand: '2019-07', stufe: 'norm', geprueft: '2026-11-17, forum-verlag.com (Artikel 02/2026)', hinweis: 'Laut Forum Verlag Entwurf 2025-09 in Überarbeitung.' },
  { id: 'din18534', titel: 'DIN 18534-1 – Abdichtung von Innenräumen – Teil 1: Anforderungen, Planungs- und Ausführungsgrundsätze', stand: 'ungeprüft', stufe: 'norm' },
  { id: 'din4103', titel: 'DIN 4103-1 – Nichttragende innere Trennwände – Anforderungen und Nachweise', stand: 'ungeprüft', stufe: 'norm' },
  { id: 'din4109', titel: 'DIN 4109-1 – Schallschutz im Hochbau – Mindestanforderungen', stand: '2018-01', stufe: 'norm', geprueft: '2026-11-17, Kalksandstein-Schallschutzworkshop 06/2023 (Sekundärquelle)' },
  { id: 'din4102', titel: 'DIN 4102-4 / DIN EN 13501-2 – Feuerwiderstand von Bauteilen (Klassen EI30, EI60, EI90)', stand: 'ungeprüft', stufe: 'norm' },
  { id: 'din4108', titel: 'DIN 4108-7 – Luftdichtheit von Gebäuden', stand: 'ungeprüft', stufe: 'norm' },
  { id: 'geg', titel: 'GEG – Gebäudeenergiegesetz', stand: 'ungeprüft', stufe: 'norm', hinweis: 'Master-Dokument nennt GEG 2024. Aktuellen Stand prüfen, eine Novelle war angekündigt.' },
  { id: 'bauobln', titel: 'BauO Bln – Bauordnung für Berlin', stand: 'ungeprüft', stufe: 'norm', hinweis: 'Paragrafen nach Musterbauordnung zugeordnet, Wortlaut nicht geprüft (gesetze.berlin.de sperrt automatische Abrufe).' },
  { id: 'mbo', titel: 'MBO – Musterbauordnung', stand: 'ungeprüft', stufe: 'norm' },
  { id: 'igg2', titel: 'IGG Merkblatt Nr. 2 – Verspachtelung von Gipsplatten – Oberflächengüten (Industriegruppe Gipsplatten im Bundesverband der Gipsindustrie)', stand: '2017-11', stufe: 'regel', geprueft: '2026-11-17, Merkblatt-PDF (Fußzeile)' },
  { id: 'knaufw11', titel: 'Knauf W11 Metallständerwände – Systemdatenblatt (CH-Ausgabe)', stand: '2026-03', stufe: 'regel', geprueft: '2026-11-17, Datenblatt-PDF' },
  { id: 'danogips', titel: 'Danogips Technikblätter Vorsatzschale / Doppelständerwand', stand: 'ungeprüft', stufe: 'regel', geprueft: '2026-11-17, heinze.de (Ausgabedatum nicht ermittelt)' },
  { id: 'rigips18534', titel: 'Rigips – Wassereinwirkungsklassen nach DIN 18534-1 (Herstellerübersicht)', stand: 'ungeprüft', stufe: 'regel', geprueft: '2026-11-17, rigips.de' },
  { id: 'rigipsvr', titel: 'Rigips Verarbeitungsrichtlinien Trockenbau (Plattentypen, Baustellenbedingungen)', stand: '2026-01', stufe: 'regel', geprueft: '2026-11-17, rigips.de PDF' },
  { id: 'rigipsbb', titel: 'Rigips – Baustellenbedingungen (Webseite)', stand: 'ungeprüft', stufe: 'regel', geprueft: '2026-11-17, rigips.de' },
  { id: 'siniatprofil', titel: 'Siniat Produktdatenblätter CW- und UW-Profil (nach DIN EN 14195 / DIN 18182-1)', stand: '2016-01', stufe: 'regel', geprueft: '2026-11-17, siniat.de PDF' },
  { id: 'master', titel: 'Faustregel / Baustellenpraxis (nicht normativ belegt)', stand: '–', stufe: 'faust' },
];

export const quelle = id => QUELLEN.find(q => q.id === id);
