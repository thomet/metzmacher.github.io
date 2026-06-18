# Das Haus Metzmacher

Eine kleine statische GitHub-Pages-Webseite für `metzmacher.me`: eine Eingangshalle und drei ruhige Raumseiten.

Die Seite ist bewusst einfach gehalten: kein CMS, kein Build-System, keine Trackingdienste und keine externen Abhängigkeiten. Sie besteht nur aus:

- `index.html`
- `styles.css`
- `scripts/games.js`
- `scripts/books.js`
- `scripts/fetch-reado-books.mjs`
- `scripts/trips.js`
- `scripts/fetch-lambus-trips.mjs`
- `data/games.json`
- `data/books.json`
- `data/trips.json`
- `data/trips.generated.json`
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

## Spielzimmer und Systeme

Die Seite `/spielzimmer/` zeigt Systeme und Spielwelten, die uns an den Spieltisch holen. Sie ist keine Chronik einzelner Spielabende, keine One-Shot-Sammlung und kein Ort für regelmäßige Spielberichte.

Die Inhalte werden zentral in `data/games.json` gepflegt:

- `favorites`: **Auf unserem Tisch** - wiederkehrende Lieblingssysteme, zu denen wir immer wieder greifen.
- `collection`: **In unserem Regal** - eine kuratierte Sammlung vorhandener Regelwerke, Welten und Spiele.
- `wishlist`: **Noch verschlossen** - Systeme und Welten, die irgendwann noch geöffnet werden möchten.

Die Seite enthält passende HTML-Fallbacks. Wenn `data/games.json` nicht geladen werden kann, bleibt das Spielzimmer trotzdem lesbar.

## Fernwehzimmer und Lambus

Die Seite `/fernwehzimmer/` besteht aktuell nur aus **Lieblingsreisen** und **Orte, die offen bleiben**. Sie zeigt keine vollständige Reisechronik und keine zusätzlichen Kategorien.

Im Abschnitt **Lieblingsreisen** stehen manuell ausgewählte Lambus-Journale, die für uns Bedeutung haben.

Die Auswahl wird in `data/trips.json` gepflegt:

```json
[
  {
    "title": "Schweden",
    "url": "https://journal.lambus.com/U3S97M",
    "note": "Rote Häuser, weite Wege, Wasser zwischen Bäumen.",
    "videoUrl": "https://youtu.be/HNWpRpFG7pU"
  }
]
```

Optional können pro Reise `fallbackImage` und `videoUrl` ergänzt werden. `videoUrl` wird als dezenter sekundärer Link „▶ Reisevideo“ auf der Reisekarte angezeigt und öffnet einen nativen Dialog mit eingebettetem YouTube-Video. Das iframe wird erst beim Öffnen erzeugt und beim Schließen wieder entfernt. Das Script `scripts/fetch-lambus-trips.mjs` lädt die öffentlichen Lambus-Journal-Seiten, liest nach Möglichkeit OpenGraph-Daten (`og:title`, `og:description`, `og:image`) und nutzt danach die öffentlich vom Lambus-Journal geladene Reisedatenquelle, um ein Coverbild und ein dezentes Von-bis-Datum zu finden. Das Ergebnis wird nach `data/trips.generated.json` geschrieben. Wenn keine Daten verfügbar sind, bleiben die manuellen Werte aus `data/trips.json` erhalten.

Die Webseite fragt Lambus nicht direkt im Browser ab, sondern liest nur die lokale Datei `data/trips.generated.json`. Die GitHub Action unter `.github/workflows/update-trips.yml` wird nicht automatisch ausgeführt; sie kann bei neuen oder geänderten Reisen manuell gestartet werden. Alternativ kann lokal `node scripts/fetch-lambus-trips.mjs` ausgeführt werden.

**Orte, die offen bleiben** ist bewusst statisch und kann selten gepflegt werden. Weitere Fernwehzimmer-Bereiche sollten erst ergänzt werden, wenn dafür echte Inhalte vorhanden sind.

## Bibliothek und READO

Die Seite `/bibliothek/` ist auf Bücher, Hörbücher, Lesen und READO ausgerichtet. Spiele gehören ins Spielzimmer, Musik wird aktuell nicht auf der Seite abgebildet.

READO zeigt auf der Bibliotheksseite nur einen kleinen Ausschnitt aus aktuellen, zuletzt gelesenen und geplanten Büchern. Die vollständigen Leselisten sind über die externen Reado-Links am Ende des READO-Bereichs erreichbar.

Die Webseite fragt READO nicht direkt im Browser ab, damit es keine Cross-Origin-Probleme und keine Laufzeit-Abhängigkeit gibt. Stattdessen liest sie `data/books.json`.

Die Datei wird durch dieses Script aktualisiert:

```bash
node scripts/fetch-reado-books.mjs
```

Das Script verwendet nur öffentlich erreichbare Profilseiten und öffentliche Buchseiten von READO. Es liest Buch-Links aus dem HTML der Profile und ergänzt Titel, Autor und Cover über die JSON-LD-Daten der öffentlichen Buchseiten. Gibt es keine Daten oder ändert READO seine Seite, bleiben die gestalteten Platzhalter sichtbar.

Eine GitHub Action unter `.github/workflows/update-books.yml` läuft einmal täglich und schreibt die aktualisierte Datei `data/books.json` ins Repository zurück. Sie kann zusätzlich manuell über **Actions → Update READO books → Run workflow** gestartet werden.

Der einzige bewusst statische Bereich der Bibliothek ist **Bücher, die geblieben sind**. Dort können wenige persönliche Platzhalter oder Empfehlungen gepflegt werden, die READO nicht abbildet: Bedeutung, Erinnerung und Spuren im Regal.

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
