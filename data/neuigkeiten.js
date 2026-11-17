// Neuigkeiten für das Mitteilungs-Fenster.
// Wird vom monatlichen Neuerungs-Agenten gepflegt. Neue Einträge oben anfügen.
// relevanz: "relevant" (rot, betrifft Inhalte der Seite oder Görkems Arbeit) | "info" (blau)
// beispiel: true -> Testeintrag, kann gelöscht werden, sobald echte Einträge da sind.

export const NEUIGKEITEN = [
  {
    id: 'beispiel-2026-11-din18181',
    beispiel: true,
    datum: '2026-11-17',
    titel: 'Beispiel: Norm-Entwurf DIN 18181:2026-09 erschienen',
    betrifft: 'DIN 18181 (Gipsplatten im Hochbau – Verarbeitung)',
    alt: '2019-04',
    neu: 'Entwurf 2026-09 (noch keine gültige Norm)',
    aenderung: 'Testeintrag zum Ausprobieren des Mitteilungs-Fensters. Der Entwurf existiert laut DIN Media, sein Inhalt ist hier nicht geprüft.',
    achten: 'Bis zur neuen Ausgabe gilt DIN 18181:2019-04. Nach Erscheinen prüft der Agent Schraubabstände und Fugenregeln in der Lektion.',
    lektionen: ['trockenbau'],
    relevanz: 'relevant',
  },
  {
    id: 'beispiel-2026-11-info',
    beispiel: true,
    datum: '2026-11-17',
    titel: 'Beispiel: Entwurf DIN 18202:2025-09 in Überarbeitung (zur Info, Inhalt ungeprüft)',
    betrifft: 'DIN 18202 (Toleranzen im Hochbau)',
    alt: '2019-07',
    neu: 'Entwurf 2025-09',
    aenderung: 'Testeintrag für einen blauen Info-Eintrag. Inhalt des Entwurfs nicht geprüft, daher keine Lektion geändert.',
    achten: 'Nichts zu tun, bis die neue Ausgabe erscheint.',
    lektionen: ['trockenbau'],
    relevanz: 'info',
  },
];
