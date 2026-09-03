# Zoom App Setup Notes

Diese Version ist keine AutoHotkey-App mehr. Sie ist eine Zoom-App-Oberflaeche fuer das Zoom Apps SDK.

## Dateien

- `index.html`: Einstieg der App
- `styles.css`: UI-Design
- `app.js`: Presets, lokale Speicherung und Zoom-SDK-Aufrufe
- `_headers`: Sicherheits-Header fuer Cloudflare Pages oder Netlify
- `legacy_autohotkey/`: alter verworfener Prototyp

## Lokaler Test

Die App kann lokal im Browser geoeffnet werden. Dann laeuft sie im Demo-Modus:

- Presets anlegen
- Raumnamen bearbeiten
- Optionen speichern
- Layout pruefen

Zoom-Aktionen funktionieren erst, wenn diese Web-App als Zoom App im Zoom Client laeuft.

## Hosting

Fuer den echten Zoom-Test sollte die App ueber Cloudflare Pages oder Netlify veroeffentlicht werden. Das Repository kann auf GitHub liegen, aber die Zoom-App-URL sollte auf ein Hosting zeigen, das eigene HTTP-Header ausliefert.

Die Datei `_headers` setzt die Header, die Zoom fuer die eingebettete App-Ansicht erwartet:

- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `Content-Security-Policy`
- `Referrer-Policy`

## Zoom Marketplace / Developer Setup

In Zoom muss eine General App / Zoom App angelegt werden. Die App braucht die Zoom Apps SDK Capabilities fuer:

- `getSupportedJsApis`
- `getUserContext`
- `getBreakoutRoomList`
- `createBreakoutRooms`
- `configureBreakoutRooms`
- `openBreakoutRooms`
- `closeBreakoutRooms`
- `renameBreakoutRoom`
- `onMeetingConfigChanged`

Die App muss im Meeting vom Host oder Co-Host verwendet werden. Zoom dokumentiert, dass Breakout-Room-Verwaltung ueber Zoom Apps SDK fuer Host/Co-Host bzw. Meeting Owner gedacht ist.

## Quellen

- Zoom Apps Breakout Rooms: https://developers.zoom.us/docs/zoom-apps/guides/breakout-rooms/
- Zoom Apps SDK Class Reference: https://appssdk.zoom.us/classes/ZoomSdk.ZoomSdk.html
- Zoom Apps SDK API-Liste: https://appssdk.zoom.us/types/ZoomSdkTypes.Apis.html
