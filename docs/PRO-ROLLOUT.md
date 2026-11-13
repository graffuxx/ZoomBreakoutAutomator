# Breakout Room Manager Pro – Rollout

## Produktumfang

Die bestehende kostenlose Version bleibt unveraendert nutzbar:

- Presets und Raumnamen lokal speichern
- Breakout Rooms erstellen und umbenennen
- Raeume oeffnen und schliessen
- grundlegende Raumoptionen konfigurieren

Pro ergaenzt:

- aktuelle Meeting-Teilnehmende laden
- ausgeglichene Zufallsgruppen erstellen
- alphabetische Verteilung und neue Rotationen
- vorbereitete Gruppen direkt Zoom-Raeumen zuweisen
- Presets als JSON exportieren und importieren

## Technischer Status

- Pro-Oberflaeche und Verteilungslogik sind implementiert.
- Ohne bestaetigte Berechtigung bleibt Pro gesperrt.
- Lokal ist die Vorschau nur ueber `http://127.0.0.1:8765/?pro=preview` aktiv.
- Der Worker liefert bis zur fertigen serverseitigen Lizenzpruefung immer den Free-Status.
- Stripe Checkout bleibt deaktiviert, bis Zoom den externen Abrechnungsweg schriftlich bestaetigt.

## Vor einer Veroeffentlichung

1. Zoom bestaetigt den erlaubten Abrechnungsweg.
2. Stripe-Geschaeftskonto fuer TAECTRA fertig einrichten.
3. Sichere Benutzerzuordnung ueber den verifizierten Zoom-App-Kontext implementieren.
4. Stripe Checkout, Webhook-Verifikation und serverseitige Berechtigungen implementieren.
5. Datenschutz, Nutzungsbedingungen, Architekturdiagramm und Sicherheitsnachweise aktualisieren.
6. In einer separaten Zoom-Entwicklungsfassung testen.
7. Aenderung bei Zoom zur Pruefung einreichen.

## Sicherheitsgrenze

Eine Pro-Berechtigung darf niemals allein in Local Storage oder durch einen URL-Parameter in der produktiven Domain vergeben werden. Die produktive Berechtigung muss serverseitig aus einem verifizierten Zoom-Nutzerkontext und einem bestaetigten Abonnement abgeleitet werden.
