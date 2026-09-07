# Security Policy

App: Zoom Breakout Automator  
Last updated: September 7, 2026

## Security Contact

Security issues should be reported through the support contact listed on the Zoom Marketplace app listing.

## Data Handling

The app does not store Zoom user data, meeting data, participant data, room data, or OAuth tokens on an external server. Room presets entered by users are stored locally in browser storage on the user's device.

## Hosting

The app is hosted on Cloudflare Workers as static files. HTTPS is required. Requests below TLS 1.2 are rejected by the Worker when Cloudflare TLS metadata is available.

## Access Control

The app uses Zoom Apps SDK capabilities available to the authorized Zoom user in the active meeting. Breakout room controls are expected to work only for hosts and co-hosts where Zoom permits those actions.

## Secrets

Zoom client secrets and production credentials must not be stored in the public repository or client-side source code. The current app does not require client secrets in runtime code.

## Dependencies

The app uses no production npm package dependencies. The Zoom Apps SDK is loaded from Zoom's official SDK CDN.
