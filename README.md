# Zoom Breakout Automator

Cleanes Zoom-App-Panel fuer Breakout Rooms.

Die alte AutoHotkey-Version ist verworfen und liegt nur noch als Archiv in `legacy_autohotkey/`.

## Ziel

Eine App, die in Zoom laeuft und Breakout Rooms direkt ueber das Zoom Apps SDK verwaltet:

- Raum-Presets speichern
- Raumnamen bearbeiten
- Raeume in Zoom anlegen
- Namen aktualisieren
- Alle Raeume oeffnen
- Alle Raeume schliessen

## Lokaler Test

Einfach:

```bash
python3 -m http.server 8765
```

Dann im Browser oeffnen:

```text
http://127.0.0.1:8765/
```

Lokal laeuft die App im Demo-Modus. Du kannst Presets, Raumnamen und Optionen testen. Zoom-Aktionen funktionieren erst, wenn die App als Zoom App im Zoom Client registriert und geoeffnet wird.

## GitHub und Hosting

GitHub ist die richtige Ablage fuer den Code. Fuer Zoom reicht GitHub alleine aber nicht aus: Die App muss ueber eine HTTPS-Adresse laufen, die bestimmte Sicherheits-Header ausliefert.

Empfohlener Weg:

1. Neues GitHub-Repository erstellen.
2. Diesen Ordner ins Repository hochladen.
3. Repository mit Cloudflare Pages oder Netlify verbinden.
4. Als Build-Einstellung verwenden:
   - Build command: leer lassen
   - Output directory: `/`
5. Die erzeugte HTTPS-Adresse in Zoom als App-Startseite verwenden.

Die Datei `_headers` ist bereits vorbereitet. Cloudflare Pages und Netlify koennen daraus die benoetigten HTTP-Header setzen. GitHub Pages ist fuer die echte Zoom-App weniger geeignet, weil diese Header dort nicht sauber projektbezogen konfigurierbar sind.

Wenn Cloudflare statt Pages den neueren Workers-Deploy-Weg nutzt, sind `wrangler.jsonc` und `.assetsignore` wichtig. `.assetsignore` verhindert, dass Cloudflare installierte Abhaengigkeiten wie `node_modules` als Website-Dateien hochlaedt.

## Zoom-Test

1. App lokal oder online per HTTPS hosten.
2. In Zoom Marketplace eine General App / Zoom App anlegen.
3. Diese URL als Zoom-App-Startseite eintragen.
4. Zoom Apps SDK Capabilities fuer Breakout Rooms aktivieren.
5. App im Zoom-Testmeeting als Host oder Co-Host oeffnen.
6. `Raeume in Zoom anlegen` testen.
7. `Alle oeffnen` und `Alle schliessen` testen.

Mehr Details stehen in `zoom-app-manifest-notes.md`.

## Wichtige Einschraenkung

Die App kann nur das tun, was Zoom fuer den aktuellen Nutzer, Client und Meeting-Kontext erlaubt. Wenn die Breakout-Room-APIs nicht freigegeben sind oder der Nutzer nicht Host/Co-Host ist, zeigt die App eine klare Meldung statt herumzuklicken.
