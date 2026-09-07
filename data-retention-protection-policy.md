# Data Retention And Protection Policy

App: Zoom Breakout Automator  
Last updated: September 7, 2026

## Data Stored By The App

The app stores user-entered breakout room presets locally in the user's browser storage. The app does not store Zoom user data, meeting data, participant data, OAuth tokens, or room presets on an external server.

## Retention

Local room presets remain on the user's device until the user removes them, clears local app/browser storage, or removes the app.

## Deletion

Users can remove locally stored room presets by clearing app/browser storage or removing the app from Zoom. Because no external server storage exists, there is no server-side user record to delete.

## Protection

The app is served over HTTPS. Security headers are applied at the Cloudflare Worker layer. The Content Security Policy restricts script loading to the app origin and the Zoom Apps SDK CDN.

## Third Parties

The app does not share stored room presets with third parties.
