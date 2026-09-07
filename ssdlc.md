# Secure Software Development Lifecycle Evidence

App: Zoom Breakout Automator  
Last updated: September 7, 2026

## Scope

Zoom Breakout Automator is a small static Zoom App for meeting hosts and co-hosts. It manages breakout room presets and sends breakout room actions through the Zoom Apps SDK.

The app has no backend server, no external database, and no custom authentication system. Room presets are stored locally in the user's browser storage.

## Development Process

1. Requirements are defined before implementation.
2. Requested Zoom scopes and SDK capabilities are limited to the app's core breakout room functionality.
3. Code changes are reviewed manually before deployment.
4. JavaScript syntax checks are run before deployment.
5. Security-relevant files are reviewed before publishing, including `app.js`, `src/worker.js`, `wrangler.jsonc`, `_headers`, and privacy/support pages.
6. Production deployments are made through GitHub and Cloudflare Workers.

## Security Controls

- HTTPS-only hosting through Cloudflare Workers.
- Worker-level TLS guard rejects requests below TLS 1.2 when TLS metadata is available.
- Security headers are applied by the Worker response handler.
- Content Security Policy limits script loading to the app origin and the Zoom Apps SDK CDN.
- No Zoom OAuth tokens are stored by the app.
- No Zoom user, meeting, participant, or preset data is stored on an external server.
- Room presets are stored locally on the user's device.

## Change Management

Changes are committed to the GitHub repository and deployed through Cloudflare. The app is tested locally in browser demo mode and then inside Zoom Meetings before external release.

## Review Criteria

Before deployment, the following checks are performed:

- JavaScript syntax check.
- Manual review for hardcoded secrets.
- Manual review for unexpected external network endpoints.
- Manual review of requested Zoom scopes and SDK capabilities.
- Verification that privacy, terms, support, and documentation URLs are reachable.
