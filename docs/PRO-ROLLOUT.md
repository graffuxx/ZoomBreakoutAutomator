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
- Der Worker verifiziert den verschluesselten Zoom-App-Kontext und erstellt eine kurzlebige, signierte Sitzung.
- Stripe-Abos werden ueber einen pseudonymen Zoom-Nutzerschluessel zugeordnet und serverseitig geprueft.
- Checkout, Kundenportal und signierte Webhooks sind implementiert, bleiben aber ueber `BILLING_ENABLED=false` deaktiviert, bis Zoom den externen Abrechnungsweg schriftlich bestaetigt.
- Der getrennte Cloudflare-Testworker ist bereitgestellt; alle vier Geheimwerte liegen ausschliesslich als verschluesselte Secrets vor.
- Der Stripe-Testschluessel ist auf Checkout Sessions, Customer Portal und lesenden Subscription-Zugriff beschraenkt.
- Ein signiertes Stripe-Testereignis wurde erfolgreich mit HTTP `200 OK` zugestellt.
- Die Zoom-Entwicklungsfassung enthaelt zusaetzlich `openUrl`, `getMeetingParticipants` und `assignParticipantToBreakoutRoom`. Die Produktionsfassung wurde nicht veraendert.

## Vor einer Veroeffentlichung

1. Zoom bestaetigt den erlaubten Abrechnungsweg.
2. Stripe-Geschaeftskonto fuer TAECTRA fertig einrichten.
3. Erledigt: Stripe-Testschluessel, Testpreis und Webhook als Cloudflare-Secrets konfigurieren.
4. Nach Zoom-Freigabe: Checkout und Rueckkehr zu Zoom mit einer Testsubscription pruefen.
5. Architekturdiagramm und Sicherheitsnachweise aktualisieren.
6. In einer separaten Zoom-Entwicklungsfassung testen.
7. Aenderung bei Zoom zur Pruefung einreichen.

## Sicherheitsgrenze

Eine Pro-Berechtigung darf niemals allein in Local Storage oder durch einen URL-Parameter in der produktiven Domain vergeben werden. Die produktive Berechtigung muss serverseitig aus einem verifizierten Zoom-Nutzerkontext und einem bestaetigten Abonnement abgeleitet werden.
