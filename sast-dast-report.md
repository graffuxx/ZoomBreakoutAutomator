# SAST And DAST Evidence Report

App: Zoom Breakout Automator  
Last updated: September 7, 2026

## Summary

This report documents lightweight static and dynamic security checks for the Zoom Breakout Automator beta submission.

The app is a static HTML/CSS/JavaScript Zoom App. It has no backend server, no database, no server-side sessions, and no server-side storage of Zoom user data or OAuth tokens.

## SAST Scope

Files reviewed:

- `app.js`
- `src/worker.js`
- `index.html`
- `privacy.html`
- `terms.html`
- `support.html`
- `documentation.html`
- `wrangler.jsonc`
- `_headers`

Checks performed:

- JavaScript syntax check with Node.js.
- Custom local static security check with `npm run security:check`.
- Manual static review for hardcoded secrets, access tokens, private keys, and client secrets.
- Manual static review for unexpected external network endpoints.
- Manual static review of Content Security Policy and security headers.
- Manual review of local storage usage.

Result:

- No hardcoded Zoom client secrets or OAuth tokens found.
- No external database or backend endpoint found.
- Local storage is used only for user-entered room presets.
- External script loading is limited to the Zoom Apps SDK CDN.
- The custom security check passed on September 7, 2026.

Command output:

```text
Security check passed.
Files scanned: 9
No hardcoded secrets detected.
No unexpected external URLs detected.
TLS 1.2+ guard and security headers are present in src/worker.js.
```

## DAST Scope

Checks performed against the deployed Cloudflare URL:

- HTTPS URL is used for the application.
- The Worker is configured to reject TLS versions below TLS 1.2 when Cloudflare TLS metadata is available.
- Security headers are applied at the Worker layer:
  - `Strict-Transport-Security`
  - `X-Content-Type-Options`
  - `Content-Security-Policy`
  - `Referrer-Policy`

## Limitations

This is a lightweight review for a small static beta app. It is not a third-party penetration test and does not claim SOC 2, ISO 27001, or other formal certification.

## Current Status

The app is considered suitable for controlled testing once the latest GitHub changes are deployed to Cloudflare and the hosted URL is verified.
