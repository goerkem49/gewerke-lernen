# Gewerke lernen

Interaktive 3D-Lernseite zu den Gewerken im Hochbau (Neubau, Berlin), Schwerpunkt Bauüberwachung.

- Seite: https://goerkem49.github.io/gewerke-lernen/
- Statisch, ohne Build-Schritt: HTML, CSS und JavaScript (ES-Module), Three.js 0.170.0 lokal unter `lib/three/`.
- Inhalte je Gewerk liegen in `data/gewerke/<id>.js`, Quellen mit Stand und Stufe in `data/quellen.js`, Mitteilungen zu neuen Normausgaben in `data/neuigkeiten.js`.
- Fortschritt bleibt im Browser (localStorage) und lässt sich über das Speichern-Symbol als Datei sichern und wieder laden.
- Lernhilfe, keine Rechts- oder Fachplanungsberatung. Normwerte sind mit Quelle, Ausgabe und Stufe (Norm/Gesetz, Fachregel/Hersteller, Faustregel) gekennzeichnet; nicht belegte Angaben stehen als „ungeprüft“.

## Lokal ansehen

```
python3 -m http.server 8000
```

Dann http://localhost:8000 öffnen.
