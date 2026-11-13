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

## Bereits im Stripe-Testmodus angelegt

- Produkt-ID: `prod_VcgYcxk7GAkM1A`
- Monatspreis: 2,99 EUR
- Preis-ID: `price_1UbRAx3e1xaSe4TbIOUvToq1`
- Kundenportal: Zahlungsdaten, Rechnungen und Kuendigung zum Periodenende aktiviert

Diese IDs gehoeren ausschliesslich zum Stripe-Testkonto. Fuer den spaeteren Echtbetrieb werden ein separates Live-Produkt und eine neue Live-Preis-ID angelegt.

## Spaeter benoetigte Stripe-Konfiguration

- Produkt und wiederkehrende Preise
- Customer Portal fuer Rechnungen und Kuendigungen
- Checkout Session im `subscription`-Modus
- Webhook-Endpunkt mit Signaturpruefung
- mindestens die Ereignisse `checkout.session.completed`, `customer.subscription.updated` und `customer.subscription.deleted`
- serverseitige Zuordnung zwischen verifiziertem Zoom-Nutzer und Stripe-Kunde

Keine geheimen Stripe-Schluessel in GitHub oder Browsercode speichern. Sie gehoeren als verschluesselte Cloudflare-Secrets in den Worker.

## Cloudflare-Testworker

Der Pro-Test wird getrennt von der veroeffentlichten App mit `wrangler.pro.jsonc` bereitgestellt. Der Workername lautet `zoombreakoutautomator-pro-test`.

Nicht geheime Variablen:

- `BILLING_ENABLED=false` bis zur schriftlichen Zoom-Freigabe
- `STRIPE_PRO_PRICE_ID=price_1UbRAx3e1xaSe4TbIOUvToq1`

Verschluesselte Cloudflare-Secrets:

- `STRIPE_SECRET_KEY`: eingeschraenkter Stripe-Testschluessel
- `STRIPE_WEBHOOK_SECRET`: Signaturschluessel des Test-Webhooks
- `ZOOM_CLIENT_SECRET`: Development Client Secret der Zoom-App
- `SESSION_SECRET`: zufaelliges, mindestens 32 Byte langes Geheimnis

Webhook-Ziel nach der Bereitstellung:

`https://<test-worker-domain>/api/billing/webhook`

Erforderliche Stripe-Ereignisse:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Die Abrechnung wird erst auf `BILLING_ENABLED=true` gestellt, wenn Zoom den externen Zahlungsweg schriftlich genehmigt hat und der komplette Testablauf erfolgreich war.
