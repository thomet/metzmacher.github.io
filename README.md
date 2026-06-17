# Das Haus Metzmacher

Eine kleine statische GitHub-Pages-Webseite für `metzmacher.me`: eine Eingangshalle und drei ruhige Raumseiten.

Die Seite ist bewusst einfach gehalten: kein CMS, kein Build-System, keine Trackingdienste und keine externen Abhängigkeiten. Sie besteht nur aus:

- `index.html`
- `styles.css`
- `scripts/books.js`
- `scripts/fetch-reado-books.mjs`
- `data/books.json`
- `spielzimmer/index.html`
- `fernwehzimmer/index.html`
- `bibliothek/index.html`

## Struktur

Die Startseite `index.html` ist die Eingangshalle des Hauses. Von dort führen drei Türen in die Raumseiten:

- `spielzimmer/index.html`
- `fernwehzimmer/index.html`
- `bibliothek/index.html`

Die Seite ist nicht als Blog gedacht. Es gibt keine Datumslogik, keine Chronologie und keine regelmäßige Blogpflege.

## Inhalte ändern

Die Startseite `index.html` ist nur die Eingangshalle: Hero, kurzer Raumgedanke, drei Türen und der Abschnitt darüber, was in diesem Haus wichtig ist. Sie enthält bewusst keine News, keinen Feed und keine doppelten Inhalte aus den Räumen.

Die Inhalte der drei Räume liegen jeweils in ihren eigenen Dateien:

- `spielzimmer/index.html`
- `fernwehzimmer/index.html`
- `bibliothek/index.html`

Diese Seiten sind als kuratierte Sammlungen gedacht, nicht als Blog oder Chronologie.

## READO-Daten in der Bibliothek

Die Seite `/bibliothek/` kann öffentliche READO-Daten aus `data/books.json` anzeigen. Die Webseite fragt READO nicht direkt im Browser ab, damit es keine Cross-Origin-Probleme und keine Laufzeit-Abhängigkeit gibt.

Die Datei wird durch dieses Script aktualisiert:

```bash
node scripts/fetch-reado-books.mjs
```

Das Script verwendet nur öffentlich erreichbare Profilseiten und öffentliche Buchseiten von READO. Es liest Buch-Links aus dem HTML der Profile und ergänzt Titel, Autor und Cover über die JSON-LD-Daten der öffentlichen Buchseiten. Gibt es keine Daten oder ändert READO seine Seite, bleiben die gestalteten Platzhalter sichtbar.

Eine GitHub Action unter `.github/workflows/update-books.yml` läuft einmal täglich und schreibt die aktualisierte Datei `data/books.json` ins Repository zurück. Sie kann zusätzlich manuell über **Actions → Update READO books → Run workflow** gestartet werden.

## Platzhalter ersetzen

Einige Karten enthalten bewusst gestaltete Platzhalter wie **Platz für ein Bild** oder **Platz für eine Notiz**. Sie zeigen, wo später echte Fotos, Erinnerungen, Empfehlungen oder Fundstücke ergänzt werden können.

Bildplatzhalter können später durch echte Bilder ersetzt werden, indem in der jeweiligen Raumseite ein `<img>` eingefügt und passend über `styles.css` gestaltet wird.

## Farben und Gestaltung ändern

Farben, Schriften, Abstände und andere Grundwerte liegen als CSS-Variablen am Anfang von `styles.css`:

```css
:root {
  --color-paper: #f4ecdd;
  --color-ink: #38291f;
  --color-olive: #758247;
}
```

So lassen sich kleine Anpassungen vornehmen, ohne das gesamte Stylesheet durchsuchen zu müssen.

## Lokal ansehen

Da die Seite keine Build-Schritte benötigt, kann `index.html` direkt im Browser geöffnet werden.

Alternativ im Projektordner einen kleinen lokalen Server starten:

```bash
python3 -m http.server 8000
```

Dann im Browser öffnen:

```text
http://localhost:8000
```

## Auf GitHub Pages veröffentlichen

1. Repository zu GitHub hochladen.
2. In GitHub unter **Settings → Pages** gehen.
3. Als Source den Branch `main` und den Ordner `/root` auswählen.
4. Speichern.

Für die Domain `metzmacher.me` in den Pages-Einstellungen die Custom Domain eintragen und die DNS-Einträge beim Domain-Anbieter entsprechend setzen.
