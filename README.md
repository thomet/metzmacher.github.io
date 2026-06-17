# Das Haus Metzmacher

Eine kleine statische GitHub-Pages-Webseite für `metzmacher.me`: eine Eingangshalle und drei ruhige Raumseiten.

Die Seite ist bewusst einfach gehalten: kein CMS, kein Build-System, keine Trackingdienste und keine externen Abhängigkeiten. Sie besteht nur aus:

- `index.html`
- `styles.css`
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

Die meisten Texte stehen direkt in `index.html`.

Besonders pflegeleicht ist die Sektion **Gerade im Haus**. Suche in `index.html` nach:

```html
<ul class="now-list">
```

Dort können die drei Listeneinträge direkt angepasst werden.

Die Inhalte der drei Räume liegen jeweils in ihren eigenen Dateien:

- `spielzimmer/index.html`
- `fernwehzimmer/index.html`
- `bibliothek/index.html`

Diese Seiten sind als kuratierte Sammlungen gedacht, nicht als Blog oder Chronologie.

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
