# Stripe-Vorbereitung fuer TAECTRA

## Empfohlene Kontodaten

- Geschaeftsname: TAECTRA beziehungsweise der eingetragene Gewerbename
- Website: `https://taectra.com`
- Support-E-Mail: `contact@taectra.com`
- Abrechnung: deutsches Unternehmen / deutsche Einzelunternehmung
- Auszahlung: deutsches Geschaeftskonto

## Produktentwurf

- Produkt: Breakout Room Manager Pro
- Startpreis: 2,99 EUR pro Monat
- Option spaeter: 29,99 EUR pro Jahr
- Kostenlose Version bleibt dauerhaft vorhanden
- Keine Aktivierung von Stripe Checkout vor schriftlicher Zoom-Freigabe

## Spaeter benoetigte Stripe-Konfiguration

- Produkt und wiederkehrende Preise
- Customer Portal fuer Rechnungen und Kuendigungen
- Checkout Session im `subscription`-Modus
- Webhook-Endpunkt mit Signaturpruefung
- mindestens die Ereignisse `checkout.session.completed`, `customer.subscription.updated` und `customer.subscription.deleted`
- serverseitige Zuordnung zwischen verifiziertem Zoom-Nutzer und Stripe-Kunde

Keine geheimen Stripe-Schluessel in GitHub oder Browsercode speichern. Sie gehoeren als verschluesselte Cloudflare-Secrets in den Worker.
