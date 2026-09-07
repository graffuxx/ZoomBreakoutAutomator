# Infrastructure And Dependency Management Policy

App: Zoom Breakout Automator  
Last updated: September 7, 2026

## Infrastructure

The app is hosted as static files on Cloudflare Workers. The application does not use a custom backend server, database, message queue, object storage bucket, or server-side account system.

## Deployment

Source files are stored in GitHub and deployed to Cloudflare. The deployed Worker serves the app over HTTPS and applies security headers to responses.

## Dependencies

The app has no production npm dependencies. It uses:

- HTML
- CSS
- JavaScript
- Zoom Apps SDK from Zoom's official CDN
- Cloudflare Workers static asset hosting

## Dependency Review

Because the production app has no bundled third-party package dependencies, dependency risk is low. If dependencies are added later, they should be reviewed for maintenance status, license, necessity, and known vulnerabilities before deployment.

## Configuration Review

Security-relevant deployment configuration includes:

- `wrangler.jsonc`
- `.assetsignore`
- `src/worker.js`
- `_headers`

These files should be reviewed before publishing or sharing the app externally.
